/**
 * Application configuration
 * Central place to manage environment-specific settings
 */

// Server configuration
export const API_CONFIG = {
  // Base URL for API endpoints
  baseUrl: process.env.NODE_ENV === 'production' 
    ? '/api' // In production, use relative path
    : 'http://localhost:3001/api', // In development, use full URL with port
  
  // API endpoints
  endpoints: {
    submitSpice: '/spices/submit',
    submissions: '/submissions',
    spices: '/spices'
  }
};

// Get a full API URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.baseUrl}${endpoint}`;
};