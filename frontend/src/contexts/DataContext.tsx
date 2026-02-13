import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import api, { dataCollectionAPI } from '../services/api';

interface Crop {
  _id: string;
  name: string;
  scientificName?: string;
  category: string;
  enamCommodityId?: string;
  unit: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

interface PriceData {
  _id: string;
  crop: Crop;
  category: string;
  commodity: string;
  state: string;
  district: string;
  market: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  unit: string;
  date: string;
  source: string;
  quality: string;
  createdAt: string;
}

interface Prediction {
  _id: string;
  crop: Crop;
  state: string;
  predictedDate: string;
  predictedPrice: number;
  confidenceScore: number;
  modelType: string;
  unit: string;
  modelVersion: string;
  trainingDataEndDate: string;
  predictionHorizonDays: number;
  status: string;
  createdAt: string;
}

const BACKEND_UNAVAILABLE_MSG =
  'Cannot connect to the backend. Start: 1) FastAPI (uvicorn backend.api.main:app --port 8000), 2) Proxy (cd backend/proxy && npm run proxy), 3) Frontend (npm start).';

function isNetworkError(err: any): boolean {
  return err?.code === 'ERR_NETWORK' || err?.message === 'Network Error';
}

interface DataContextType {
  crops: Crop[];
  currentPrices: PriceData[];
  predictions: Prediction[];
  loading: boolean;
  error: string | null;
  clearError: () => void;
  refreshData: () => Promise<void>;
  refreshPrices: () => Promise<void>;
  refreshPredictions: () => Promise<void>;
  generatePrediction: (cropId: string, state?: string, daysAhead?: number) => Promise<void>;
  fetchAgMarkNetData: (data: {
    category: string;
    commodity: string;
    state: string;
    district: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
  generateMockData: (data: {
    category: string;
    commodity: string;
    state: string;
    district: string;
    count?: number;
  }) => Promise<void>;
  realTimeData: boolean;
  setRealTimeData: (enabled: boolean) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [currentPrices, setCurrentPrices] = useState<PriceData[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realTimeData, setRealTimeData] = useState(false);

  // Define functions first - use endpoints that exist in our FastAPI
  const fetchCrops = useCallback(async () => {
    try {
      const response = await api.get('/crops/popular');
      if (response.data?.success && Array.isArray(response.data.data)) {
        setCrops(response.data.data.map((name: string) => ({
          _id: name,
          name,
          category: '',
          unit: 'quintal',
          isActive: true,
          createdAt: ''
        })));
      }
    } catch (err: any) {
      if (!isNetworkError(err)) console.error('Error fetching crops:', err);
      throw err;
    }
  }, []);

  const refreshPrices = useCallback(async () => {
    try {
      setCurrentPrices([]);
    } catch (err: any) {
      // Silently ignore - we don't have /prices/current
    }
  }, []);

  const refreshPredictions = useCallback(async () => {
    try {
      setPredictions([]);
    } catch (err: any) {
      // Silently ignore - we don't have /predictions
    }
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await fetchCrops();
      await refreshPrices();
      await refreshPredictions();
    } catch (err: any) {
      const msg = isNetworkError(err) ? BACKEND_UNAVAILABLE_MSG : 'Failed to refresh data';
      setError(msg);
      if (!isNetworkError(err)) message.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  }, [fetchCrops, refreshPrices, refreshPredictions]);

  // Real-time data refresh interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (realTimeData) {
      interval = setInterval(() => {
        refreshPrices().catch(() => {}); // Avoid uncaught rejection when backend is down
      }, 120000); // Every 2 minutes to reduce data usage
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [realTimeData]); // Only depends on realTimeData

  const generatePrediction = async (cropId: string, state?: string, daysAhead: number = 7) => {
    try {
      setLoading(true);
      const response = await api.post('/predictions/generate', {
        cropId,
        state,
        predictionDate: new Date().toISOString(),
        daysAhead
      });
      
      if (response.data.success) {
        message.success('Prediction generated successfully!');
        await refreshPredictions();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to generate prediction';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgMarkNetData = async (data: {
    category: string;
    commodity: string;
    state: string;
    district: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      setLoading(true);
      const response = await dataCollectionAPI.fetchAgMarkNetData(data);
      
      if (response.data.success) {
        message.success(`Successfully fetched ${response.data.data.length} price records from AgMarkNet!`);
        await refreshPrices();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch AgMarkNet data';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = async (data: {
    category: string;
    commodity: string;
    state: string;
    district: string;
    count?: number;
  }) => {
    try {
      setLoading(true);
      const response = await dataCollectionAPI.generateMockData(data);
      
      if (response.data.success) {
        message.success(`Successfully generated ${response.data.data.length} mock records!`);
        await refreshPrices();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to generate mock data';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    refreshData();
  }, []); // Empty dependency array - runs only once

  const clearError = useCallback(() => setError(null), []);

  const value: DataContextType = {
    crops,
    currentPrices,
    predictions,
    loading,
    error,
    clearError,
    refreshData,
    refreshPrices,
    refreshPredictions,
    generatePrediction,
    fetchAgMarkNetData,
    generateMockData,
    realTimeData,
    setRealTimeData
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
