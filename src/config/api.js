// This file centralizes API configuration for the application

// Base API URL configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://4753-103-197-206-34.ngrok-free.app';

// Helper function to build API paths
export const getApiUrl = (path) => {
  return `${API_BASE_URL}${path}`;
};