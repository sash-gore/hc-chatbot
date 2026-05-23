'use strict';

const { getConversationHistory } = require('../services/mongodb');

// Patrones para detectar datos personales en el texto
const PATTERNS = [
  { regex: /\b\d{8}\b/g,                                           placeholder: '[DNI]'      },
  { regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/gi, placeholder: '[EMAIL]'    },
  { regex: /\b(\+51|51)?[\s\-]?9\d{8}\b/g,                        placeholder: '[TELEFONO]' },
  { regex: /\bCE[\s\-]?\d{9}\b/gi,                                 placeholder: '[CE]'       },
];

/**
 * Reemplaza datos personales en el texto con placeholders seguros
 * antes de enviarlo a la IA.
 */
const anonymizeText = (text, userId) => {
  let anonymized = text;

  for (const { regex, placeholder } of PATTERNS) {
    const matches = anonymized.match(regex);
    if (matches) {
      console.info(`Datos anonimizados: ${placeholder} x${matches.length}`);
    }
    anonymized = anonymized.replace(regex, placeholder);
  }

  return anonymized;
};

/**
 * Construye el contexto de conversacion para enviar a la Analytics API.
 * Solo incluye los ultimos mensajes — sin datos personales.
 */
const buildContext = async (userId) => {
  const history = await getConversationHistory(userId, 10);

  // El historial ya esta anonimizado porque se guarda despues de anonimizar
  return history.map(({ role, content }) => ({ role, content }));
};

module.exports = { anonymizeText, buildContext };
