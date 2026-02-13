import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Spin, message, Row, Col, Statistic, Tag } from 'antd';
import { Line } from '@ant-design/plots';
import { 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  MinusOutlined,
  ReloadOutlined 
} from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;

const CropGraph = () => {
  const [loading, setLoading] = useState(false);
  const [graphData, setGraphData] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState('Rice');
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [days, setDays] = useState(90);
  const [trainedCrops, setTrainedCrops] = useState([
    'Onion', 'Tomato', 'Potato', 'Rice', 'Wheat', 'Maize', 'Bajra', 'Jowar', 'Gram', 'Lentil',
    'Moong', 'Urad', 'Arhar', 'Mustard', 'Groundnut', 'Soybean', 'Cotton', 'Sugarcane',
    'Banana', 'Mango', 'Apple', 'Coconut', 'Cardamom', 'Black Pepper', 'Ginger', 'Garlic',
    'Coriander', 'Cabbage', 'Cauliflower', 'Brinjal'
  ]);

  useEffect(() => {
    axios.get('/api/crops/trained')
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setTrainedCrops(res.data.data);
          setSelectedCrop(res.data.data[0]);
        }
      })
      .catch(() => {});
  }, []);

  const states = [
    'Punjab', 'Haryana', 'Uttar Pradesh', 'Maharashtra', 'Karnataka', 'Tamil Nadu',
    'Gujarat', 'Rajasthan', 'Madhya Pradesh', 'West Bengal', 'Andhra Pradesh',
    'Kerala', 'Bihar', 'Odisha', 'Assam', 'All India'
  ];

  const districts = [
    'Amritsar', 'Ludhiana', 'Karnal', 'Hisar', 'Meerut', 'Agra', 'Pune', 'Nashik',
    'Bangalore', 'Mysore', 'Chennai', 'Coimbatore', 'Ahmedabad', 'Surat',
    'Jaipur', 'Jodhpur', 'Bhopal', 'Indore', 'Kolkata', 'Burdwan',
    'Hyderabad', 'Vijayawada', 'Thiruvananthapuram', 'Kochi', 'Patna', 'Gaya',
    'Bhubaneswar', 'Cuttack', 'Guwahati', 'Jorhat', 'All districts'
  ];

  const fetchGraphData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (selectedState) params.append('state', selectedState);
      if (selectedDistrict) params.append('district', selectedDistrict);
      params.append('days', days.toString());
      
      const response = await axios.get(`/api/graphs/crop/${selectedCrop}?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setGraphData(response.data);
    } catch (error) {
      message.error('Failed to fetch graph data');
      console.error('Graph data error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCrop) {
      fetchGraphData();
    }
  }, [selectedCrop, selectedState, selectedDistrict, days]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <ArrowUpOutlined style={{ color: '#52c41a' }} />;
      case 'decreasing':
        return <ArrowDownOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <MinusOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'success';
      case 'decreasing':
        return 'error';
      default:
        return 'processing';
    }
  };

  const config = {
    data: graphData?.data || [],
    xField: 'date',
    yField: 'price',
    point: {
      size: 4,
      shape: 'circle',
    },
    smooth: true,
    color: '#1890ff',
    tooltip: {
      formatter: (datum) => {
        return {
          name: 'Price (₹/quintal)',
          value: `₹${datum.price.toLocaleString()}`,
        };
      },
    },
    xAxis: {
      type: 'cat',
      title: {
        text: 'Date',
        style: {
          fontSize: 14,
          fontWeight: 'bold',
        },
      },
      label: {
        style: {
          fontSize: 12,
        },
        rotate: -45,
        formatter: (text: any) => {
          // Format date to show only month-day for better readability
          const date = new Date(text);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        },
      },
    },
    yAxis: {
      title: {
        text: 'Price (₹/quintal)',
        style: {
          fontSize: 14,
          fontWeight: 'bold',
        },
      },
      label: {
        formatter: (value) => `₹${value.toLocaleString()}`,
        style: {
          fontSize: 12,
        },
      },
      min: graphData?.stats ? Math.max(0, graphData.stats.minPrice * 0.9) : 0,
      max: graphData?.stats ? graphData.stats.maxPrice * 1.1 : undefined,
    },
  };

  return (
    <div style={{ padding: '24px' }}>
      <h2>📊 Crop Price Graphs (Database Data)</h2>
      
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <div>
              <label>Crop:</label>
              <Select
                value={selectedCrop}
                onChange={setSelectedCrop}
                style={{ width: '100%' }}
                showSearch
                placeholder="Select crop"
              >
                {trainedCrops.map(crop => (
                  <Option key={crop} value={crop}>{crop}</Option>
                ))}
              </Select>
            </div>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <div>
              <label>State:</label>
              <Select
                value={selectedState}
                onChange={setSelectedState}
                style={{ width: '100%' }}
                allowClear
                placeholder="All states"
              >
                {states.map(state => (
                  <Option key={state} value={state}>{state}</Option>
                ))}
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
              >
                {districts.map(district => (
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
                <Option value={90}>Last 90 days</Option>
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
              <Card>
                <Statistic
                  title="Average Price"
                  value={graphData.stats.avgPrice}
                  prefix="₹"
                  suffix="/quintal"
                  precision={2}
                />
              </Card>
            </Col>
            
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Price Range"
                  value={`₹${graphData.stats.minPrice} - ₹${graphData.stats.maxPrice}`}
                  suffix="/quintal"
                />
              </Card>
            </Col>
            
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Trend"
                  value={graphData.stats.trend}
                  prefix={getTrendIcon(graphData.stats.trend)}
                  valueStyle={{ 
                    color: graphData.stats.trend === 'increasing' ? '#52c41a' : 
                           graphData.stats.trend === 'decreasing' ? '#ff4d4f' : '#1890ff'
                  }}
                />
              </Card>
            </Col>
          </Row>

          <Card title={`${selectedCrop} Price Trend (${days} days)`}>
            <div style={{ marginBottom: '16px' }}>
              <Tag color={getTrendColor(graphData.stats.trend)}>
                {getTrendIcon(graphData.stats.trend)} {graphData.stats.trend.toUpperCase()}
              </Tag>
              <span style={{ marginLeft: '8px' }}>
                Based on {graphData.stats.totalRecords} data points from database
              </span>
            </div>
            
            <Line {...config} height={400} />
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

export default CropGraph;
