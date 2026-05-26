'use strict';

const { parse } = require('csv-parse/sync');
const { upsertEgresados, getEgresados, logCampaignSend } = require('../services/mongodb');
const { sendTemplateMessage } = require('../services/whatsapp');

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
  body: JSON.stringify(body),
});

// ─────────────────────────────────────────────
// POST /campaigns/upload
// Recibe un CSV en base64 (campo "file") o texto plano (campo "csv")
// Columnas esperadas: phone_number, name, email (opcional), career (opcional),
//                    graduation_year (opcional)
// ─────────────────────────────────────────────
const handleUpload = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');

    let csvContent;
    if (body.file) {
      // CSV enviado como base64 (desde input type=file en el frontend)
      csvContent = Buffer.from(body.file, 'base64').toString('utf-8');
    } else if (body.csv) {
      csvContent = body.csv;
    } else {
      return response(400, { error: 'Se requiere el campo "file" (base64) o "csv" (texto plano)' });
    }

    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (!records.length) {
      return response(400, { error: 'El CSV no contiene filas de datos' });
    }

    // Validar que al menos phone_number y name esten presentes
    const invalid = records.filter(r => !r.phone_number || !r.name);
    if (invalid.length) {
      return response(400, {
        error: `${invalid.length} fila(s) sin phone_number o name. Corrija el archivo y vuelva a cargar.`,
      });
    }

    // Normalizar graduation_year a Number si existe
    records.forEach(r => {
      if (r.graduation_year) r.graduation_year = Number(r.graduation_year);
    });

    const result = await upsertEgresados(records);
    console.info(`Carga completada: ${result.inserted} nuevos, ${result.updated} actualizados`);

    return response(200, {
      status: 'ok',
      inserted: result.inserted,
      updated: result.updated,
      total: records.length,
    });
  } catch (err) {
    console.error('Error en carga de CSV:', err.message);
    return response(500, { error: 'Error procesando el archivo' });
  }
};

// ─────────────────────────────────────────────
// GET /campaigns/egresados
// Lista egresados con filtros para armar el publico de una campana
// Query params: career, graduation_year, search, page, limit
// ─────────────────────────────────────────────
const handleGetEgresados = async (event) => {
  try {
    const filters = event.queryStringParameters || {};
    const result = await getEgresados(filters);
    return response(200, result);
  } catch (err) {
    console.error('Error listando egresados:', err.message);
    return response(500, { error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────
// POST /campaigns/send
// Envia un mensaje masivo usando una plantilla aprobada por Meta
// Body: { templateName, templateLanguage, userIds: [...], params: [...] }
// ─────────────────────────────────────────────
const handleSend = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { templateName, templateLanguage = 'es', userIds, phoneNumbers, params = [] } = body;

    if (!templateName) {
      return response(400, { error: 'templateName es requerido' });
    }

    // Acepta lista directa de numeros o lista de userIds (para obtenerlos de BD)
    const targets = phoneNumbers || [];
    if (!targets.length) {
      return response(400, { error: 'Se requiere phoneNumbers con al menos un destinatario' });
    }

    let sent = 0;
    let failed = 0;
    const errors = [];

    for (const phone of targets) {
      try {
        await sendTemplateMessage(phone, templateName, templateLanguage, params);
        sent++;
      } catch (err) {
        failed++;
        errors.push({ phone, error: err.message });
        console.warn(`Error enviando a ${phone}:`, err.message);
      }
    }

    // Guardar log de la campana
    await logCampaignSend({
      template_name: templateName,
      template_language: templateLanguage,
      total: targets.length,
      sent,
      failed,
      params,
    });

    return response(200, {
      status: 'ok',
      sent,
      failed,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    console.error('Error en envio masivo:', err.message);
    return response(500, { error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────
// Handler principal de Lambda
// ─────────────────────────────────────────────
exports.handler = async (event) => {
  const path   = event.path || '';
  const method = event.httpMethod || '';

  if (method === 'POST' && path === '/campaigns/upload') {
    return handleUpload(event);
  }

  if (method === 'GET' && path === '/campaigns/egresados') {
    return handleGetEgresados(event);
  }

  if (method === 'POST' && path === '/campaigns/send') {
    return handleSend(event);
  }

  return response(404, { error: 'Not found' });
};
