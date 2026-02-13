"""
Generate paper-ready metrics table from evaluation_results.json.
Run after: python scripts/evaluate_models.py

Output: prints Markdown table for SmartAgri_Paper.md
"""
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RESULTS_PATH = PROJECT_ROOT / "data" / "models" / "evaluation_results.json"


def main():
    if not RESULTS_PATH.exists():
        print("Run: python scripts/evaluate_models.py first")
        print("(Requires: data/crop_prices.db and trained models in data/models/)")
        return

    with open(RESULTS_PATH) as f:
        data = json.load(f)

    agg = data["aggregate"]
    per = data["per_commodity"]

    print("\n--- Copy this table into SmartAgri_Paper.md ---\n")
    print("| Commodity | RMSE | MAE | MAPE (%) |")
    print("|-----------|------|-----|----------|")
    for c, m in sorted(per.items()):
        print(f"| {c} | {m['RMSE']:.2f} | {m['MAE']:.2f} | {m['MAPE']:.2f} |")
    print(f"| **Aggregate (mean ± std)** | **{agg['RMSE_mean']:.2f} ± {agg['RMSE_std']:.2f}** | **{agg['MAE_mean']:.2f} ± {agg['MAE_std']:.2f}** | **{agg['MAPE_mean']:.2f}% ± {agg['MAPE_std']:.2f}%** |")
    print("\n--- End table ---\n")


if __name__ == "__main__":
    main()
