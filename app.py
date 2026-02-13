"""
SmartAgri LSTM Prediction Server

Run from project root:
    python app.py

Starts the FastAPI server on http://localhost:8000
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "backend.lstm_prediction.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
