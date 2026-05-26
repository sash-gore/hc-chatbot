import axios from 'axios';
import { supabase } from './supabase';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Agrega el token de Supabase en cada request
const apiClient = axios.create({ baseURL: BASE_URL });

apiClient.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// ─── Dashboard ────────────────────────────────────────────────────────────
export const getDashboardStats = () =>
  apiClient.get('/dashboard/stats').then(r => r.data);

export const getConversations = (params = {}) =>
  apiClient.get('/dashboard/conversations', { params }).then(r => r.data);

export const getConversationDetail = (userId, limit = 50) =>
  apiClient.get(`/dashboard/conversations/${userId}`, { params: { limit } }).then(r => r.data);

// ─── Campaigns ───────────────────────────────────────────────────────────
export const uploadCSV = (fileBase64) =>
  apiClient.post('/campaigns/upload', { file: fileBase64 }).then(r => r.data);

export const getEgresados = (params = {}) =>
  apiClient.get('/campaigns/egresados', { params }).then(r => r.data);

export const sendCampaign = (payload) =>
  apiClient.post('/campaigns/send', payload).then(r => r.data);
