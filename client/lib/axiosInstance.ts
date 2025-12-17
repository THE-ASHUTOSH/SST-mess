import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: '', // Empty string means same origin (relative path) for Next.js API routes
});

axiosInstance.interceptors.request.use(
  async (config) => {
    // Try to get token from Clerk if available on window
    if (typeof window !== 'undefined' && (window as any).Clerk) {
      try {
        const token = await (window as any).Clerk.session?.getToken();
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (e) {
        console.error("Error getting Clerk token in axios interceptor", e);
      }
    }

    config.withCredentials = true;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
