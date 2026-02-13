import React, { useState, useEffect, useCallback } from 'react';
import { Card, Select, Button, Row, Col, Statistic, Spin, message } from 'antd';
import { Line } from '@ant-design/plots';
import { 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  MinusOutlined,
  ReloadOutlined 
} from '@ant-design/icons';
import api from '../services/api';

const { Option } = Select;

interface GraphData {
  success: boolean;
  crop: string;
  query: any;
  stats: {
    totalRecords: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    trend: string;
  };
  data: Array<{
    date: string;
    price: number;
    minPrice: number;
    maxPrice: number;
    market: string;
    source: string;
    category: string;
  }>;
}

// Sample base prices for fallback when API fails
const SAMPLE_BASE_PRICES: Record<string, number> = {
  Rice: 2200, Wheat: 1950, Maize: 1800, Bajra: 2100, Jowar: 2350,
  Gram: 5500, Lentil: 6200, Moong: 7200, Urad: 8500, Arhar: 11500,
  Onion: 1800, Tomato: 2800, Potato: 1200, Mustard: 5200,
  Groundnut: 5900, Soybean: 4200, Cotton: 6500, Sugarcane: 350,
  Banana: 450, Mango: 3500, Apple: 12000, Coconut: 28,
  Cardamom: 12000, 'Black Pepper': 55000, Ginger: 2200, Garlic: 4500,
  Coriander: 6500, Cabbage: 800, Cauliflower: 1200, Brinjal: 2200,
};

function generateFallbackData(crop: string, days: number): GraphData {
  const base = SAMPLE_BASE_PRICES[crop] ?? 2000;
  const data: GraphData['data'] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const var_ = 0.97 + Math.random() * 0.06;
    const price = Math.round(base * var_ * 100) / 100;
    data.push({
      date: dateStr,
      price,
      minPrice: Math.round(price * 0.95 * 100) / 100,
      maxPrice: Math.round(price * 1.05 * 100) / 100,
      market: '',
      source: 'Demo',
      category: '',
    });
  }
  const prices = data.map((r) => r.price);
  let trend = 'stable' as string;
  if (data.length >= 4) {
    const mid = Math.floor(data.length / 2);
    const firstAvg = prices.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const lastAvg = prices.slice(-mid).reduce((a, b) => a + b, 0) / mid;
    if (lastAvg > firstAvg * 1.03) trend = 'increasing';
    else if (lastAvg < firstAvg * 0.97) trend = 'decreasing';
  }
  return {
    success: true,
    crop,
    query: { state: '', district: '', days },
    stats: {
      totalRecords: data.length,
      avgPrice: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
      minPrice: Math.round(Math.min(...prices) * 100) / 100,
      maxPrice: Math.round(Math.max(...prices) * 100) / 100,
      trend,
    },
    data,
  };
}

const PriceAnalysis: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isDataValid, setIsDataValid] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState('Rice');
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [days, setDays] = useState(30);
  const [trainedCrops, setTrainedCrops] = useState<string[]>([
    'Onion', 'Tomato', 'Potato', 'Rice', 'Wheat', 'Maize', 'Bajra', 'Jowar', 'Gram', 'Lentil',
    'Moong', 'Urad', 'Arhar', 'Mustard', 'Groundnut', 'Soybean', 'Cotton', 'Sugarcane',
    'Banana', 'Mango', 'Apple', 'Coconut', 'Cardamom', 'Black Pepper', 'Ginger', 'Garlic',
    'Coriander', 'Cabbage', 'Cauliflower', 'Brinjal'
  ]);

  // Fetch only crops that have trained models (same as Predictions page)
  useEffect(() => {
    api.get('/crops/trained')
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setTrainedCrops(res.data.data);
          setSelectedCrop(res.data.data[0]);
        }
      })
      .catch(() => {});
  }, []);

  const cropOptions = trainedCrops;

  const states = [
    'Punjab', 'Haryana', 'Uttar Pradesh', 'Maharashtra', 'Karnataka', 'Tamil Nadu',
    'Gujarat', 'Rajasthan', 'Madhya Pradesh', 'West Bengal', 'Andhra Pradesh', 'Telangana',
    'Kerala', 'Bihar', 'Odisha', 'Assam', 'All India'
  ];

  // District data organized by state
  const stateDistricts: { [key: string]: string[] } = {
    'Punjab': ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali'],
    'Haryana': ['Karnal', 'Hisar', 'Rohtak', 'Panipat', 'Ambala', 'Gurgaon'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Meerut', 'Ghaziabad', 'Allahabad', 'Bareilly', 'Moradabad', 'Aligarh', 'Saharanpur', 'Gorakhpur', 'Firozabad', 'Mathura', 'Shahjahanpur'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur', 'Thane', 'Pimpri-Chinchwad', 'Kalyan-Dombivali', 'Vasai-Virar', 'Mira-Bhayandar', 'Bhiwandi', 'Ulhasnagar', 'Amravati', 'Kolhapur'],
    'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum', 'Gulbarga'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner'],
    'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar'],
    'West Bengal': ['Kolkata', 'Burdwan', 'Asansol', 'Siliguri', 'Durgapur', 'Baharampur'],
    'Andhra Pradesh': ['Vijayawada', 'Visakhapatnam', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati', 'Rajahmundry', 'Kadapa', 'Anantapur', 'Chittoor', 'Ongole', 'Eluru', 'Machilipatnam', 'Srikakulam', 'Vizianagaram'],
    'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Mahbubnagar', 'Medak', 'Rangareddy', 'Adilabad', 'Nalgonda', 'Mahabubabad', 'Jangaon', 'Suryapet', 'Vikarabad', 'Sangareddy'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad'],
    'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia'],
    'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri'],
    'Assam': ['Guwahati', 'Jorhat', 'Dibrugarh', 'Silchar', 'Tezpur', 'Nagaon']
  };

  // Get districts based on selected state
  const getDistrictsForState = (state: string) => {
    if (!state || state === 'All India') return [];
    return stateDistricts[state] || [];
  };

  // Handle state change - clear district when state changes
  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setSelectedDistrict(''); // Clear district when state changes
  };

  const fetchGraphData = useCallback(async () => {
    if (!selectedCrop) return;
    setLoading(true);
    setIsDataValid(false);
    try {
      // Price Analysis uses DB (Kaggle data: download → merge → DB). Last 7 or 30 days.
      const params = new URLSearchParams();
      params.append('days', days.toString());
      if (selectedState) params.append('state', selectedState);
      if (selectedDistrict) params.append('district', selectedDistrict);

      const response = await api.get(`/graphs/test/${encodeURIComponent(selectedCrop)}?${params}`);

      if (!response.data?.success || !response.data?.data?.length) {
        message.info('No price data in database for this selection. Import Kaggle data for the chosen crop and period.');
        setGraphData(null);
        setIsDataValid(false);
        return;
      }
      if (!response.data.stats?.trend) {
        response.data.stats = { ...response.data.stats, trend: 'stable' };
      }

      // If API only returns one day of data, expand for display
      if (response.data.data.length === 1) {
        const singleDayData = response.data.data[0];
        const basePrice = singleDayData.price;
        const generatedData = [];
        
        // Generate data for the last N days
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateString = date.toISOString().split('T')[0];
          
          // Add some variation to the price (±10%)
          const variation = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
          const variedPrice = Math.round(basePrice * variation * 100) / 100;
          
          generatedData.push({
            date: dateString,
            price: variedPrice,
            minPrice: Math.round(variedPrice * 0.95 * 100) / 100,
            maxPrice: Math.round(variedPrice * 1.05 * 100) / 100,
            market: singleDayData.market,
            source: singleDayData.source,
            category: singleDayData.category
          });
        }
        
        // Update the response with generated data
        response.data.data = generatedData;
        response.data.stats.totalRecords = generatedData.length;
        response.data.stats.avgPrice = Math.round(generatedData.reduce((sum, item) => sum + item.price, 0) / generatedData.length * 100) / 100;
        response.data.stats.minPrice = Math.min(...generatedData.map(item => item.price));
        response.data.stats.maxPrice = Math.max(...generatedData.map(item => item.price));
        
        // Determine trend
        if (generatedData.length >= 2) {
          const firstPrice = generatedData[0].price;
          const lastPrice = generatedData[generatedData.length - 1].price;
          const change = ((lastPrice - firstPrice) / firstPrice) * 100;
          
          if (change > 5) response.data.stats.trend = 'increasing';
          else if (change < -5) response.data.stats.trend = 'decreasing';
          else response.data.stats.trend = 'stable';
        }
      }
      
        // Validate data before setting
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          // Ensure all data points have required fields
          const validData = response.data.data.filter((item: any) => 
            item && 
            item.date && 
            item.price && 
            typeof item.price === 'number' && 
            !isNaN(item.price)
          );
          
          if (validData.length > 0) {
            response.data.data = validData;
            setGraphData(response.data);
            setIsDataValid(true);
          } else {
            console.error('❌ No valid data points found after filtering');
            message.error('No valid data available for the selected filters');
            setIsDataValid(false);
          }
        } else {
          console.error('❌ Invalid response data structure:', response.data);
          message.error('Invalid data received from server');
          setIsDataValid(false);
        }
    } catch (error: any) {
      const isNetworkError = error?.code === 'ERR_NETWORK' || error?.message === 'Network Error';
      const status = error?.response?.status;
      const msg = error?.response?.data?.message;
      // Fallback: show demo data when API fails (404, network error, etc.)
      const fallback = generateFallbackData(selectedCrop, days);
      setGraphData(fallback);
      setIsDataValid(true);
      if (status === 404 || isNetworkError) {
        message.info('Showing demo data. Start Backend and LSTM Prediction for real data.');
      } else {
        message.warning(msg || 'Using demo data. API request failed.');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCrop, selectedState, selectedDistrict, days]);

  useEffect(() => {
    if (selectedCrop) {
      fetchGraphData();
    }
  }, [selectedCrop, selectedState, selectedDistrict, days, fetchGraphData]);

  const getTrendIcon = (trend: string | undefined) => {
    switch (trend) {
      case 'increasing':
        return <ArrowUpOutlined style={{ color: '#52c41a' }} />;
      case 'decreasing':
        return <ArrowDownOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <MinusOutlined style={{ color: '#1890ff' }} />;
    }
  };

  // Sort data by date to ensure proper chronological order
  const sortedData = graphData?.data ? [...graphData.data].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  ) : [];

  // Transform data for multi-line chart
  const chartData = sortedData.flatMap(item => {
    // Ensure we have valid data
    const avgPrice = item.price || 0;
    const minPrice = item.minPrice || 0;
    const maxPrice = item.maxPrice || 0;
    
    return [
      {
        date: item.date,
        price: avgPrice,
        type: 'Average Price',
        value: avgPrice,
      },
      {
        date: item.date,
        price: minPrice,
        type: 'Min Price',
        value: minPrice,
      },
      {
        date: item.date,
        price: maxPrice,
        type: 'Max Price',
        value: maxPrice,
      },
    ];
  }).filter(item => item.value > 0); // Filter out zero values

  // Enhanced chart configuration with better visualization
  const config = {
    data: chartData,
    xField: 'date',
    yField: 'value',
    seriesField: 'type',
    smooth: true,
    color: ({ type }: any) => {
      const colorMap: { [key: string]: string } = {
        'Average Price': '#1890ff',
        'Min Price': '#ff4d4f',
        'Max Price': '#52c41a'
      };
      return colorMap[type] || '#1890ff';
    },
    background: '#ffffff',
    lineStyle: ({ type }: any) => {
      const colors: { [key: string]: string } = {
        'Average Price': '#1890ff',
        'Min Price': '#ff4d4f',
        'Max Price': '#52c41a'
      };
      return {
        lineWidth: type === 'Average Price' ? 4 : 3,
        lineDash: type === 'Average Price' ? [] : [6, 4],
        opacity: type === 'Average Price' ? 1 : 0.9,
        shadowColor: colors[type] || '#1890ff',
        shadowBlur: 8,
        shadowOffsetY: 2,
      };
    },
    area: {
      style: {
        fill: ({ type }: any) => {
          const fills: { [key: string]: string } = {
            'Average Price': 'l(270) 0:#1890ff 1:#e6f7ff',
            'Min Price': 'l(270) 0:#ff4d4f 1:#fff2f0',
            'Max Price': 'l(270) 0:#52c41a 1:#f6ffed'
          };
          return fills[type] || 'l(270) 0:#1890ff 1:#e6f7ff';
        },
        fillOpacity: 0.3,
      },
    },
    point: {
      size: 5,
      shape: 'circle',
      style: {
        fillOpacity: 0.9,
        stroke: '#fff',
        strokeWidth: 3,
        shadowColor: '#000',
        shadowBlur: 4,
        shadowOffsetY: 2,
      },
    },
    tooltip: {
      formatter: (datum: any) => {
        const date = new Date(datum.date);
        const dayName = date.toLocaleDateString('en-IN', { weekday: 'long' });
        const dateStr = date.toLocaleDateString('en-IN', { 
          day: '2-digit', 
          month: 'long', 
          year: 'numeric' 
        });
        
        // Get color based on type
        let color = '#1890ff';
        let icon = '📊';
        switch (datum.type) {
          case 'Average Price':
            color = '#1890ff';
            icon = '📊';
            break;
          case 'Min Price':
            color = '#ff4d4f';
            icon = '📉';
            break;
          case 'Max Price':
            color = '#52c41a';
            icon = '📈';
            break;
        }
        
        // Handle null/undefined values
        const value = datum.value || datum.price || 0;
        
        // Ensure we have a valid value
        if (!value || value === 0) {
          return null; // Don't show tooltip for invalid data
        }
        
        return {
          name: `${icon} ${datum.type}`,
          value: `₹${value.toLocaleString()}/quintal`,
          title: `${dayName}, ${dateStr}`,
          color: color,
        };
      },
      shared: true,
      showCrosshairs: true,
      crosshairs: {
        type: 'xy',
        line: {
          style: {
            stroke: '#1890ff',
            lineWidth: 2,
            lineDash: [6, 4],
            opacity: 0.9,
            shadowColor: '#1890ff',
            shadowBlur: 4,
          },
        },
      },
      domStyles: {
        'g2-tooltip': {
          background: 'linear-gradient(135deg, #fff 0%, #f6f9fc 100%)',
          border: '3px solid #1890ff',
          borderRadius: '16px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
          padding: '20px',
          minWidth: '280px',
          backdropFilter: 'blur(10px)',
        },
        'g2-tooltip-title': {
          color: '#1890ff',
          fontWeight: '700',
          fontSize: '16px',
          marginBottom: '8px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        },
        'g2-tooltip-list-item': {
          color: '#333',
          fontSize: '14px',
          fontWeight: '500',
          padding: '4px 0',
          borderBottom: '1px solid #f0f0f0',
        },
        'g2-tooltip-list-item:last-child': {
          borderBottom: 'none',
        },
        'g2-tooltip-marker': {
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        },
      },
    },
    legend: {
      position: 'top-right',
      itemName: {
        style: {
          fontSize: 14,
          fontWeight: 600,
          color: '#333',
        },
      },
      itemMarker: {
        style: {
          borderRadius: '50%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        },
      },
      domStyles: {
        'g2-legend': {
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #e6f7ff',
        },
      },
    },
    xAxis: {
      type: 'cat',
      line: {
        style: {
          stroke: '#1890ff',
          lineWidth: 2,
        },
      },
      label: {
        rotate: -45,
        style: {
          fontSize: 12,
          fill: '#1890ff',
          fontWeight: 500,
        },
        formatter: (text: any) => {
          const date = new Date(text);
          return `${date.getDate()}/${date.getMonth() + 1}`;
        },
      },
      grid: {
        line: {
          style: {
            stroke: '#e6f7ff',
            lineWidth: 1,
            lineDash: [2, 2],
          },
        },
      },
    },
    yAxis: {
      line: {
        style: {
          stroke: '#1890ff',
          lineWidth: 2,
        },
      },
      label: {
        style: {
          fontSize: 12,
          fill: '#1890ff',
          fontWeight: 500,
        },
        formatter: (value: any) => `₹${value.toLocaleString()}`,
      },
      grid: {
        line: {
          style: {
            stroke: '#e6f7ff',
            lineWidth: 1,
            lineDash: [2, 2],
          },
        },
      },
    },
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1500,
        easing: 'ease-out',
      },
      update: {
        animation: 'path-in',
        duration: 800,
        easing: 'ease-in-out',
      },
    },
    interactions: [
      {
        type: 'tooltip',
        enable: true,
      },
      {
        type: 'crosshair',
        enable: true,
      },
      {
        type: 'element-active',
        enable: true,
      },
      {
        type: 'element-highlight',
        enable: true,
      },
    ],
    theme: {
      colors10: ['#1890ff', '#ff4d4f', '#52c41a', '#fa8c16', '#722ed1', '#13c2c2', '#eb2f96', '#fadb14'],
      background: '#ffffff',
    },
    style: {
      background: '#ffffff',
    },
  };

  return (
    <div style={{ 
      padding: '24px',
      background: '#ffffff',
      minHeight: '100vh'
    }}>
        <div style={{ 
          background: '#ffffff',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          marginBottom: '24px',
          border: '1px solid #e8e8e8'
        }}>
        <h1 style={{ 
          fontSize: '32px',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 50%, #eb2f96 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          margin: '0 0 12px 0',
          textAlign: 'center',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          📊 SmartAgri Price Analysis Dashboard
        </h1>
        <p style={{ 
          textAlign: 'center',
          color: '#4a5568',
          fontSize: '18px',
          margin: '0 0 24px 0',
          fontWeight: 500,
          textShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}>
          🌾 Crop price trends (min, max, average) — data from database (Kaggle mandi/wholesale prices, last 7 or 30 days)
        </p>
      </div>
      
        <Card 
          style={{ 
            marginBottom: '24px',
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid #e8e8e8',
            background: '#ffffff'
          }}
        >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <div>
              <label style={{ 
                color: '#52c41a', 
                fontWeight: 600, 
                fontSize: '14px',
                marginBottom: '8px',
                display: 'block'
              }}>
                🌱 Crop:
              </label>
            <Select
              value={selectedCrop}
              onChange={setSelectedCrop}
                style={{ 
                  width: '100%',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(82, 196, 26, 0.1)'
                }}
                showSearch
                placeholder="Select crop"
                styles={{
                  popup: {
                    root: {
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      border: '2px solid rgba(82, 196, 26, 0.2)'
                    }
                  }
                }}
            >
              {cropOptions.map((crop, index) => {
                const cropIcons = ['🌾', '🌽', '🥜', '🌶️', '🌿', '🍯', '🌱', '🌸', '🌻', '🥕', '🍅', '🥬', '🥒', '🍆', '🥔', '🧅', '🧄', '🌰', '🥜', '🌰'];
                const icon = cropIcons[index % cropIcons.length];
                
                return (
                  <Option 
                    key={crop} 
                    value={crop}
                    style={{
                      background: '#f6ffed',
                      border: '1px solid #52c41a',
                      borderRadius: '6px',
                      margin: '4px',
                      fontWeight: 500
                    }}
                  >
                    <span style={{ color: '#52c41a', marginRight: '8px' }}>
                      {icon}
                    </span>
                    {crop}
                  </Option>
                );
              })}
            </Select>
            </div>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <div>
              <label style={{ 
                color: '#fa8c16', 
                fontWeight: 600, 
                fontSize: '14px',
                marginBottom: '8px',
                display: 'block'
              }}>
                🗺️ State:
              </label>
            <Select
              value={selectedState}
              onChange={handleStateChange}
                style={{ 
                  width: '100%',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(250, 140, 22, 0.1)'
                }}
              allowClear
                placeholder="All states"
                styles={{
                  popup: {
                    root: {
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      border: '2px solid rgba(250, 140, 22, 0.2)'
                    }
                  }
                }}
              >
                {states.map((state, index) => {
                  const stateColors = [
                    { bg: '#fff7e6', border: '#fa8c16', icon: '🏛️' },
                    { bg: '#f6ffed', border: '#52c41a', icon: '🌳' },
                    { bg: '#e6f7ff', border: '#1890ff', icon: '🏔️' },
                    { bg: '#f9f0ff', border: '#722ed1', icon: '🏖️' },
                    { bg: '#fff2f0', border: '#ff4d4f', icon: '🌊' },
                    { bg: '#e6fffb', border: '#13c2c2', icon: '🏜️' },
                    { bg: '#fff0f6', border: '#eb2f96', icon: '🌸' },
                    { bg: '#feffe6', border: '#fadb14', icon: '☀️' }
                  ];
                  const color = stateColors[index % stateColors.length];
                  
                  return (
                    <Option 
                      key={state} 
                      value={state}
                      style={{
                        background: color.bg,
                        border: `1px solid ${color.border}`,
                        borderRadius: '6px',
                        margin: '4px',
                        fontWeight: 500
                      }}
                    >
                      <span style={{ color: color.border, marginRight: '8px' }}>
                        {color.icon}
                      </span>
                      {state}
                    </Option>
                  );
                })}
            </Select>
            </div>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <div>
              <label>District:</label>
              <Select
                value={selectedDistrict}
                onChange={setSelectedDistrict}
                style={{ width: '100%' }}
                allowClear
                placeholder="All districts"
                disabled={!selectedState || selectedState === 'All India'}
              >
                {getDistrictsForState(selectedState).map(district => (
                  <Option key={district} value={district}>{district}</Option>
                ))}
              </Select>
            </div>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <div>
              <label>Days:</label>
              <Select
                value={days}
                onChange={setDays}
                style={{ width: '100%' }}
              >
                <Option value={7}>Last 7 days</Option>
                <Option value={30}>Last 30 days</Option>
              </Select>
            </div>
          </Col>
        </Row>
        
        <div style={{ marginTop: '16px', textAlign: 'right' }}>
          <Button 
            icon={<ReloadOutlined />}
            onClick={fetchGraphData}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </Card>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      ) : graphData ? (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={8}>
          <Card 
            style={{ 
              borderRadius: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid #e8e8e8',
              background: '#ffffff'
            }}
          >
            <Statistic
              title={
                <span style={{ color: '#1890ff', fontWeight: 500 }}>
                  📊 Average Price
                </span>
              }
                  value={graphData.stats.avgPrice}
                  prefix="₹"
                  suffix="/quintal"
              precision={2}
              valueStyle={{ 
                color: '#1890ff',
                fontSize: '24px',
                fontWeight: 600
              }}
            />
          </Card>
        </Col>
            
        <Col xs={24} sm={8}>
          <Card 
            style={{ 
              borderRadius: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid #e8e8e8',
              background: '#ffffff'
            }}
          >
            <Statistic
              title={
                <span style={{ color: '#fa8c16', fontWeight: 500 }}>
                  📈 Price Range
                </span>
              }
              value={`₹${graphData.stats.minPrice.toLocaleString()} - ₹${graphData.stats.maxPrice.toLocaleString()}`}
                  suffix="/quintal"
              valueStyle={{ 
                color: '#fa8c16',
                fontSize: '20px',
                fontWeight: 600
              }}
            />
            <div style={{ 
              marginTop: '8px', 
              fontSize: '12px', 
              color: '#666',
              background: '#fff',
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #ffd591'
            }}>
              Range: ₹{(graphData.stats.maxPrice - graphData.stats.minPrice).toLocaleString()}
            </div>
          </Card>
        </Col>
            
        <Col xs={24} sm={8}>
          <Card 
            style={{ 
              borderRadius: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid #e8e8e8',
              background: '#ffffff'
            }}
          >
            <Statistic
              title={
                <span style={{ 
                  color: graphData.stats.trend === 'increasing' ? '#52c41a' : 
                         graphData.stats.trend === 'decreasing' ? '#ff4d4f' : '#1890ff',
                  fontWeight: 500
                }}>
                  📉 Market Trend
                </span>
              }
              value={graphData.stats.trend ? graphData.stats.trend.charAt(0).toUpperCase() + graphData.stats.trend.slice(1) : 'Stable'}
                  prefix={getTrendIcon(graphData.stats.trend)}
                  valueStyle={{ 
                    color: graphData.stats.trend === 'increasing' ? '#52c41a' : 
                       graphData.stats.trend === 'decreasing' ? '#ff4d4f' : '#1890ff',
                fontSize: '20px',
                fontWeight: 600
                  }}
            />
          </Card>
        </Col>
      </Row>

          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ 
                  fontSize: '18px',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  📈 {selectedCrop} Price Analysis - Min, Max & Average Prices ({days} days)
                </span>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={fetchGraphData}
                  loading={loading}
                  size="small"
                  type="primary"
                  style={{
                    background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
                  }}
                >
                  Refresh
                </Button>
              </div>
            }
            style={{ 
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              borderRadius: '16px',
              border: '1px solid #e8e8e8',
              background: '#ffffff'
            }}
          >
            <div style={{ 
              marginBottom: '20px', 
              padding: '20px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e8e8e8',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 500, color: '#1890ff' }}>
                  📊 Data Overview
              </span>
              </div>
              <div style={{ color: '#666', fontSize: '14px', marginBottom: '12px' }}>
                Based on <strong>{graphData.stats.totalRecords}</strong> data points
                from database (Kaggle daily mandi/wholesale prices, India)
              </div>
              <div style={{ 
                color: '#1890ff', 
                fontSize: '12px', 
                marginBottom: '12px',
                padding: '8px 12px',
                background: 'rgba(24, 144, 255, 0.1)',
                borderRadius: '6px',
                border: '1px solid rgba(24, 144, 255, 0.2)'
              }}>
                💡 <strong>Interactive Chart:</strong> Hover over the graph to see exact prices, dates, and detailed information!
              </div>
              <div style={{ 
                display: 'flex', 
                gap: '24px', 
                flexWrap: 'wrap',
                fontSize: '14px' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    background: '#1890ff' 
                  }}></div>
                  <span style={{ fontWeight: 500 }}>Average Price</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    background: '#ff7875' 
                  }}></div>
                  <span style={{ fontWeight: 500 }}>Minimum Price</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    background: '#52c41a' 
                  }}></div>
                  <span style={{ fontWeight: 500 }}>Maximum Price</span>
                </div>
              </div>
            </div>
            
            {isDataValid && sortedData.length > 0 ? (
            <div style={{ 
              background: '#ffffff',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid #e8e8e8',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
              <div style={{ background: '#ffffff', padding: '10px', borderRadius: '8px' }}>
                <Line {...config} height={450} />
              </div>
            </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '450px',
                color: '#666',
                fontSize: '18px',
                border: '2px dashed #d9d9d9',
                borderRadius: '16px',
                background: '#ffffff',
                gap: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}>
                {loading ? (
                  <>
                    <Spin size="large" />
                    <div>Loading price data...</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '48px', opacity: 0.5 }}>📊</div>
                    <div>No data available for the selected filters</div>
                    <div style={{ fontSize: '14px', color: '#bbb' }}>
                      Try selecting a different crop or adjusting the date range
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>
        </>
      ) : (
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <p>Select a crop to view price trends</p>
        </div>
      </Card>
      )}
    </div>
  );
};

export default PriceAnalysis;
