"""
LSTM Prediction: load LSTM per commodity and return forecast.
SmartAgri-compatible endpoints for Dashboard, Price Analysis, Predictions.
Run from project root: python app.py  (or: uvicorn backend.lstm_prediction.main:app --reload --port 8000)
"""
import json
import random
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Tuple, Optional

import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DB_PATH = PROJECT_ROOT / "data" / "crop_prices.db"
MODELS_DIR = PROJECT_ROOT / "data" / "models"
LOOKBACK = 60

# Commodity aliases for DB lookup (same as train_lstm)
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


def get_popular_commodities():
    path = PROJECT_ROOT / "scripts" / "popular_commodities.py"
    with open(path) as f:
        ns = {}
        exec(f.read(), ns)
    return ns["POPULAR_COMMODITIES"]


def get_trained_crops() -> List[str]:
    """Return list of crop names that have trained models (.pt + _scaler.json)."""
    if not MODELS_DIR.exists():
        return []
    crops = []
    for f in MODELS_DIR.glob("*.pt"):
        safe = f.stem
        crop_name = safe.replace("_", " ")
        scaler_path = MODELS_DIR / f"{safe}_scaler.json"
        if scaler_path.exists():
            crops.append(crop_name)
    return sorted(crops)


def _commodity_aliases(commodity: str) -> List[str]:
    return [commodity] + COMMODITY_ALIASES.get(commodity, [])


def load_last_prices(commodity: str, days: int = LOOKBACK) -> List[Tuple[str, float]]:
    """Return list of (date_str, modal_price) for last `days` days, sorted by date."""
    if not DB_PATH.exists():
        return []
    aliases = _commodity_aliases(commodity)
    placeholders = ",".join("?" * len(aliases))
    conn = sqlite3.connect(DB_PATH)
    cur = conn.execute(
        f"""
        SELECT date, AVG(modal_price) AS modal_price
        FROM crop_prices
        WHERE commodity IN ({placeholders}) AND modal_price IS NOT NULL AND modal_price > 0
        GROUP BY date
        ORDER BY date DESC
        LIMIT ?
        """,
        (*aliases, days),
    )
    rows = cur.fetchall()
    conn.close()
    return [(r[0], float(r[1])) for r in reversed(rows)]


_SAMPLE_BASE_PRICES = {
    "Rice": 2200, "Wheat": 1950, "Maize": 1800, "Bajra": 2100, "Jowar": 2350,
    "Gram": 5500, "Lentil": 6200, "Moong": 7200, "Urad": 8500, "Arhar": 11500,
    "Onion": 1800, "Tomato": 2800, "Potato": 1200, "Mustard": 5200,
    "Groundnut": 5900, "Soybean": 4200, "Cotton": 6500, "Sugarcane": 350,
    "Banana": 450, "Mango": 3500, "Apple": 12000, "Coconut": 28,
    "Cardamom": 12000, "Black Pepper": 55000, "Ginger": 2200, "Garlic": 4500,
    "Coriander": 6500, "Cabbage": 800, "Cauliflower": 1200, "Brinjal": 2200,
}


def _generate_sample_graph_data(crop: str, days: int) -> dict:
    """Return demo price data when DB is missing or empty."""
    base = _SAMPLE_BASE_PRICES.get(crop, 2000)
    today = datetime.now()
    data = []
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        date_str = d.strftime("%Y-%m-%d")
        var = 0.97 + random.random() * 0.06
        price = round(base * var, 2)
        min_p = round(price * 0.95, 2)
        max_p = round(price * 1.05, 2)
        data.append({
            "date": date_str, "price": price, "minPrice": min_p, "maxPrice": max_p,
            "market": "", "source": "Demo", "category": "",
        })
    prices = [r["price"] for r in data]
    trend = "stable"
    if len(data) >= 4:
        mid = len(data) // 2
        first_avg = sum(prices[:mid]) / mid
        last_avg = sum(prices[-mid:]) / mid
        if last_avg > first_avg * 1.03:
            trend = "increasing"
        elif last_avg < first_avg * 0.97:
            trend = "decreasing"
    return {
        "success": True, "crop": crop, "query": {"state": "", "district": "", "days": days},
        "stats": {"totalRecords": len(data), "validRecords": len(data),
                  "avgPrice": round(sum(prices) / len(prices), 2), "minPrice": round(min(prices), 2),
                  "maxPrice": round(max(prices), 2), "trend": trend},
        "data": data,
    }


def get_graph_data(crop: str, state: Optional[str] = None, district: Optional[str] = None, days: int = 30) -> dict:
    """Query DB for price graph data. Falls back to sample data if DB missing or empty."""
    if not DB_PATH.exists():
        return _generate_sample_graph_data(crop, min(days, 30))
    aliases = _commodity_aliases(crop)
    placeholders = ",".join("?" * len(aliases))
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cutoff = (datetime.now() - timedelta(days=int(days))).strftime("%Y-%m-%d")
    query = f"""
        SELECT date, AVG(modal_price) AS modal_price, AVG(min_price) AS min_price, AVG(max_price) AS max_price
        FROM crop_prices
        WHERE commodity IN ({placeholders}) AND modal_price IS NOT NULL AND modal_price > 0
          AND date >= ?
    """
    params: list = list(aliases) + [cutoff]
    if state:
        query += " AND state = ?"
        params.append(state)
    if district:
        query += " AND district = ?"
        params.append(district)
    query += """
        GROUP BY date
        ORDER BY date ASC
        LIMIT 400
    """
    cur.execute(query, params)
    rows = cur.fetchall()
    conn.close()
    if not rows:
        return _generate_sample_graph_data(crop, min(days, 30))
    valid_prices = [r[1] for r in rows if r[1] and r[1] > 0]
    avg_price = sum(valid_prices) / len(valid_prices) if valid_prices else 0
    min_price = min(valid_prices) if valid_prices else 0
    max_price = max(valid_prices) if valid_prices else 0
    trend = "stable"
    if len(rows) >= 4:
        mid = len(rows) // 2
        first_avg = sum(r[1] for r in rows[:mid]) / mid
        last_avg = sum(r[1] for r in rows[-mid:]) / mid
        if last_avg > first_avg * 1.05:
            trend = "increasing"
        elif last_avg < first_avg * 0.95:
            trend = "decreasing"
    graph_data = [
        {
            "date": (r[0] or "")[:10],
            "price": round(float(r[1] or 0), 2),
            "minPrice": round(float(r[2] or 0), 2),
            "maxPrice": round(float(r[3] or 0), 2),
            "market": "",
            "source": "Kaggle",
            "category": "",
        }
        for r in rows
    ]
    return {
        "success": True,
        "crop": crop,
        "query": {"state": state or "", "district": district or "", "days": days},
        "stats": {
            "totalRecords": len(rows),
            "validRecords": len(valid_prices),
            "avgPrice": round(avg_price, 2),
            "minPrice": round(min_price, 2),
            "maxPrice": round(max_price, 2),
            "trend": trend,
        },
        "data": graph_data,
    }


def predict(commodity: str, days_ahead: int) -> dict:
    """Load model and scaler, get last 60 days, predict next days_ahead. Return dict with predictions list."""
    safe = commodity.replace(" ", "_")
    model_path = MODELS_DIR / f"{safe}.pt"
    scaler_path = MODELS_DIR / f"{safe}_scaler.json"
    if not model_path.exists() or not scaler_path.exists():
        return {"error": f"No trained model for {commodity}"}
    last = load_last_prices(commodity, LOOKBACK)
    if len(last) < LOOKBACK:
        return {"error": f"Need at least {LOOKBACK} days of data for {commodity}"}

    import torch
    import sys
    sys.path.insert(0, str(PROJECT_ROOT / "scripts"))
    from lstm_model import LSTMModel

    with open(scaler_path) as f:
        scaler = json.load(f)
    min_val, max_val = scaler["min"], scaler["max"]
    values = np.array([p[1] for p in last], dtype=np.float32)
    scaled = (values - min_val) / (max_val - min_val) if max_val > min_val else values * 0

    device = torch.device("cpu")
    model = LSTMModel()
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()

    preds = []
    seq = scaled.copy()
    last_date_str = last[-1][0].strip()[:10]
    last_date = None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            last_date = datetime.strptime(last_date_str, fmt)
            break
        except ValueError:
            continue
    if last_date is None:
        last_date = datetime.now()
    with torch.no_grad():
        for _ in range(days_ahead):
            x = torch.from_numpy(seq[-LOOKBACK:].reshape(1, LOOKBACK, 1)).float().to(device)
            out = model(x).item()
            pred_val = out * (max_val - min_val) + min_val if max_val > min_val else out
            last_date += timedelta(days=1)
            preds.append({"date": last_date.strftime("%Y-%m-%d"), "modal_price": round(pred_val, 2)})
            seq = np.append(seq, out)

    return {"commodity": commodity, "predictions": preds}


# FastAPI app (SmartAgri-compatible)
def create_app():
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel

    app = FastAPI(title="LSTM Crop Price Prediction")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    @app.get("/predict")
    def get_predict(commodity: str, days: int = 7):
        if days < 1 or days > 30:
            days = 7
        return predict(commodity, days)

    @app.get("/commodities")
    def list_commodities():
        return {"commodities": get_popular_commodities()}

    # --- SmartAgri-compatible routes (under /api) ---

    @app.get("/api/crops/popular")
    def api_crops_popular():
        return {"success": True, "data": get_popular_commodities()}

    @app.get("/api/crops/trained")
    def api_crops_trained():
        """Return only crops that have trained LSTM models."""
        return {"success": True, "data": get_trained_crops()}

    @app.get("/api/graphs/test/{crop_name}")
    def api_graphs_test(crop_name: str, state: Optional[str] = None, district: Optional[str] = None, days: int = 30):
        result = get_graph_data(crop_name, state, district, days)
        if not result.get("success"):
            raise HTTPException(status_code=404, detail=result.get("message", "No data"))
        return result

    @app.get("/api/graphs/crop/{crop_name}")
    def api_graphs_crop(crop_name: str, state: Optional[str] = None, district: Optional[str] = None, days: int = 30):
        """Same as /api/graphs/test/{crop_name} - for SmartAgri frontend CropGraph."""
        result = get_graph_data(crop_name, state, district, days)
        if not result.get("success"):
            raise HTTPException(status_code=404, detail=result.get("message", "No data"))
        return result

    class UserPredictionRequest(BaseModel):
        category: str = ""
        commodity: str
        state: str = "All India"
        district: str = "All districts"
        predictionDate: str

    @app.post("/api/user-predictions/test/predict")
    def api_user_predictions_test_predict(req: UserPredictionRequest):
        commodity = req.commodity.strip()
        if not commodity:
            raise HTTPException(status_code=400, detail="commodity is required")
        try:
            target = datetime.strptime(req.predictionDate[:10], "%Y-%m-%d")
        except ValueError:
            target = datetime.now() + timedelta(days=30)
        days_ahead = max(1, min(365, (target - datetime.now()).days))  # allow up to 1 year
        result = predict(commodity, days_ahead)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        preds = result.get("predictions", [])
        if not preds:
            raise HTTPException(status_code=400, detail="No predictions")
        first_pred = preds[0]
        pred_price = first_pred.get("modal_price", 0)
        preds_all = [p["modal_price"] for p in preds]
        price_min = min(preds_all)
        price_max = max(preds_all)
        return {
            "success": True,
            "message": "Prediction generated",
            "prediction": {
                "prediction": {
                    "predictedPrice": pred_price,
                    "confidenceScore": 0.85,
                    "cropName": commodity,
                    "category": req.category,
                    "commodity": commodity,
                    "state": req.state,
                    "district": req.district,
                    "predictionDate": req.predictionDate,
                    "priceRange": {"min": price_min, "max": price_max},
                    "modelType": "LSTM",
                }
            },
        }

    return app


app = create_app()
