import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Mock the contexts to avoid authentication issues in tests
jest.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    user: null,
    loading: false,
    isAuthenticated: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
  }),
}));

jest.mock('./contexts/DataContext', () => ({
  DataProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useData: () => ({
    crops: [],
    currentPrices: [],
    predictions: [],
    loading: false,
    error: null,
    refreshData: jest.fn(),
    refreshPrices: jest.fn(),
    refreshPredictions: jest.fn(),
    generatePrediction: jest.fn(),
    fetchAgMarkNetData: jest.fn(),
    generateMockData: jest.fn(),
    realTimeData: false,
    setRealTimeData: jest.fn(),
  }),
}));

jest.mock('./contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useTheme: () => ({
    isDarkMode: false,
    toggleTheme: jest.fn(),
  }),
}));

test('renders SmartAgri app', () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  // The app should render without crashing
  expect(document.body).toBeInTheDocument();
});
