import React, { useState, useEffect } from 'react';
import { Card, Form, Select, Button, Typography, Row, Col, DatePicker, message, Spin } from 'antd';
import { 
  LineChartOutlined, 
  ThunderboltOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { useData } from '../contexts/DataContext';
import { getDistrictsForState } from '../data/indianDistricts';
import moment from 'moment';
import api from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;
const Predictions: React.FC = () => {
  const { 
    loading
  } = useData();
  const [form] = Form.useForm();
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState<string>('All India');
  const [selectedDate] = useState<moment.Moment>(moment());
  const [trainedCrops, setTrainedCrops] = useState<string[]>([
    'Onion', 'Tomato', 'Potato', 'Rice', 'Wheat', 'Maize', 'Bajra', 'Jowar', 'Gram', 'Lentil',
    'Moong', 'Urad', 'Arhar', 'Mustard', 'Groundnut', 'Soybean', 'Cotton', 'Sugarcane',
    'Banana', 'Mango', 'Apple', 'Coconut', 'Cardamom', 'Black Pepper', 'Ginger', 'Garlic',
    'Coriander', 'Cabbage', 'Cauliflower', 'Brinjal'
  ]);

  // Fetch only crops that have trained LSTM models
  useEffect(() => {
    api.get('/crops/trained')
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setTrainedCrops(res.data.data);
          form.setFieldsValue({ crop: res.data.data[0] });
        }
      })
      .catch(() => {});
  }, [form]);

  // Initialize available states and districts
  useEffect(() => {
    const states = [
      'All India',
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
      'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
      'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
      'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
      'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
      'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Puducherry'
    ];
    setAvailableStates(states);

    // Set initial districts for default state
    setAvailableDistricts(getDistrictsForState(selectedState));
  }, [selectedState]); // stateDistricts is now a constant outside component

  // Handle state change
  const handleStateChange = (state: string) => {
    setSelectedState(state);
    // Update available districts for the selected state
    setAvailableDistricts(getDistrictsForState(state));
    // Reset district when state changes
    form.setFieldsValue({ district: 'All districts' });
  };

  const handlePredictionSubmit = async (values: any) => {
    setPredictionLoading(true);
    setPredictionResult(null);
    
    
    try {
      // Prepare prediction data with AgMarkNet-style inputs
      let predictionDate;
      
      // Handle date formatting more robustly
      if (values.predictionDate) {
        if (typeof values.predictionDate.format === 'function') {
          predictionDate = values.predictionDate.format('YYYY-MM-DD');
        } else if (values.predictionDate instanceof Date) {
          predictionDate = moment(values.predictionDate).format('YYYY-MM-DD');
        } else {
          predictionDate = moment().add(30, 'days').format('YYYY-MM-DD');
        }
      } else if (selectedDate && typeof selectedDate.format === 'function') {
        predictionDate = selectedDate.format('YYYY-MM-DD');
      } else {
        predictionDate = moment().add(30, 'days').format('YYYY-MM-DD');
      }
      
      const predictionData = {
        category: '',
        commodity: values.crop,
        state: values.state,
        district: values.district,
        predictionDate: predictionDate
      };
      
      console.log('✅ Form submitted successfully!');
      console.log('📤 Sending prediction data:', predictionData);
      console.log('📅 Date conversion:', { 
        originalDate: values.predictionDate ? 'Moment object' : 'undefined',
        formattedDate: predictionDate,
        selectedDate: selectedDate ? 'Moment object' : 'undefined'
      });


      // Use proxy (goes to FastAPI via port 3001)
      const apiUrl = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL.replace(/\/api$/, '')}/api/user-predictions/test/predict` : '/api/user-predictions/test/predict';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(predictionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
        (error as any).status = response.status;
        throw error;
      }

      const result = await response.json();

      if (result.success) {
        console.log('✅ Full API response:', result);
        console.log('📊 Prediction data received:', result.prediction);
        console.log('💰 Predicted price:', result.prediction?.prediction?.predictedPrice);
        console.log('🎯 Confidence score:', result.prediction?.prediction?.confidenceScore);
        console.log('🌾 Crop name:', result.prediction?.prediction?.cropName);
        setPredictionResult(result.prediction.prediction);
        message.success('Prediction generated successfully!');
        // Don't reset form fields to keep the values visible
      } else {
        console.log('❌ API response failed:', result);
        message.error(result.message || 'Failed to generate prediction');
      }
    } catch (error) {
      console.error('Prediction error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Clear any previous prediction result
      setPredictionResult(null);
      
      if (errorMessage.includes('Failed to fetch')) {
        message.error('Cannot connect to prediction service. Please ensure the backend server is running.');
      } else if (errorMessage.includes('404')) {
        message.error('Prediction service not found. Please check if the ML service is running.');
      } else if (errorMessage.includes('500')) {
        message.error('Server error occurred while generating prediction. Please try again later.');
      } else if (errorMessage.includes('401')) {
        message.error('Authentication failed. Please log in again.');
      } else {
        message.error(`Prediction failed: ${errorMessage}`);
      }
    } finally {
      setPredictionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="fade-in predictions-page">
      <div style={{ marginBottom: 12, textAlign: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>
          <ThunderboltOutlined /> Crop Price Prediction
        </Title>
        <Text type="secondary" style={{ fontSize: '14px' }}>
          Get intelligent price predictions for your crops based on weather, location, and market trends
        </Text>
      </div>

      <Row gutter={[16, 16]} justify="center">
        <Col xs={24} lg={12}>
          <Card className="prediction-form-card" size="small">
            <Title level={4} style={{ textAlign: 'center', marginBottom: 12 }}>
              <LineChartOutlined /> Make a Prediction
            </Title>
            
            <Form
              form={form}
              layout="vertical"
              size="middle"
              onFinish={(values) => {
                console.log('Form submitted with values:', values);
                handlePredictionSubmit(values);
              }}
              onFinishFailed={(errorInfo) => {
                console.log('Form validation failed:', errorInfo);
                message.error('Please fill in all required fields');
              }}
              initialValues={{
                crop: trainedCrops[0] || 'Rice',
                state: 'All India',
                district: 'All districts',
                predictionDate: selectedDate
              }}
            >
              <Row gutter={12}>
                <Col xs={24} sm={12}>
              <Form.Item
                name="crop"
                label={
                  <span style={{ color: '#52c41a', fontWeight: 600 }}>
                    <DollarOutlined style={{ marginRight: 8 }} />
                    Crop
                  </span>
                }
                rules={[{ required: true, message: 'Please select a crop!' }]}
              >
                <Select
                  placeholder="Choose a crop"
                  showSearch
                  optionFilterProp="label"
                  filterOption={(input, option) =>
                    (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                  }
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(82, 196, 26, 0.1)',
                  }}
                  styles={{
                    popup: {
                      root: {
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                        border: '2px solid rgba(82, 196, 26, 0.2)',
                      },
                    },
                  }}
                >
                  {trainedCrops.map((crop, index) => {
                    const cropIcons = ['🌾', '🌽', '🥜', '🌶️', '🌿', '🍯', '🌱', '🌸', '🌻', '🥕', '🍅', '🥬', '🥒', '🍆', '🥔', '🧅', '🧄', '🌰', '🥜', '🌰'];
                    const icon = cropIcons[index % cropIcons.length];
                    return (
                      <Option
                        key={crop}
                        value={crop}
                        label={crop}
                        style={{
                          background: '#f6ffed',
                          border: '1px solid #52c41a',
                          borderRadius: '6px',
                          margin: '4px',
                          fontWeight: 500,
                        }}
                      >
                        <span style={{ color: '#52c41a', marginRight: '8px' }}>{icon}</span>
                        {crop}
                      </Option>
                    );
                  })}
                </Select>
              </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
              <Form.Item
                name="state"
                label={
                  <span style={{ color: '#fa8c16', fontWeight: 600 }}>
                    <EnvironmentOutlined style={{ marginRight: 8 }} />
                    State
                  </span>
                }
                rules={[{ required: true, message: 'Please select a state!' }]}
              >
                <Select
                  placeholder="Choose your state"
                  showSearch
                  optionFilterProp="label"
                  filterOption={(input, option) =>
                    (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                  }
                  onChange={handleStateChange}
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(250, 140, 22, 0.1)',
                  }}
                  styles={{
                    popup: {
                      root: {
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                        border: '2px solid rgba(250, 140, 22, 0.2)',
                      },
                    },
                  }}
                >
                  {availableStates.map((state, index) => {
                    const stateColors = [
                      { bg: '#fff7e6', border: '#fa8c16', icon: '🏛️' },
                      { bg: '#f6ffed', border: '#52c41a', icon: '🌳' },
                      { bg: '#e6f7ff', border: '#1890ff', icon: '🏔️' },
                      { bg: '#f9f0ff', border: '#722ed1', icon: '🏖️' },
                      { bg: '#fff2f0', border: '#ff4d4f', icon: '🌊' },
                      { bg: '#e6fffb', border: '#13c2c2', icon: '🏜️' },
                      { bg: '#fff0f6', border: '#eb2f96', icon: '🌸' },
                      { bg: '#feffe6', border: '#fadb14', icon: '☀️' },
                    ];
                    const color = stateColors[index % stateColors.length];
                    return (
                      <Option
                        key={state}
                        value={state}
                        label={state}
                        style={{
                          background: color.bg,
                          border: `1px solid ${color.border}`,
                          borderRadius: '6px',
                          margin: '4px',
                          fontWeight: 500,
                        }}
                      >
                        <span style={{ color: color.border, marginRight: '8px' }}>{color.icon}</span>
                        {state}
                      </Option>
                    );
                  })}
                </Select>
              </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col xs={24} sm={12}>
              <Form.Item
                name="district"
                label={
                  <span style={{ color: '#1890ff', fontWeight: 600 }}>
                    <EnvironmentOutlined style={{ marginRight: 8 }} />
                    District
                  </span>
                }
                rules={[{ required: true, message: 'Please select a district!' }]}
              >
                <Select
                  placeholder="Choose your district"
                  showSearch
                  optionFilterProp="label"
                  filterOption={(input, option) =>
                    (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                  }
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(24, 144, 255, 0.1)',
                  }}
                  styles={{
                    popup: {
                      root: {
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                        border: '2px solid rgba(24, 144, 255, 0.2)',
                      },
                    },
                  }}
                >
                  {availableDistricts.map((district, index) => {
                    const districtColors = [
                      { bg: '#e6f7ff', border: '#1890ff', icon: '📍' },
                      { bg: '#f6ffed', border: '#52c41a', icon: '🏘️' },
                      { bg: '#fff7e6', border: '#fa8c16', icon: '🏠' },
                    ];
                    const color = districtColors[index % districtColors.length];
                    return (
                      <Option
                        key={district}
                        value={district}
                        label={district}
                        style={{
                          background: color.bg,
                          border: `1px solid ${color.border}`,
                          borderRadius: '6px',
                          margin: '4px',
                          fontWeight: 500,
                        }}
                      >
                        <span style={{ color: color.border, marginRight: '8px' }}>{color.icon}</span>
                        {district}
                      </Option>
                    );
                  })}
                </Select>
              </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
              <Form.Item
                name="predictionDate"
                label={
                  <span>
                    <CalendarOutlined style={{ marginRight: 8 }} />
                    Prediction Date
                  </span>
                }
                rules={[{ required: true, message: 'Please select a date!' }]}
                initialValue={selectedDate}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="Select date for prediction"
                  format="YYYY-MM-DD"
                  showToday={true}
                  disabledDate={(current) => {
                    if (!current) return false;
                    const today = moment().startOf('day');
                    const maxDate = moment().add(1, 'year');
                    return current < today || current > maxDate;
                  }}
                />
              </Form.Item>
                </Col>
              </Row>
              <Form.Item style={{ marginBottom: 0, marginTop: 8, textAlign: 'center' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="middle"
                  loading={predictionLoading}
                  icon={<ThunderboltOutlined />}
                  style={{ 
                    width: '100%', 
                    height: '40px', 
                    fontSize: '14px',
                    background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                    border: 'none',
                    borderRadius: '8px'
                  }}
                >
                  {predictionLoading ? 'Generating Prediction...' : 'Generate Price Prediction'}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Prediction Result */}
        {predictionResult ? (
          <Col xs={24} lg={12}>
            <Card className="prediction-result-card" size="small">
              <Title level={5} style={{ textAlign: 'center', marginBottom: 12, color: '#52c41a' }}>
                <ThunderboltOutlined /> Prediction Result
              </Title>
              
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ fontSize: '36px', color: '#52c41a', marginBottom: '4px' }}>
                  ₹{predictionResult.predictedPrice?.toFixed(2) || 'N/A'}
                </div>
                <Text style={{ fontSize: '14px', color: '#666' }}>per quintal</Text>
                
                <div style={{ marginTop: '12px' }}>
                  <Row gutter={[12, 8]}>
                    <Col span={12}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                          {Math.round((predictionResult.confidenceScore || 0) * 100)}%
                        </div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>Confidence</Text>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#722ed1' }}>
                          {predictionResult.cropName}
                        </div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>Crop</Text>
                      </div>
                    </Col>
                  </Row>
                </div>

                <div style={{ marginTop: '12px', padding: '8px 12px', background: '#f6ffed', borderRadius: '8px', fontSize: '13px' }}>
                  <Text strong style={{ color: '#52c41a' }}>
                    Crop: {predictionResult.cropName || predictionResult.commodity || 'N/A'}
                  </Text>
                  <br />
                  <Text strong style={{ color: '#52c41a' }}>
                    Location: {predictionResult.district || 'All districts'}, {predictionResult.state || 'All India'}
                  </Text>
                  <br />
                  <Text type="secondary">
                    Prediction Date: {moment(predictionResult.predictionDate).format('MMMM DD, YYYY')}
                  </Text>
                  <br />
                  {predictionResult.modelType && (
                    <Text type="success" style={{ fontSize: '12px' }}>
                      ✅ Real ML Prediction using {predictionResult.modelType} model
                    </Text>
                  )}
                </div>

                {predictionResult.priceRange && (
                  <div style={{ marginTop: '8px', padding: '8px 12px', background: '#e6f7ff', borderRadius: '8px' }}>
                    <Text strong style={{ color: '#1890ff', fontSize: '12px' }}>📊 Price Range</Text>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', gap: 8 }}>
                      <div style={{ textAlign: 'center', padding: '4px 8px', background: '#fff2f0', borderRadius: '6px', flex: 1 }}>
                        <Text style={{ fontSize: '11px', color: '#ff4d4f' }}>Min</Text>
                        <br />
                        <Text strong style={{ color: '#ff4d4f', fontSize: '13px' }}>₹{predictionResult.priceRange.min?.toFixed(0)}</Text>
                      </div>
                      <div style={{ textAlign: 'center', padding: '4px 8px', background: '#e6f7ff', borderRadius: '6px', flex: 1 }}>
                        <Text style={{ fontSize: '11px', color: '#1890ff' }}>Predicted</Text>
                        <br />
                        <Text strong style={{ color: '#1890ff', fontSize: '13px' }}>₹{predictionResult.predictedPrice?.toFixed(0)}</Text>
                      </div>
                      <div style={{ textAlign: 'center', padding: '4px 8px', background: '#f6ffed', borderRadius: '6px', flex: 1 }}>
                        <Text style={{ fontSize: '11px', color: '#52c41a' }}>Max</Text>
                        <br />
                        <Text strong style={{ color: '#52c41a', fontSize: '13px' }}>₹{predictionResult.priceRange.max?.toFixed(0)}</Text>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </Col>
        ) : (
          <Col xs={24} lg={12}>
            <Card className="prediction-placeholder-card" size="small">
              <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                <ThunderboltOutlined style={{ fontSize: '36px', color: '#d9d9d9', marginBottom: '8px' }} />
                <Title level={5} style={{ color: '#999', margin: 0 }}>
                  No Prediction Available
                </Title>
                <Text type="secondary" style={{ fontSize: '13px', display: 'block' }}>
                  Generate a prediction by filling out the form and clicking the button
                </Text>
              </div>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default Predictions;
