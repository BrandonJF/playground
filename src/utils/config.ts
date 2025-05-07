/**
 * Application configuration
 * Central place to manage environment-specific settings
 */

// Server configuration
export const API_CONFIG = {
  // Base URL for API endpoints - works in both development and Docker environments
  baseUrl: process.env.NODE_ENV === 'production' 
    ? '/api' // In production/Docker, nginx routes /api to the server
    : 'http://localhost:3001/api', // In local development
  
  // API endpoints
  endpoints: {
    submitSpice: '/spices/submit',
    submissions: '/submissions',
    spices: '/spices',
    saveInventory: '/inventory/save',
    loadInventory: '/inventory'
  }
};

// Get a full API URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.baseUrl}${endpoint}`;
};