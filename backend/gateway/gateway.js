/**
 * Backend - handles login + forwards /api/* requests to LSTM Prediction (port 8000).
 * Usage: npm start (from backend/gateway)
 * Runs on: http://localhost:3001
 */
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const PORT = 3001;
const LSTM_PREDICTION_URL = (process.env.LSTM_PREDICTION_URL || 'http://localhost:8000').replace(/\/$/, '');

const app = express();

app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], credentials: true }));
app.use(express.json());

// Demo auth - no MongoDB needed
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === 'demo' && password === 'demo') {
    return res.json({
      success: true,
      token: 'demo-token',
      user: {
        id: 'demo-user-id',
        username: 'demo',
        email: 'demo@smartagri.com',
        userType: 'farmer',
        profile: { firstName: 'Demo', lastName: 'User', address: { state: 'Karnataka', district: 'Bangalore' } }
      }
    });
  }
  res.status(401).json({ success: false, message: 'Invalid credentials. Use demo/demo for demo mode.' });
});

app.get('/api/auth/profile', (req, res) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer')) {
    return res.json({
      success: true,
      user: {
        id: 'demo-user-id',
        username: 'demo',
        email: 'demo@smartagri.com',
        userType: 'farmer',
        profile: { firstName: 'Demo', lastName: 'User', address: { state: 'Karnataka', district: 'Bangalore' } }
      }
    });
  }
  res.status(401).json({ success: false, message: 'Unauthorized' });
});

app.post('/api/auth/register', (req, res) => {
  res.status(501).json({ success: false, message: 'Registration disabled. Use demo/demo to login.' });
});

// Forward to LSTM Prediction service
async function forwardToLstm(req, res) {
  const url = `${LSTM_PREDICTION_URL}${req.originalUrl}`;
  try {
    const config = {
      method: req.method,
      url,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    };
    if (req.method === 'POST' && req.body && Object.keys(req.body).length) {
      config.data = req.body;
    }
    const resp = await axios(config);
    res.status(resp.status).json(resp.data);
  } catch (err) {
    const status = err.response?.status || 502;
    const msg = err.response?.data?.detail || err.response?.data?.message || err.message;
    res.status(status).json({ success: false, message: msg || `Error connecting to LSTM Prediction (${LSTM_PREDICTION_URL})` });
  }
}

app.use('/api/crops', (req, res) => forwardToLstm(req, res));
app.use('/api/graphs', (req, res) => forwardToLstm(req, res));
app.use('/api/user-predictions', (req, res) => forwardToLstm(req, res));

// Health
app.get('/health', (req, res) => res.json({ status: 'ok', backend: true, lstmPrediction: LSTM_PREDICTION_URL }));
app.get('/', (req, res) => res.json({ message: 'SmartAgri Backend → LSTM Prediction', port: PORT, upstream: LSTM_PREDICTION_URL }));

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Forwarding /api/crops, /api/graphs, /api/user-predictions → LSTM Prediction (${LSTM_PREDICTION_URL})`);
  console.log('Start LSTM Prediction first: uvicorn backend.lstm_prediction.main:app --reload --port 8000');
});
