// This file centralizes API configuration for the application

// Use environment variable with fallback
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://a590-202-181-7-69.ngrok-free.app';

// Helper function to build API paths
export const getApiUrl = (path) => {
  return `${API_BASE_URL}${path}`;
};