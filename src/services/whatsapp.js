'use strict';

const axios = require('axios');

const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0';

/**
 * Envia un mensaje de texto al usuario via WhatsApp Cloud API.
 */
const sendMessage = async (phoneNumber, message) => {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phoneNumber,
    type: 'text',
    text: { body: message },
  };

  try {
    await axios.post(url, payload, { headers, timeout: 10000 });
    console.info(`Mensaje enviado a ${phoneNumber}`);
    return true;
  } catch (err) {
    console.error(`Error enviando mensaje a ${phoneNumber}:`, err.message);
    return false;
  }
};

/**
 * Extrae el numero de telefono y el texto del payload de Meta.
 * Retorna null si no es un mensaje de texto (ej: notificacion de estado).
 */
const parseIncomingMessage = (body) => {
  try {
    const entry = body.entry[0];
    const value = entry.changes[0].value;

    // Solo procesar mensajes, ignorar status updates
    if (!value.messages) return null;

    const message = value.messages[0];

    // Solo procesar mensajes de texto por ahora
    if (message.type !== 'text') {
      console.info(`Tipo de mensaje no soportado: ${message.type}`);
      return null;
    }

    return {
      phoneNumber: message.from,
      message: message.text.body,
      messageId: message.id,
      timestamp: message.timestamp,
    };
  } catch (err) {
    console.warn('No se pudo parsear el mensaje entrante:', err.message);
    return null;
  }
};

/**
 * Envia un mensaje usando una plantilla aprobada por Meta (para envios masivos).
 * params: Array de strings con los valores de los parametros de la plantilla.
 *
 * Ejemplo de plantilla con 1 parametro:
 *   templateName: 'recordatorio_evento'
 *   params: ['Nombre del evento']
 */
const sendTemplateMessage = async (phoneNumber, templateName, templateLanguage = 'es', params = []) => {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const components = params.length
    ? [{
        type: 'body',
        parameters: params.map(p => ({ type: 'text', text: String(p) })),
      }]
    : [];

  const payload = {
    messaging_product: 'whatsapp',
    to: phoneNumber,
    type: 'template',
    template: {
      name: templateName,
      language: { code: templateLanguage },
      components,
    },
  };

  try {
    await axios.post(url, payload, { headers, timeout: 10000 });
    console.info(`Plantilla '${templateName}' enviada a ${phoneNumber}`);
    return true;
  } catch (err) {
    const detail = err.response?.data?.error?.message || err.message;
    console.error(`Error enviando plantilla a ${phoneNumber}:`, detail);
    throw new Error(detail);
  }
};

module.exports = { sendMessage, parseIncomingMessage, sendTemplateMessage };
