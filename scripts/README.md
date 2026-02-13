# Crop data – Kaggle only

This project uses the **Kaggle** dataset **Daily Market Prices of Commodity India (2001-2026)**.

## Setup (one-time)

1. Create a Kaggle account and get API credentials: [Kaggle → Account → Create New Token](https://www.kaggle.com/settings). This downloads `kaggle.json`.
2. Place `kaggle.json` in:
   - **Windows:** `C:\Users\<YourName>\.kaggle\kaggle.json`
   - **Linux/Mac:** `~/.kaggle/kaggle.json`
3. Install: `pip install kaggle`

## Workflow

```bash
# 1. Download dataset from Kaggle (saves to data/kaggle_mandi/)
python scripts/download_from_kaggle.py

# 2. Merge into one file (data/crop_prices.csv). Uses archive (1)/csv/ from 2020–till date if present
python scripts/merge_all_crops.py

# 3. Load into SQLite (crop_prices.db)
python scripts/load_data_into_db.py

# 4. Export for frontend (Price Analysis graphs)
python scripts/export_for_frontend.py
```

After this, use **`data/crop_prices.csv`** or **`crop_prices.db`** in your app. The frontend **Price Analysis** page reads **`frontend/public/crop_prices.json`** (created by step 4) to show price graphs.

**Training LSTM (one model per commodity):** Use the list in **`scripts/popular_commodities.py`**. From project root:
```bash
pip install torch pandas numpy
python scripts/train_lstm.py
```
This uses 2020–2025 data from `crop_prices.db`, trains one LSTM per popular commodity, and saves to **`models/<Commodity>.pt`**, **`models/<Commodity>_scaler.json`**, and **`models/<Commodity>_metrics.json`** (RMSE, MAE, MAPE).

**Evaluate models (RMSE, MAE, MAPE):**
```bash
python scripts/evaluate_models.py
```
Outputs `data/models/evaluation_results.json` with per-commodity and aggregate metrics.

**LSTM Prediction:** From project root:
```bash
pip install fastapi uvicorn
uvicorn backend.lstm_prediction.main:app --reload --port 8000
```
Then open the frontend (e.g. `cd frontend && npm run dev`) and use **Price Prediction** to get forecasts.
