"""Load data/crop_prices.csv into crop_prices.db. Run after merge_all_crops.py.
Streams in chunks so it does NOT load the whole CSV into memory (avoids laptop hang)."""
import csv
import sqlite3
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
CSV_PATH = DATA_DIR / "crop_prices.csv"
DB_PATH = DATA_DIR / "crop_prices.db"

CHUNK_SIZE = 50_000  # rows per batch – low memory, progress visible

def _to_float(s):
    if not s or not str(s).strip().replace(".", "").replace("-", "").isdigit():
        return None
    try:
        return float(s)
    except ValueError:
        return None

def main():
    if not CSV_PATH.exists():
        print("No crop_prices.csv found. Run download_from_kaggle.py then merge_all_crops.py first.")
        return
    print("load_data_into_db.py started (chunked – low memory).")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS crop_prices (
            date TEXT,
            commodity TEXT,
            state TEXT,
            district TEXT,
            modal_price REAL,
            min_price REAL,
            max_price REAL
        )
    """)
    cur.execute("DELETE FROM crop_prices")
    conn.commit()

    total = 0
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        r = csv.DictReader(f)
        chunk = []
        for row in r:
            chunk.append((
                row.get("date", "").strip(),
                row.get("commodity", "").strip(),
                row.get("state", "").strip(),
                row.get("district", "").strip(),
                _to_float(row.get("modal_price", "")),
                _to_float(row.get("min_price", "")),
                _to_float(row.get("max_price", "")),
            ))
            if len(chunk) >= CHUNK_SIZE:
                cur.executemany(
                    "INSERT INTO crop_prices (date, commodity, state, district, modal_price, min_price, max_price) VALUES (?,?,?,?,?,?,?)",
                    chunk,
                )
                conn.commit()
                total += len(chunk)
                print(f"  Loaded {total} rows ...")
                chunk = []

        if chunk:
            cur.executemany(
                "INSERT INTO crop_prices (date, commodity, state, district, modal_price, min_price, max_price) VALUES (?,?,?,?,?,?,?)",
                chunk,
            )
            conn.commit()
            total += len(chunk)

    cur.execute("SELECT COUNT(*) FROM crop_prices")
    n = cur.fetchone()[0]
    conn.close()
    print(f"Done. Total rows in DB: {n}")

if __name__ == "__main__":
    main()
