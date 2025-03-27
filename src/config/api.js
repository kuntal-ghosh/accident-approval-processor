// This file centralizes API configuration for the application

// Base API URL configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://f2aa-2404-1c40-39b-fbd8-51bd-21c4-7c8b-1696.ngrok-free.app';

// Helper function to build API paths
export const getApiUrl = (path) => {
  return `${API_BASE_URL}${path}`;
};