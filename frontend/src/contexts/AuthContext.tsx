import React, { createContext, useContext, useState, useEffect } from 'react';
import { App } from 'antd';
import api from '../services/api';

// Custom hook to use App component's message
const useAppMessage = () => {
  const { message } = App.useApp();
  return message;
};

interface User {
  id: string;
  username: string;
  email: string;
  userType: 'farmer' | 'trader' | 'admin';
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: {
      state?: string;
      district?: string;
      village?: string;
    };
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (profileData: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  changePassword: (passwordData: ChangePasswordData) => Promise<{ success: boolean; error?: string }>;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  userType?: 'farmer' | 'trader' | 'admin';
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: {
      state?: string;
      district?: string;
      village?: string;
    };
  };
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const message = useAppMessage();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const isDemoMode = localStorage.getItem('demo-mode');
    
    if (token && isDemoMode === 'true') {
      // Demo mode - restore demo user
      const demoUser: User = {
        id: 'demo-user-id',
        username: 'demo',
        email: 'demo@smartagri.com',
        userType: 'farmer',
        profile: {
          firstName: 'Demo',
          lastName: 'User',
          phone: '+91-9876543210',
          address: {
            state: 'Karnataka',
            district: 'Bangalore',
            village: 'Demo Village'
          }
        }
      };
      setUser(demoUser);
      setIsAuthenticated(true);
      setLoading(false);
    } else if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      if (response.data.success) {
        setUser(response.data.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    console.log('🔐 Login attempt:', credentials);
    
    try {
      // Demo mode - bypass backend for testing
      if (credentials.username === 'demo' && credentials.password === 'demo') {
        console.log('✅ Demo login detected');
        const demoUser: User = {
          id: 'demo-user-id',
          username: 'demo',
          email: 'demo@smartagri.com',
          userType: 'farmer',
          profile: {
            firstName: 'Demo',
            lastName: 'User',
            phone: '+91-9876543210',
            address: {
              state: 'Karnataka',
              district: 'Bangalore',
              village: 'Demo Village'
            }
          }
        };
        
        localStorage.setItem('token', 'demo-token');
        localStorage.setItem('demo-mode', 'true');
        setUser(demoUser);
        setIsAuthenticated(true);
        message.success('Demo login successful! Welcome to SmartAgri!');
        console.log('✅ Demo user set:', demoUser);
        return { success: true };
      }
      
      console.log('🔄 Trying backend login...');
      // Try real backend login
      const response = await api.post('/auth/login', credentials);
      
      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(user);
        setIsAuthenticated(true);
        message.success('Login successful!');
        return { success: true };
      }
    } catch (error: any) {
      console.log('❌ Login error:', error);
      // If backend is not available, offer demo mode
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error') || error.message?.includes('ECONNREFUSED')) {
        message.warning('Backend server is not running. Use demo credentials: username: demo, password: demo');
        return { success: false, error: 'Backend server not available. Try demo mode.' };
      }
      
      const errorMessage = error.response?.data?.message || 'Login failed';
      message.error(errorMessage);
      return { success: false, error: errorMessage };
    }
    return { success: false, error: 'Login failed' };
  };

  const register = async (userData: RegisterData) => {
    try {
      const response = await api.post('/auth/register', userData);
      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(user);
        setIsAuthenticated(true);
        message.success('Registration successful!');
        return { success: true };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      message.error(errorMessage);
      return { success: false, error: errorMessage };
    }
    return { success: false, error: 'Registration failed' };
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('demo-mode');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
    message.success('Logged out successfully!');
  };

  const updateProfile = async (profileData: Partial<User>) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      if (response.data.success) {
        setUser(response.data.user);
        message.success('Profile updated successfully!');
        return { success: true };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Profile update failed';
      message.error(errorMessage);
      return { success: false, error: errorMessage };
    }
    return { success: false, error: 'Profile update failed' };
  };

  const changePassword = async (passwordData: ChangePasswordData) => {
    try {
      const response = await api.post('/auth/change-password', passwordData);
      if (response.data.success) {
        message.success('Password changed successfully!');
        return { success: true };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Password change failed';
      message.error(errorMessage);
      return { success: false, error: errorMessage };
    }
    return { success: false, error: 'Password change failed' };
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    changePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
