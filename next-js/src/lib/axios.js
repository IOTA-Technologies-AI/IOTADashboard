import axios from 'axios';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

// Prefer same-origin for client calls so Next.js API proxies avoid CORS; fall back to configured host on server.
const normalizeHost = (url) =>
  (url || 'https://staging-iotaapiserver-s572.encr.app')
    .replace(/\/supabaseservices\/?$/, '')
    .replace(/\/$/, '');

const apiHost = normalizeHost(CONFIG.serverUrl);

// Client: same-origin for /api/* proxies to avoid CORS; Server: use configured host.
const baseURL = typeof window === 'undefined' ? apiHost : '';

const axiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    apikey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZianRwbHlmdnJuZ3Z0cXd5ZHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTA3NDMsImV4cCI6MjA3NTQyNjc0M30.Jmj8g7US9gKA5vnbKuPmH9bsSRPX2JGLm_6zfSk45Sg',
  },
});

// * Optional: Add token (if using auth)
//
axiosInstance.interceptors.request.use(
  (config) => {
    // ✅ Check if we're in a browser environment
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      // Try to get token from sessionStorage (for JWT auth)
      const token = sessionStorage.getItem('accessToken'); // Or your JWT_STORAGE_KEY

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // ✅ For server-side rendering / build time, check if already set
    // (This allows SSR functions to set headers manually if needed)
    if (!config.headers.Authorization) {
      // Optional: Remove the Authorization header if not set
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error?.response?.data?.msg;
    const message =
      error?.response?.data?.message || msg || error?.message || 'Something went wrong!';
    console.error('Axios error:', message);
    return Promise.reject(new Error(message));
  }
);

export default axiosInstance;

// ----------------------------------------------------------------------

export const fetcher = async (args) => {
  try {
    const [url, config] = Array.isArray(args) ? args : [args, {}];

    const res = await axiosInstance.get(url, config);

    return res.data;
  } catch (error) {
    console.error('Fetcher failed:', error);
    throw error;
  }
};

// ----------------------------------------------------------------------

export const endpoints = {
  chat: '/api/chat',
  kanban: '/sales/board',
  todo: {
    board: '/api/todo/board',
    stages: '/api/todo/stages',
    tasks: '/api/todo/tasks',
    subtasks: '/api/todo/subtasks',
    reminders: '/api/todo/reminders',
    comments: '/api/todo/comments',
  },
  sales: {
    board: '/api/sales/board',
    stages: '/api/sales/stages',
    deals: '/api/sales/deals',
  },
  apollo: {
    peopleSearch: '/api/apollo/people-search',
    peopleEnrich: '/api/apollo/people-enrich',
    saveContact: '/api/apollo/save-contact',
    savedContacts: '/api/apollo/saved-contacts',
  },
  calendar: '/api/calendar',
  auth: {
    me: 'https://vbjtplyfvrngvtqwydum.supabase.co/rest/v1/user?select=*&loginId=eq.',
    signIn: 'https://vbjtplyfvrngvtqwydum.supabase.co/auth/v1/token?grant_type=password',
    signUp: '/api/auth/sign-up',
  },
  mail: {
    list: '/api/mail/list',
    details: '/api/mail/details',
    labels: '/api/mail/labels',
  },
  post: {
    list: '/api/post/list',
    details: '/api/post/details',
    latest: '/api/post/latest',
    search: '/api/post/search',
  },
  product: {
    list: '/api/product/list',
    details: '/api/product/details',
    search: '/api/product/search',
  },
};
