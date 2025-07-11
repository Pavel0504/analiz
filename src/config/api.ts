// API configuration for different environments
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// Use environment variable if available, otherwise fallback to ngrok URL for production
export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (isDevelopment 
    ? 'http://localhost:3001' 
    : 'https://c3f333bb7206.ngrok-free.app'
  );

console.log('API Base URL:', API_BASE_URL);