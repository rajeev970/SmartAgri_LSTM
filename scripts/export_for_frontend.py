"""
Export crop prices to frontend/public/crop_prices.json so the app can show graphs.
Run after load_data_into_db.py. Reads from crop_prices.db (or data/crop_prices.csv if no DB).
Streams row-by-row so it does NOT load everything into memory (avoids laptop hang).
"""
import csv
import json
import sqlite3
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "data" / "crop_prices.db"
CSV_PATH = PROJECT_ROOT / "data" / "crop_prices.csv"
OUT_PATH = PROJECT_ROOT / "frontend" / "public" / "crop_prices.json"


def main():
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    if DB_PATH.exists():
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.execute(
            "SELECT date, commodity, state, district, modal_price, min_price, max_price FROM crop_prices"
        )
        count = 0
        with open(OUT_PATH, "w", encoding="utf-8") as f:
            f.write("[\n")
            first = True
            for row in cur:
                if not first:
                    f.write(",\n")
                f.write(json.dumps(dict(row), ensure_ascii=False))
                first = False
                count += 1
                if count % 100_000 == 0:
                    print(f"  Exported {count} rows ...")
            f.write("\n]\n")
        conn.close()
        print(f"Exported {count} rows to {OUT_PATH}")
    elif CSV_PATH.exists():
        count = 0
        with open(CSV_PATH, "r", encoding="utf-8") as inf:
            reader = csv.DictReader(inf)
            with open(OUT_PATH, "w", encoding="utf-8") as f:
                f.write("[\n")
                first = True
                for row in reader:
                    if not first:
                        f.write(",\n")
                    f.write(json.dumps(row, ensure_ascii=False))
                    first = False
                    count += 1
                    if count % 100_000 == 0:
                        print(f"  Exported {count} rows ...")
                f.write("\n]\n")
        print(f"Exported {count} rows to {OUT_PATH}")
    else:
        print("No crop_prices.db or data/crop_prices.csv found. Run the Kaggle import first.")
        return


if __name__ == "__main__":
    main()
