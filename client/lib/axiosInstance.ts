import axios from 'axios';

interface ClerkSession {
  getToken: () => Promise<string | null>;
}

interface MinimalClerk {
  session?: ClerkSession;
}

declare global {
  interface Window {
    Clerk?: MinimalClerk;
  }
}

const axiosInstance = axios.create({
  baseURL: '', // Empty string means same origin (relative path) for Next.js API routes
});

axiosInstance.interceptors.request.use(
  async (config) => {
    // Try to get token from Clerk if available on window
    if (typeof window !== 'undefined' && window.Clerk) {
      try {
        const token = await window.Clerk.session?.getToken();
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