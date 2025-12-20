import axios from 'axios';

// Create an axios instance
// We use a relative path '/api' which Vite will proxy to the backend
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and retry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    // Retry logic for network errors or 5xx status codes
    if (!config || !config.retry) {
        config.retry = 0;
    }

    if (config.retry < 3 && (error.message === 'Network Error' || (error.response && error.response.status >= 500))) {
        config.retry += 1;
        const delayRetry = new Promise(resolve => setTimeout(resolve, 1000 * config.retry));
        await delayRetry;
        return api(config);
    }

    console.error('API Error:', error.response ? error.response.data : error.message);
    return Promise.reject(error);
  }
);

// SWR fetcher
export const fetcher = (url) => api.get(url).then((res) => res.data);

// Upload helper (for multipart/form-data)
export const uploadFile = (endpoint, formData) => {
    return api.post(endpoint, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

export default api;