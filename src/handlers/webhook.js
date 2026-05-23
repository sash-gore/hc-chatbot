'use strict';

const { parseIncomingMessage, sendMessage } = require('../services/whatsapp');
const { getUser, saveUser, saveMessage } = require('../services/mongodb');
const { callAnalyticsApi } = require('../services/analytics');
const { anonymizeText, buildContext } = require('../utils/anonymizer');
const { shouldEscalate, sendEscalationAlert } = require('../utils/escalation');

const response = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// ─────────────────────────────────────────────
// GET: Verificacion del webhook con Meta
// ─────────────────────────────────────────────
const verifyWebhook = (event) => {
  const params = event.queryStringParameters || {};
  const mode      = params['hub.mode'];
  const token     = params['hub.verify_token'];
  const challenge = params['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.info('Webhook verificado correctamente');
    return { statusCode: 200, body: challenge };
  }

  console.warn('Fallo en verificacion del webhook');
  return response(403, { error: 'Forbidden' });
};

// ─────────────────────────────────────────────
// POST: Procesamiento del mensaje entrante
// ─────────────────────────────────────────────
const processMessage = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    console.info('Mensaje recibido:', JSON.stringify(body));

    // 1. Parsear el mensaje de WhatsApp
    const parsed = parseIncomingMessage(body);
    if (!parsed) {
      // Puede ser una notificacion de estado, ignorar
      return response(200, { status: 'ignored' });
    }

    const { phoneNumber, message: userMessage } = parsed;

    // 2. Obtener o crear usuario en MongoDB
    let user = await getUser(phoneNumber);
    if (!user) {
      user = await saveUser(phoneNumber);
    }

    const userId   = user._id.toString();
    const userName = user.name || 'Usuario';

    // 3. Guardar mensaje del usuario
    await saveMessage(userId, 'user', userMessage);

    // 4. Anonimizar: reemplaza datos personales por el user_id
    const anonymizedMessage = anonymizeText(userMessage, userId);
    const context = await buildContext(userId);

    // 5. Verificar si se debe escalar a agente humano
    if (shouldEscalate(userMessage, user)) {
      console.info(`Escalando usuario ${userId} a agente humano`);
      await sendEscalationAlert(phoneNumber, userId);
      const reply = 'Tu consulta ha sido derivada a un agente. En breve te contactaremos.';
      await sendMessage(phoneNumber, reply);
      await saveMessage(userId, 'assistant', reply);
      return response(200, { status: 'escalated' });
    }

    // 6. Llamar a la Analytics API (GPT via modulo externo)
    const aiResponse = await callAnalyticsApi(userId, anonymizedMessage, context);

    // 7. Personalizar respuesta con el nombre real del egresado
    const personalizedResponse = aiResponse.replace(/\[NOMBRE\]/g, userName);

    // 8. Guardar respuesta y enviar por WhatsApp
    await saveMessage(userId, 'assistant', personalizedResponse);
    await sendMessage(phoneNumber, personalizedResponse);

    return response(200, { status: 'ok' });

  } catch (err) {
    console.error('Error procesando mensaje:', err.message);
    return response(500, { error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────
// Handler principal de Lambda
// ─────────────────────────────────────────────
exports.handler = async (event, context) => {
  const method = event.httpMethod || '';

  if (method === 'GET')  return verifyWebhook(event);
  if (method === 'POST') return await processMessage(event);
  return response(405, { error: 'Method not allowed' });
};
