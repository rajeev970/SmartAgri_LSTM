"""
Merge crop CSV files into one crop_prices.csv.
Streams row-by-row so it does NOT load everything into memory (avoids laptop hang).
Uses archive/csv/ (2020–till date) if present, else data/**/*.csv.
Run from project root: python scripts/merge_all_crops.py
"""
import csv
import sys
from pathlib import Path

def log(msg):
    print(msg, flush=True)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
ARCHIVE_CSV_DIR = PROJECT_ROOT / "data" / "raw" / "archive" / "csv"
if not ARCHIVE_CSV_DIR.exists():
    ARCHIVE_CSV_DIR = PROJECT_ROOT / "archive (1)" / "csv"
if not ARCHIVE_CSV_DIR.exists():
    ARCHIVE_CSV_DIR = PROJECT_ROOT / "archive" / "csv"
MIN_YEAR = 2020
OUTPUT_FILE = DATA_DIR / "crop_prices.csv"
OUT_COLUMNS = ["date", "commodity", "state", "district", "modal_price", "min_price", "max_price"]

ARCHIVE_MAP = {
    "Arrival_Date": "date",
    "Commodity": "commodity",
    "State": "state",
    "District": "district",
    "Modal_Price": "modal_price",
    "Min_Price": "min_price",
    "Max_Price": "max_price",
}


def main():
    log("merge_all_crops.py started (streaming mode – low memory).")
    log(f"Project root: {PROJECT_ROOT}")
    log(f"Archive CSV dir: {ARCHIVE_CSV_DIR} (exists: {ARCHIVE_CSV_DIR.exists()})")

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    total_rows = 0

    if ARCHIVE_CSV_DIR.exists():
        csv_files = sorted(ARCHIVE_CSV_DIR.glob("*.csv"))
        files = []
        for f in csv_files:
            try:
                y = int(f.stem)
                if y >= MIN_YEAR:
                    files.append(f)
            except ValueError:
                pass
        if not files:
            log(f"No year CSVs >= {MIN_YEAR} in {ARCHIVE_CSV_DIR}")
            return
        log(f"Streaming {len(files)} files: {[p.name for p in files]} ...")

        with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as out_f:
            w = csv.DictWriter(out_f, fieldnames=OUT_COLUMNS, extrasaction="ignore")
            w.writeheader()
            for path in sorted(files, key=lambda p: p.stem):
                log(f"  Reading {path.name} ...")
                file_rows = 0
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    r = csv.DictReader(f)
                    for row in r:
                        out = {}
                        for arch_col, our_col in ARCHIVE_MAP.items():
                            out[our_col] = str(row.get(arch_col, "")).strip()
                        w.writerow(out)
                        file_rows += 1
                total_rows += file_rows
                log(f"  Done. Rows from this file: {file_rows}, total so far: {total_rows}")
    else:
        files = sorted(DATA_DIR.glob("**/*.csv"))
        files = [f for f in files if f.resolve() != OUTPUT_FILE.resolve()]
        if not files:
            log("No CSV files in data/ and archive/csv/ not found.")
            return
        with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as out_f:
            w = csv.DictWriter(out_f, fieldnames=OUT_COLUMNS, extrasaction="ignore")
            w.writeheader()
            for path in files:
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    r = csv.DictReader(f)
                    for row in r:
                        w.writerow({c: row.get(c, "") for c in OUT_COLUMNS})
                        total_rows += 1

    log(f"Total rows: {total_rows}")
    log(f"Written: {OUTPUT_FILE}")
    log("merge_all_crops.py finished.")

if __name__ == "__main__":
    main()
    sys.exit(0)
