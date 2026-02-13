import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Tabs } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    const result = await login(values);
    setLoading(false);
    
    if (result.success) {
      navigate('/');
    }
  };

  return (
    <div className="login-container">
      <Card className="login-form">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ color: '#52c41a', marginBottom: 8 }}>
            🌱 SmartAgri
          </Title>
          <Text type="secondary">
            Crop Price Prediction System
          </Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: 'Please input your username or email!' }
            ]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="Username or Email" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Please input your password!' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              style={{ width: '100%', height: 40 }}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Text type="secondary">
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#52c41a' }}>
              Sign up here
            </Link>
          </Text>
        </div>

        <div style={{ 
          marginTop: 24, 
          padding: 16, 
          background: '#f6ffed', 
          border: '1px solid #b7eb8f', 
          borderRadius: 6,
          textAlign: 'center'
        }}>
          <Text strong style={{ color: '#52c41a', display: 'block', marginBottom: 8 }}>
            🚀 Demo Mode Available!
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Use these credentials to test the app without backend:
            <br />
            <strong>Username:</strong> demo
            <br />
            <strong>Password:</strong> demo
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default Login;
