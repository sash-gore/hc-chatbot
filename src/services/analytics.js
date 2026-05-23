'use strict';

const axios = require('axios');

// ─────────────────────────────────────────────
// Cliente para la Analytics API
// (modulo GPT+WhatsApp desarrollado por el reemplazo de Waldo)
//
// NOTA: Esta es una integracion pendiente. Los parametros exactos
// del request/response deben coordinarse cuando el modulo este listo.
// Por ahora se asume la siguiente interfaz como placeholder.
// ─────────────────────────────────────────────

const FALLBACK_RESPONSE =
  'En este momento no puedo procesar tu consulta. ' +
  "Por favor intenta nuevamente en unos minutos o escribe 'agente' " +
  'para ser atendido por una persona.';

/**
 * Envia el mensaje anonimizado a la Analytics API y retorna la respuesta del GPT.
 *
 * @param {string} userId   - ID unico del egresado (nunca datos personales reales)
 * @param {string} message  - Texto del usuario ya anonimizado
 * @param {Array}  context  - Historial reciente de la conversacion
 * @returns {Promise<string>} Respuesta de texto generada por GPT
 */
const callAnalyticsApi = async (userId, message, context) => {
  const apiUrl = process.env.ANALYTICS_API_URL;
  const apiKey = process.env.ANALYTICS_API_KEY;

  if (!apiUrl) {
    console.error('ANALYTICS_API_URL no configurada');
    return FALLBACK_RESPONSE;
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  const payload = {
    user_id: userId,
    message,
    context,
    // TODO: ajustar payload segun especificacion del modulo de Waldo
  };

  try {
    const res = await axios.post(`${apiUrl}/chat`, payload, {
      headers,
      timeout: 25000,
    });
    // TODO: ajustar key de respuesta segun especificacion del modulo
    return res.data.response || FALLBACK_RESPONSE;
  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      console.error('Timeout al llamar a Analytics API');
    } else {
      console.error('Error llamando a Analytics API:', err.message);
    }
    return FALLBACK_RESPONSE;
  }
};

module.exports = { callAnalyticsApi };
