"""
Download all-crops mandi price data from Kaggle (no browser, no data.gov.in API).

Dataset: Daily Wholesale Commodity Prices – India Mandis
https://www.kaggle.com/datasets/ishankat/daily-wholesale-commodity-prices-india-mandis

One-time setup:
  1. Create Kaggle account at kaggle.com
  2. My Account → Create New Token (downloads kaggle.json)
  3. Place kaggle.json in:
       Windows: C:\\Users\\<You>\\.kaggle\\kaggle.json
       Linux/Mac: ~/.kaggle/kaggle.json
  4. pip install kaggle

Run: python scripts/download_from_kaggle.py
     python scripts/download_from_kaggle.py --output-dir data
"""

import argparse
import subprocess
import sys
import zipfile
from pathlib import Path


# Dataset: Daily Market Prices of Commodity India (2001-2026) or similar; set slug from Kaggle URL.
KAGGLE_DATASET = "ishankat/daily-wholesale-commodity-prices-india-mandis"


def main():
    parser = argparse.ArgumentParser(description="Download India mandi crop prices from Kaggle.")
    parser.add_argument("--output-dir", type=str, default=None, help="Output directory (default: project data/)")
    args = parser.parse_args()

    out_dir = Path(args.output_dir) if args.output_dir else Path(__file__).resolve().parent.parent / "data"
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        import kaggle
    except ImportError:
        print("Install Kaggle API: pip install kaggle", file=sys.stderr)
        print("Then add kaggle.json to ~/.kaggle/ (see script docstring).", file=sys.stderr)
        sys.exit(1)

    dest = out_dir / "kaggle_mandi"
    dest.mkdir(parents=True, exist_ok=True)
    zip_path = dest / "dataset.zip"

    print(f"Downloading dataset: {KAGGLE_DATASET}")
    print(f"Destination: {dest}")
    try:
        kaggle.api.dataset_download_files(KAGGLE_DATASET, path=str(dest), unzip=True)
    except Exception as e:
        print(f"Kaggle download failed: {e}", file=sys.stderr)
        print("Ensure kaggle.json is in ~/.kaggle/ and you accepted dataset terms on Kaggle.", file=sys.stderr)
        sys.exit(1)

    # Find CSV(s) in dest
    csvs = list(dest.glob("**/*.csv"))
    if csvs:
        print(f"Downloaded {len(csvs)} CSV file(s):")
        for c in csvs:
            print(f"  {c}")
    else:
        print("No CSV files found in download.", file=sys.stderr)
    print("Done.")


if __name__ == "__main__":
    main()
