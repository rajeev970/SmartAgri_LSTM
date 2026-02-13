# Run full pipeline: data -> optional train -> backend + frontend
# Usage: .\run_all.ps1
# Or: .\run_all.ps1 -SkipTrain   (skip training, use existing models)
# Or: .\run_all.ps1 -DataOnly   (only merge + load DB + export, then exit)

param(
    [switch]$SkipTrain,
    [switch]$DataOnly
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "=== 1. Python deps ===" -ForegroundColor Cyan
pip install -r requirements.txt

Write-Host "`n=== 2. Merge archive (2020-till date) -> data/crop_prices.csv ===" -ForegroundColor Cyan
python scripts/merge_all_crops.py

Write-Host "`n=== 3. Load into SQLite (crop_prices.db) ===" -ForegroundColor Cyan
python scripts/load_data_into_db.py

Write-Host "`n=== 4. Export for frontend (crop_prices.json) ===" -ForegroundColor Cyan
python scripts/export_for_frontend.py

if ($DataOnly) {
    Write-Host "`nData-only run done. Run train + API + frontend manually when ready." -ForegroundColor Green
    exit 0
}

if (-not $SkipTrain) {
    Write-Host "`n=== 5. Train LSTM models (one per commodity) ===" -ForegroundColor Cyan
    python scripts/train_lstm.py
} else {
    Write-Host "`n=== 5. Skip training (use existing models) ===" -ForegroundColor Yellow
}

Write-Host "`n=== 6. Frontend deps (if needed) ===" -ForegroundColor Cyan
if (-not (Test-Path "frontend/node_modules")) {
    Set-Location frontend; npm install; Set-Location ..
}

Write-Host "`n=== Done. Start backend and frontend in three terminals: ===" -ForegroundColor Green
Write-Host "  Terminal 1: python app.py" -ForegroundColor White
Write-Host "  Terminal 2: cd backend/gateway; npm install; npm start" -ForegroundColor White
Write-Host "  Terminal 3: cd frontend; npm install; npm start" -ForegroundColor White
Write-Host "`nThen open http://localhost:3000 (login: demo/demo)" -ForegroundColor White
