'use strict';

// Palabras clave que disparan el escalamiento a agente humano
const ESCALATION_KEYWORDS = [
  'agente',
  'humano',
  'persona',
  'asesor',
  'hablar con alguien',
  'no entiendo',
  'necesito ayuda',
  'urgente',
  'reclamo',
  'queja',
];

// Numero de intentos fallidos antes de escalar automaticamente
const MAX_FAILED_ATTEMPTS = 3;

/**
 * Determina si la conversacion debe derivarse a un agente humano.
 *
 * Criterios:
 * 1. El usuario lo solicita explicitamente con palabras clave
 * 2. El usuario ha tenido demasiados intentos fallidos
 * 3. El usuario ya fue marcado para escalamiento
 */
const shouldEscalate = (message, user) => {
  // Ya fue escalado previamente
  if (user.escalated) return true;

  // Solicitud explicita del usuario
  const lower = message.toLowerCase();
  for (const keyword of ESCALATION_KEYWORDS) {
    if (lower.includes(keyword)) {
      console.info(`Escalamiento por keyword: '${keyword}'`);
      return true;
    }
  }

  // Demasiados intentos fallidos consecutivos
  const failedAttempts = user.failed_attempts || 0;
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    console.info(`Escalamiento por intentos fallidos: ${failedAttempts}`);
    return true;
  }

  return false;
};

/**
 * Notifica al usuario que fue derivado y registra el escalamiento.
 * Aqui se podria integrar una notificacion interna al equipo (email, Slack, etc.)
 */
const sendEscalationAlert = async (phoneNumber, userId) => {
  console.info(`Alerta de escalamiento para usuario ${userId} - ${phoneNumber}`);

  // TODO: Agregar notificacion interna al equipo de soporte
  // (email, webhook interno, etc.) segun definicion institucional
};

module.exports = { shouldEscalate, sendEscalationAlert };
