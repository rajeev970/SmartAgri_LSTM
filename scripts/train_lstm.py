"""
Train one LSTM model per popular commodity.
Uses 2020–till date from crop_prices.db (or data/crop_prices.csv).
Run from project root: python scripts/train_lstm.py
"""
import json
import sqlite3
import sys
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "data" / "crop_prices.db"
CSV_PATH = PROJECT_ROOT / "data" / "crop_prices.csv"
MODELS_DIR = PROJECT_ROOT / "data" / "models"
START_YEAR = 2020
END_YEAR = 2026  # till date (use data from archive 2020–2026)
LOOKBACK = 60
EPOCHS = int(__import__("os").environ.get("TRAIN_EPOCHS", "50"))  # e.g. TRAIN_EPOCHS=20 for quicker run
BATCH_SIZE = 32

sys.path.insert(0, str(PROJECT_ROOT / "scripts"))
from popular_commodities import POPULAR_COMMODITIES


# Map our commodity name to archive/dataset names (must match DB/CSV "commodity" column)
COMMODITY_ALIASES = {
    "Rice": ["Rice", "Paddy (Dhan)(Common)", "Paddy (Dhan)"],
    "Gram": ["Gram", "Bengal Gram (Gram)(Whole)"],
    "Arhar": ["Arhar", "Arhar (Tur)(Whole)", "Tur (Arhar)"],
    "Bajra": ["Bajra", "Bajra (Pearl Millet/Cumbu)"],
    "Jowar": ["Jowar", "Jowar (Sorghum)"],
    "Lentil": ["Lentil", "Lentil (Masur)(Whole)"],
    "Moong": ["Moong", "Green Gram (Moong)(Whole)"],
    "Urad": ["Urad", "Black Gram (Urd Beans)(Whole)"],
    "Soybean": ["Soybean", "Soyabean"],
    "Cardamom": ["Cardamom", "Cardamoms"],
    "Black Pepper": ["Black Pepper", "Pepper garbled", "Pepper ungarbled"],
    "Ginger": ["Ginger", "Ginger (Green)"],
    "Coriander": ["Coriander", "Coriander (Leaves)", "Corriander seed"],
}


def _aliases(commodity: str):
    return list(dict.fromkeys([commodity] + COMMODITY_ALIASES.get(commodity, [])))


def load_series(commodity: str) -> pd.Series:
    """Load daily modal_price series for commodity (mean across markets), 2020–till date."""
    aliases = _aliases(commodity)
    if DB_PATH.exists():
        conn = sqlite3.connect(DB_PATH)
        placeholders = ",".join("?" * len(aliases))
        df = pd.read_sql_query(
            f"""
            SELECT date, AVG(modal_price) AS modal_price
            FROM crop_prices
            WHERE commodity IN ({placeholders}) AND modal_price IS NOT NULL AND modal_price > 0
              AND CAST(SUBSTR(date, 1, 4) AS INT) BETWEEN ? AND ?
            GROUP BY date
            ORDER BY date
            """,
            conn,
            params=(*aliases, START_YEAR, END_YEAR),
        )
        conn.close()
    elif CSV_PATH.exists():
        df = pd.read_csv(CSV_PATH)
        df = df[
            (df["commodity"].isin(aliases))
            & (df["modal_price"].notna())
            & (df["modal_price"] > 0)
        ]
        if "date" not in df.columns:
            return pd.Series(dtype=float)
        df = df.groupby("date", as_index=False)["modal_price"].mean()
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        df = df.dropna(subset=["date"])
        df = df[(df["date"].dt.year >= START_YEAR) & (df["date"].dt.year <= END_YEAR)]
        df = df.sort_values("date")
    else:
        return pd.Series(dtype=float)
    if df.empty or "date" not in df.columns:
        return pd.Series(dtype=float)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"]).sort_values("date")
    return df.set_index("date")["modal_price"].astype(float)


def build_sequences(series: np.ndarray, lookback: int):
    """X: (n, lookback, 1), y: (n,)"""
    X, y = [], []
    for i in range(lookback, len(series)):
        X.append(series[i - lookback : i].reshape(-1, 1))
        y.append(series[i])
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)


def train_one(commodity: str):
    try:
        import torch
        import torch.nn as nn
    except ImportError:
        print("Install PyTorch: pip install torch", file=sys.stderr)
        sys.exit(1)

    series = load_series(commodity)
    if len(series) < LOOKBACK + 100:
        print(f"  {commodity}: skip (only {len(series)} days)")
        return

    values = series.values
    min_val, max_val = values.min(), values.max()
    if max_val <= min_val:
        print(f"  {commodity}: skip (constant)")
        return
    scaled = (values - min_val) / (max_val - min_val)
    X, y = build_sequences(scaled, LOOKBACK)
    n = len(X)
    train_n = int(0.85 * n)
    X_train, y_train = X[:train_n], y[:train_n]
    X_val, y_val = X[train_n:], y[train_n:]

    from lstm_model import LSTMModel

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = LSTMModel().to(device)
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)

    Xt = torch.from_numpy(X_train).to(device)
    yt = torch.from_numpy(y_train).to(device)
    Xv = torch.from_numpy(X_val).to(device)
    yv = torch.from_numpy(y_val).to(device)

    for epoch in range(EPOCHS):
        model.train()
        perm = np.random.permutation(len(X_train))
        for i in range(0, len(perm), BATCH_SIZE):
            idx = perm[i : i + BATCH_SIZE]
            optimizer.zero_grad()
            pred = model(Xt[idx])
            loss = criterion(pred, yt[idx])
            loss.backward()
            optimizer.step()
        if (epoch + 1) % 10 == 0:
            model.eval()
            with torch.no_grad():
                val_pred = model(Xv)
                val_loss = criterion(val_pred, yv).item()
            print(f"  {commodity} epoch {epoch+1} val_loss={val_loss:.6f}")

    # Compute RMSE, MAE, MAPE on validation set (in original scale)
    model.eval()
    with torch.no_grad():
        val_pred_scaled = model(Xv).cpu().numpy()
    val_pred_orig = val_pred_scaled * (max_val - min_val) + min_val
    val_orig = y_val * (max_val - min_val) + min_val  # y_val is numpy (scaled)

    rmse = np.sqrt(np.mean((val_orig - val_pred_orig) ** 2))
    mae = np.mean(np.abs(val_orig - val_pred_orig))
    mape = np.mean(np.abs((val_orig - val_pred_orig) / (np.abs(val_orig) + 1e-8))) * 100

    safe = commodity.replace(" ", "_")
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), MODELS_DIR / f"{safe}.pt")
    scaler = {"min": float(min_val), "max": float(max_val)}
    with open(MODELS_DIR / f"{safe}_scaler.json", "w") as f:
        json.dump(scaler, f)
    metrics = {"RMSE": float(rmse), "MAE": float(mae), "MAPE": float(mape)}
    with open(MODELS_DIR / f"{safe}_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"  {commodity}: saved {MODELS_DIR / safe}.pt  |  RMSE={rmse:.2f}  MAE={mae:.2f}  MAPE={mape:.2f}%")


def main():
    if not DB_PATH.exists() and not CSV_PATH.exists():
        print("No crop_prices.db or data/crop_prices.csv. Run data pipeline first.")
        sys.exit(1)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    # Train only a subset? e.g. TRAIN_ONLY="Bajra;Jowar;Lentil;Moong;Urad;Arhar;Soybean;Cardamom;Black Pepper;Ginger;Coriander"
    only = __import__("os").environ.get("TRAIN_ONLY", "").strip()
    if only:
        commodities = [c.strip() for c in only.split(";") if c.strip()]
    else:
        commodities = POPULAR_COMMODITIES
    print(f"Training LSTM per commodity (lookback={LOOKBACK}, {START_YEAR}-{END_YEAR}) [{len(commodities)} commodities]")
    for c in commodities:
        train_one(c)
    print("Done.")


if __name__ == "__main__":
    main()
