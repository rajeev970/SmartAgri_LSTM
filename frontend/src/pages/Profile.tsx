import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, Select, message, Tabs, Divider, Row, Col } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, SaveOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

const Profile: React.FC = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const onProfileFinish = async (values: any) => {
    setProfileLoading(true);
    const result = await updateProfile(values);
    setProfileLoading(false);
    
    if (result.success) {
      message.success('Profile updated successfully!');
    }
  };

  const onPasswordFinish = async (values: any) => {
    setPasswordLoading(true);
    const result = await changePassword(values);
    setPasswordLoading(false);
    
    if (result.success) {
      passwordForm.resetFields();
    }
  };

  const tabItems = [
    {
      key: 'profile',
      label: 'Profile Information',
      children: (
        <Card>
          <Form
            form={profileForm}
            layout="vertical"
            onFinish={onProfileFinish}
            initialValues={{
              email: user?.email,
              userType: user?.userType,
              profile: user?.profile
            }}
          >
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Username"
                  name="username"
                  initialValue={user?.username}
                >
                  <Input prefix={<UserOutlined />} disabled />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Email"
                  name="email"
                  rules={[
                    { required: true, message: 'Please input your email!' },
                    { type: 'email', message: 'Please enter a valid email!' }
                  ]}
                >
                  <Input prefix={<MailOutlined />} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="User Type"
                  name="userType"
                  rules={[{ required: true, message: 'Please select your user type!' }]}
                >
                  <Select>
                    <Option value="farmer">Farmer</Option>
                    <Option value="trader">Trader</Option>
                    <Option value="admin">Admin</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider>Personal Information</Divider>

            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="First Name"
                  name={['profile', 'firstName']}
                >
                  <Input placeholder="Enter your first name" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Last Name"
                  name={['profile', 'lastName']}
                >
                  <Input placeholder="Enter your last name" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Phone"
                  name={['profile', 'phone']}
                >
                  <Input prefix={<PhoneOutlined />} placeholder="Enter your phone number" />
                </Form.Item>
              </Col>
            </Row>

            <Divider>Address Information</Divider>

            <Row gutter={[16, 0]}>
              <Col xs={24} sm={8}>
                <Form.Item
                  label="State"
                  name={['profile', 'address', 'state']}
                >
                  <Input placeholder="Enter your state" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  label="District"
                  name={['profile', 'address', 'district']}
                >
                  <Input placeholder="Enter your district" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  label="Village"
                  name={['profile', 'address', 'village']}
                >
                  <Input placeholder="Enter your village" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={profileLoading}
                icon={<SaveOutlined />}
              >
                Update Profile
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'password',
      label: 'Change Password',
      children: (
        <Card>
          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={onPasswordFinish}
          >
            <Form.Item
              label="Current Password"
              name="currentPassword"
              rules={[{ required: true, message: 'Please input your current password!' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter your current password"
              />
            </Form.Item>

            <Form.Item
              label="New Password"
              name="newPassword"
              rules={[
                { required: true, message: 'Please input your new password!' },
                { min: 6, message: 'Password must be at least 6 characters!' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter your new password"
              />
            </Form.Item>

            <Form.Item
              label="Confirm New Password"
              name="confirmPassword"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: 'Please confirm your new password!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match!'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Confirm your new password"
              />
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={passwordLoading}
                icon={<LockOutlined />}
              >
                Change Password
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>Profile Settings</Title>
        <Text type="secondary">
          Manage your account information and preferences
        </Text>
      </div>

      <Card>
        <Tabs defaultActiveKey="profile" items={tabItems} />
      </Card>
    </div>
  );
};

export default Profile;
