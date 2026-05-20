import logging
from src.services.whatsapp import send_message

logger = logging.getLogger()

# Palabras clave que disparan el escalamiento a agente humano
_ESCALATION_KEYWORDS = [
    "agente",
    "humano",
    "persona",
    "asesor",
    "hablar con alguien",
    "no entiendo",
    "necesito ayuda",
    "urgente",
    "reclamo",
    "queja",
]

# Numero de intentos fallidos antes de escalar automaticamente
MAX_FAILED_ATTEMPTS = 3


def should_escalate(message: str, user: dict) -> bool:
    """
    Determina si la conversacion debe derivarse a un agente humano.

    Criterios:
    1. El usuario lo solicita explicitamente con palabras clave
    2. El usuario ha tenido demasiados intentos fallidos
    3. El usuario ya fue marcado para escalamiento
    """
    # Ya fue escalado previamente
    if user.get("escalated"):
        return True

    # Solicitud explicita del usuario
    message_lower = message.lower()
    for keyword in _ESCALATION_KEYWORDS:
        if keyword in message_lower:
            logger.info(f"Escalamiento por keyword: '{keyword}'")
            return True

    # Demasiados intentos fallidos consecutivos
    failed_attempts = user.get("failed_attempts", 0)
    if failed_attempts >= MAX_FAILED_ATTEMPTS:
        logger.info(f"Escalamiento por intentos fallidos: {failed_attempts}")
        return True

    return False


def send_escalation_alert(phone_number: str, user_id: str) -> None:
    """
    Notifica al usuario que fue derivado y registra el escalamiento.
    Aqui se podria integrar una notificacion interna al equipo (email, Slack, etc.)
    """
    logger.info(f"Alerta de escalamiento para usuario {user_id} - {phone_number}")

    # TODO: Agregar notificacion interna al equipo de soporte
    # (email, webhook interno, etc.) segun definicion institucional
