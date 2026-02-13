import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { DataProvider } from './contexts/DataContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import PriceAnalysis from './pages/PriceAnalysis';
import Predictions from './pages/Predictions';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#52c41a',
          borderRadius: 6,
        },
      }}
    >
      <AntdApp>
        <ThemeProvider>
          <AuthProvider>
            <DataProvider>
              <Router>
                <div className="App">
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/" element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }>
                      <Route index element={<PriceAnalysis />} />
                      <Route path="predictions" element={<Predictions />} />
                      <Route path="profile" element={<Profile />} />
                    </Route>
                  </Routes>
                </div>
              </Router>
            </DataProvider>
          </AuthProvider>
        </ThemeProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;