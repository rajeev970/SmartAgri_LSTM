import axios from 'axios';

// When REACT_APP_API_URL not set, /api goes to Backend (3001) which forwards to LSTM Prediction (8000)
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Only attach token if it looks like a valid JWT (avoids "jwt malformed" on backend)
function isValidJwtShape(token: string | null): boolean {
  if (!token || typeof token !== 'string') return false;
  const t = token.trim();
  return t.length > 20 && t.split('.').length === 3;
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && isValidJwtShape(token)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (credentials: { username: string; password: string }) => 
    api.post('/auth/login', credentials),
  register: (userData: any) => 
    api.post('/auth/register', userData),
  getProfile: () => 
    api.get('/auth/profile'),
  updateProfile: (profileData: any) => 
    api.put('/auth/profile', profileData),
  changePassword: (passwordData: { currentPassword: string; newPassword: string }) => 
    api.post('/auth/change-password', passwordData),
};

export const cropsAPI = {
  getCrops: (params?: any) => 
    api.get('/crops', { params }),
  getCrop: (id: string) => 
    api.get(`/crops/${id}`),
  getCategories: () => 
    api.get('/crops/categories'),
  getStates: () => 
    api.get('/crops/states'),
};

export const pricesAPI = {
  getCurrentPrices: (params?: any) => 
    api.get('/prices/current', { params }),
  getHistoricalPrices: (params?: any) => 
    api.get('/prices/historical', { params }),
  getPriceTrends: (params?: any) => 
    api.get('/prices/trends', { params }),
};

export const predictionsAPI = {
  getPredictions: (params?: any) => 
    api.get('/predictions', { params }),
  generatePrediction: (data: any) => 
    api.post('/predictions/generate', data),
  batchGenerate: (data: any) => 
    api.post('/predictions/batch-generate', data),
  trainModel: (data: any) => 
    api.post('/predictions/train', data),
  getAccuracy: (params?: any) => 
    api.get('/predictions/accuracy', { params }),
};

export const dataCollectionAPI = {
  fetchEnamData: (data: any) => 
    api.post('/data-collection/fetch-enam', data),
  fetchAgMarkNetData: (data: {
    category: string;
    commodity: string;
    state: string;
    district: string;
    startDate?: string;
    endDate?: string;
  }) => 
    api.post('/data-collection/fetch-agmarknet', data),
  generateMockData: (data: {
    category: string;
    commodity: string;
    state: string;
    district: string;
    count?: number;
  }) => 
    api.post('/data-collection/generate-mock', data),
  getSources: () => 
    api.get('/data-collection/sources'),
  testSource: (source: string) => 
    api.post('/data-collection/test-source', { source }),
  scheduleCollection: (data: any) => 
    api.post('/data-collection/schedule-collection', data),
  getStatus: (params?: any) => 
    api.get('/data-collection/status', { params }),
  validateData: (data: any) => 
    api.post('/data-collection/validate-data', data),
};

export const userPredictionsAPI = {
  createPrediction: (data: { cropName: string; placeName: string; state: string; predictionDate: string }) => 
    api.post('/user-predictions/predict', data),
  getMyPredictions: (params?: any) => 
    api.get('/user-predictions/my-predictions', { params }),
  getPrediction: (id: string) => 
    api.get(`/user-predictions/${id}`),
  validatePrediction: (id: string, actualPrice: number) => 
    api.put(`/user-predictions/${id}/validate`, { actualPrice }),
  deletePrediction: (id: string) => 
    api.delete(`/user-predictions/${id}`),
  getStats: () => 
    api.get('/user-predictions/stats/overview'),
  getAvailableCrops: () => 
    api.get('/user-predictions/crops/available'),
  getAvailableStates: () => 
    api.get('/user-predictions/states/available'),
};

export default api;
