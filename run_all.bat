@echo off
REM Run full pipeline. Usage: run_all.bat
REM Or: run_all.bat dataonly   (only merge + load + export, no train)

cd /d "%~dp0"

echo === 1. Python deps ===
pip install -r requirements.txt
if errorlevel 1 exit /b 1

echo.
echo === 2. Merge archive (2020-till date) ===
python scripts/merge_all_crops.py
if errorlevel 1 exit /b 1

echo.
echo === 3. Load into SQLite ===
python scripts/load_data_into_db.py
if errorlevel 1 exit /b 1

echo.
echo === 4. Export for frontend ===
python scripts/export_for_frontend.py
if errorlevel 1 exit /b 1

if /i "%1"=="dataonly" (
  echo.
  echo Data-only run done. Run train + API + frontend manually.
  exit /b 0
)

echo.
echo === 5. Train LSTM models ===
python scripts/train_lstm.py
if errorlevel 1 exit /b 1

echo.
echo === 6. Frontend deps (if needed) ===
if not exist "frontend\node_modules" (
  cd frontend && npm install && cd ..
)

echo.
echo === Done. Start backend and frontend in three separate terminals: ===
echo   Terminal 1: python app.py
echo   Terminal 2: cd backend\gateway ^&^& npm install ^&^& npm start
echo   Terminal 3: cd frontend ^&^& npm install ^&^& npm start
echo.
echo Then open http://localhost:3000 (login: demo/demo)
pause
