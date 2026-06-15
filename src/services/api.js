import axios from 'axios';
import errorMonitor from '../utils/errorMonitor';
import { resolveCommunityMock } from '../mocks/communityMockApi';

// Create an axios instance
// We use a relative path '/api' which Vite will proxy to the backend
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const useCommunityMock = import.meta.env.VITE_USE_COMMUNITY_MOCK === '1';

const isCanceledRequest = (error) =>
  axios.isCancel?.(error) ||
  error?.code === 'ERR_CANCELED' ||
  error?.name === 'CanceledError' ||
  error?.message === 'canceled';

const isErrorReportingRequest = (config) => {
  const url = config?.url || '';
  return typeof url === 'string' && url.includes('/errors');
};

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

    if (isCanceledRequest(error)) {
      return Promise.reject(error);
    }
    
    // Retry logic for network errors or 5xx status codes
    if (!config || !config.retry) {
        config.retry = 0;
    }

    if (!config?.noRetry && config.retry < 3 && (error.message === 'Network Error' || (error.response && error.response.status >= 500))) {
        config.retry += 1;
        const delayRetry = new Promise(resolve => setTimeout(resolve, 1000 * config.retry));
        await delayRetry;
        return api(config);
    }

    // 报告错误到监控系统
    if (!config?.silent && !isErrorReportingRequest(config) && !import.meta.env.DEV) {
      errorMonitor.report(error, {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status
      });
      
      // 开发环境下记录详细错误信息用于调试
      if (process.env.NODE_ENV === 'development') {
        console.error('[API Error]', {
          url: error.config?.url,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
      }
    }
    
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

export const uploadAvatar = (file, crop = {}) => {
  const formData = new FormData();
  formData.append('avatar', file);
  if (crop.crop_x !== undefined) formData.append('crop_x', crop.crop_x);
  if (crop.crop_y !== undefined) formData.append('crop_y', crop.crop_y);
  if (crop.crop_size !== undefined) formData.append('crop_size', crop.crop_size);
  return api.post('/users/me/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const uploadProfileCardCover = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return uploadFile('/upload', formData);
};

export const listIdentityClaims = () => api.get('/users/me/identity-claims');

export const createIdentityClaim = ({ type, displayName, invitationCode }) =>
  api.post('/users/me/identity-claims', {
    type,
    display_name: displayName,
    invitation_code: invitationCode,
  });

export const listOutcomeLinks = (status = 'all') =>
  api.get('/users/me/outcome-links', { params: { status } });

export const updateOutcomeLink = (linkId, action) =>
  api.put(`/users/me/outcome-links/${linkId}`, { action });

export const getProfileCard = (userId) => api.get(`/users/${userId}/profile-card`);

export const updateProfileCard = (payload) => api.put('/users/me/profile-card', payload);

// Project plaza / project cards
export const getProjects = (params = {}) => api.get('/projects', { params });
export const getProject = (id) => api.get(`/projects/${id}`);
export const createProjectCard = (payload) => api.post('/projects', payload);
export const updateProjectCard = (id, payload) => api.put(`/projects/${id}`, payload);
export const deleteProjectCard = (id) => api.delete(`/projects/${id}`);
export const reportProjectCard = (id, reason) => api.post(`/projects/${id}/report`, { reason });
export const toggleProjectFavorite = (id) =>
  api.post('/favorites/toggle', { itemId: id, itemType: 'project' });

if (useCommunityMock) {
  const originalGet = api.get.bind(api);
  const originalPost = api.post.bind(api);
  const originalPut = api.put.bind(api);
  const originalDelete = api.delete.bind(api);

  api.get = (url, config = {}) => {
    const mocked = resolveCommunityMock('get', url, config);
    if (mocked) return Promise.resolve(mocked);
    return originalGet(url, config);
  };

  api.post = (url, data, config = {}) => {
    const mocked = resolveCommunityMock('post', url, data);
    if (mocked) return Promise.resolve(mocked);
    return originalPost(url, data, config);
  };

  api.put = (url, data, config = {}) => {
    const mocked = resolveCommunityMock('put', url, data);
    if (mocked) return Promise.resolve(mocked);
    return originalPut(url, data, config);
  };

  api.delete = (url, config = {}) => {
    const mocked = resolveCommunityMock('delete', url, config?.data || {});
    if (mocked) return Promise.resolve(mocked);
    return originalDelete(url, config);
  };
}

export default api;
export { isCanceledRequest };
