# SmartAgri

An LSTM-based crop price prediction system for Indian agricultural markets. Predicts commodity prices from historical wholesale data and provides a web interface for price analysis and forecasting.

## Features

- **Price Analysis** – View price trends by crop, state, and district
- **Price Predictions** – LSTM-based forecasts up to 12 months ahead
- **30 major crops** – Rice, Wheat, Onion, Tomato, Potato, and more

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Ant Design |
| Backend | Node.js (Express) – gateway, auth |
| LSTM API | Python, FastAPI |
| Database | SQLite |
| Models | PyTorch LSTM |

## Prerequisites

- **Python 3.10+** – for backend, scripts, LSTM training
- **Node.js 18+** (includes npm) – for frontend and gateway

```bash
python --version
node --version
```

If missing: [Python](https://www.python.org/downloads/) | [Node.js](https://nodejs.org/) (LTS)

---

## Quick Start (Run the app)

If you already have the data and models set up, run these in **3 separate terminals**:

| Terminal | Command | Port |
|----------|---------|------|
| 1 – LSTM API | `python app.py` | 8000 |
| 2 – Backend | `cd backend\gateway` then `npm install` then `npm start` | 3001 |
| 3 – Frontend | `cd frontend` then `npm install` then `npm start` | 3000 |

Open **http://localhost:3000** and login with **demo** / **demo**.

---

## Full Setup (from scratch)

### 1. Install Python dependencies

```bash
cd project_without_api
pip install -r requirements.txt
```

### 2. Prepare data

**Option A – You have the dataset**

Place year-wise CSVs in `data/raw/archive/csv/` (e.g. `2020.csv`, `2021.csv`, …).

**Option B – Download from Kaggle**

1. Get API credentials from [Kaggle → Account → Create New Token](https://www.kaggle.com/settings)
2. Place `kaggle.json` in `C:\Users\<YourName>\.kaggle\kaggle.json` (Windows)
3. Run: `python scripts/download_from_kaggle.py`

### 3. Run data pipeline

```bash
python scripts/merge_all_crops.py      # → data/crop_prices.csv
python scripts/load_data_into_db.py    # → data/crop_prices.db
python scripts/export_for_frontend.py  # → frontend/public/crop_prices.json
```

### 4. (Optional) Train LSTM models

Train models for prediction (uses GPU if available):

```bash
python scripts/train_lstm.py
```

### 5. (Optional) One-command setup

```powershell
# Full pipeline (merge + load + export + train)
.\run_all.ps1

# Data only (no training)
.\run_all.ps1 -DataOnly

# Skip training (use existing models)
.\run_all.ps1 -SkipTrain
```

Windows batch: `run_all.bat` or `run_all.bat dataonly`

### 6. Start the app

Use the three terminals as in **Quick Start** above.

---

## Project Structure

```
project_without_api/
├── app.py                 # LSTM API entry point (python app.py)
├── backend/
│   ├── gateway/           # Node.js – auth, proxy to LSTM API
│   └── lstm_prediction/   # FastAPI – predictions, graphs, DB
├── frontend/              # React app
├── data/
│   ├── raw/archive/csv/   # Source CSVs (2020.csv, etc.)
│   ├── crop_prices.csv   # Merged data
│   ├── crop_prices.db    # SQLite database
│   └── models/           # LSTM models (.pt, _scaler.json)
├── scripts/               # Data pipeline
│   ├── merge_all_crops.py
│   ├── load_data_into_db.py
│   ├── export_for_frontend.py
│   └── train_lstm.py
├── run_all.bat            # Windows batch script
├── run_all.ps1            # PowerShell script
└── requirements.txt
```

---

## How It Works

1. **Data** – Raw CSV files (daily market prices) are merged into `crop_prices.csv` and loaded into SQLite.
2. **Models** – LSTM models are trained per commodity using 60-day history windows.
3. **API** – FastAPI serves predictions and graph data; Node gateway handles auth and routing.
4. **Frontend** – React app displays price analysis and prediction forms.

---

## API Endpoints (LSTM API, port 8000)

- `GET /api/crops/popular` – list of supported commodities
- `GET /api/graphs/crop/{crop}` – price graph data (state, district, days)
- `POST /api/user-predictions/test/predict` – LSTM price prediction

---

## License

[Add your license here]
