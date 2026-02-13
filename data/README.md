# Crop price data

All data files are stored in this folder.

## Structure

```
data/
├── raw/                    # Raw source data
│   └── archive/            # Year-wise CSVs (2001–2026)
│       ├── csv/            # 2020.csv, 2021.csv, …
│       └── parquet/
├── crop_prices.csv         # Merged CSV (2020–till date)
├── crop_prices.db          # SQLite database
└── models/                 # LSTM models (.pt, _scaler.json)
```

## Pipeline

1. Place archive so that **`data/raw/archive/csv/`** contains `2020.csv`, `2021.csv`, … up to `2026.csv`.
2. Run **`python scripts/merge_all_crops.py`** → writes **`data/crop_prices.csv`**.
3. Run **`python scripts/load_data_into_db.py`** → fills **`data/crop_prices.db`**.
4. Run **`python scripts/train_lstm.py`** → trains models in **`data/models/`**.
5. Run **`python scripts/export_for_frontend.py`** → exports to `frontend/public/crop_prices.json`.

**Columns:** `date`, `commodity`, `state`, `district`, `modal_price`, `min_price`, `max_price`
