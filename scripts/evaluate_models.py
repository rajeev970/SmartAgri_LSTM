"""
Evaluate trained LSTM models: compute RMSE, MAE, MAPE on validation set.
Run from project root: python scripts/evaluate_models.py

Outputs: metrics per commodity and aggregate summary to data/models/evaluation_results.json
"""
import json
import sqlite3
import sys
from pathlib import Path

import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "data" / "crop_prices.db"
CSV_PATH = PROJECT_ROOT / "data" / "crop_prices.csv"
MODELS_DIR = PROJECT_ROOT / "data" / "models"
START_YEAR = 2020
END_YEAR = 2026
LOOKBACK = 60

sys.path.insert(0, str(PROJECT_ROOT / "scripts"))
from popular_commodities import POPULAR_COMMODITIES
from train_lstm import load_series, build_sequences


def evaluate_one(commodity: str) -> dict | None:
    """Evaluate one commodity model. Returns dict with RMSE, MAE, MAPE or None if skip."""
    try:
        import torch
    except ImportError:
        print("Install PyTorch: pip install torch", file=sys.stderr)
        sys.exit(1)

    safe = commodity.replace(" ", "_")
    model_path = MODELS_DIR / f"{safe}.pt"
    scaler_path = MODELS_DIR / f"{safe}_scaler.json"

    if not model_path.exists() or not scaler_path.exists():
        return None

    series = load_series(commodity)
    if len(series) < LOOKBACK + 20:
        return None

    values = series.values
    with open(scaler_path) as f:
        scaler = json.load(f)
    min_val = scaler["min"]
    max_val = scaler["max"]

    scaled = (values - min_val) / (max_val - min_val) if max_val > min_val else values * 0
    X, y = build_sequences(scaled, LOOKBACK)
    n = len(X)
    train_n = int(0.85 * n)
    X_val, y_val = X[train_n:], y[train_n:]

    if len(X_val) == 0:
        return None

    from lstm_model import LSTMModel
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = LSTMModel().to(device)
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()

    Xv = torch.from_numpy(X_val).to(device)
    with torch.no_grad():
        val_pred_scaled = model(Xv).cpu().numpy()

    val_pred_orig = val_pred_scaled * (max_val - min_val) + min_val
    val_orig = y_val * (max_val - min_val) + min_val

    rmse = np.sqrt(np.mean((val_orig - val_pred_orig) ** 2))
    mae = np.mean(np.abs(val_orig - val_pred_orig))
    mape = np.mean(np.abs((val_orig - val_pred_orig) / (np.abs(val_orig) + 1e-8))) * 100

    return {
        "RMSE": round(float(rmse), 4),
        "MAE": round(float(mae), 4),
        "MAPE": round(float(mape), 4),
        "n_val": len(val_orig),
    }


def main():
    if not DB_PATH.exists() and not CSV_PATH.exists():
        print("No crop_prices.db or data/crop_prices.csv. Run data pipeline first.")
        sys.exit(1)
    if not MODELS_DIR.exists():
        print("No models directory. Run train_lstm.py first.")
        sys.exit(1)

    results = {}
    for commodity in POPULAR_COMMODITIES:
        m = evaluate_one(commodity)
        if m:
            results[commodity] = m
            print(f"  {commodity}: RMSE={m['RMSE']:.2f}  MAE={m['MAE']:.2f}  MAPE={m['MAPE']:.2f}%")
        else:
            print(f"  {commodity}: skip (no model or insufficient data)")

    if not results:
        print("No models evaluated.")
        sys.exit(1)

    # Aggregate
    rmse_list = [r["RMSE"] for r in results.values()]
    mae_list = [r["MAE"] for r in results.values()]
    mape_list = [r["MAPE"] for r in results.values()]

    summary = {
        "aggregate": {
            "RMSE_mean": round(float(np.mean(rmse_list)), 4),
            "RMSE_std": round(float(np.std(rmse_list)), 4),
            "MAE_mean": round(float(np.mean(mae_list)), 4),
            "MAE_std": round(float(np.std(mae_list)), 4),
            "MAPE_mean": round(float(np.mean(mape_list)), 4),
            "MAPE_std": round(float(np.std(mape_list)), 4),
            "n_commodities": len(results),
        },
        "per_commodity": results,
    }

    out_path = MODELS_DIR / "evaluation_results.json"
    with open(out_path, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"\nResults saved to {out_path}")
    print(f"\n--- Summary for Paper ---")
    print(f"RMSE (mean ± std): {summary['aggregate']['RMSE_mean']:.2f} ± {summary['aggregate']['RMSE_std']:.2f}")
    print(f"MAE  (mean ± std): {summary['aggregate']['MAE_mean']:.2f} ± {summary['aggregate']['MAE_std']:.2f}")
    print(f"MAPE (mean ± std): {summary['aggregate']['MAPE_mean']:.2f}% ± {summary['aggregate']['MAPE_std']:.2f}%")


if __name__ == "__main__":
    main()
