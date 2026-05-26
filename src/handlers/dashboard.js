'use strict';

const { getDashboardStats, getConversations, getConversationHistory } = require('../services/mongodb');

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
  body: JSON.stringify(body),
});

// ─────────────────────────────────────────────
// GET /dashboard/stats
// Retorna KPIs generales para el panel admin
// ─────────────────────────────────────────────
const handleStats = async () => {
  try {
    const stats = await getDashboardStats();
    return response(200, stats);
  } catch (err) {
    console.error('Error obteniendo stats:', err.message);
    return response(500, { error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────
// GET /dashboard/conversations
// Lista conversaciones con filtros opcionales
// Query params: escalated, dateFrom, dateTo, search, page, limit
// ─────────────────────────────────────────────
const handleConversations = async (event) => {
  try {
    const filters = event.queryStringParameters || {};
    const result = await getConversations(filters);
    return response(200, result);
  } catch (err) {
    console.error('Error listando conversaciones:', err.message);
    return response(500, { error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────
// GET /dashboard/conversations/{userId}
// Retorna el historial completo de un usuario
// Query params: limit (default 50)
// ─────────────────────────────────────────────
const handleConversationDetail = async (event) => {
  try {
    const userId = event.pathParameters?.userId;
    if (!userId) return response(400, { error: 'userId requerido' });

    const limit = Number(event.queryStringParameters?.limit) || 50;
    const history = await getConversationHistory(userId, limit);
    return response(200, { userId, history });
  } catch (err) {
    console.error('Error obteniendo historial:', err.message);
    return response(500, { error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────
// Handler principal de Lambda
// ─────────────────────────────────────────────
exports.handler = async (event) => {
  const path   = event.path || '';
  const method = event.httpMethod || '';

  if (method === 'GET' && path === '/dashboard/stats') {
    return handleStats();
  }

  if (method === 'GET' && path.startsWith('/dashboard/conversations/')) {
    return handleConversationDetail(event);
  }

  if (method === 'GET' && path === '/dashboard/conversations') {
    return handleConversations(event);
  }

  return response(404, { error: 'Not found' });
};
