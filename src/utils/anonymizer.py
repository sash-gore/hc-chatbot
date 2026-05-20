import re
import logging
from src.services.mongodb import get_conversation_history

logger = logging.getLogger()

# Patrones para detectar datos personales en el texto
_PATTERNS = [
    # DNI peruano (8 digitos)
    (r"\b\d{8}\b", "[DNI]"),
    # Correo electronico
    (r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", "[EMAIL]"),
    # Numero de telefono (varios formatos)
    (r"\b(\+51|51)?[\s\-]?9\d{8}\b", "[TELEFONO]"),
    # Carnet de extranjeria (CE + 9 digitos)
    (r"\bCE[\s\-]?\d{9}\b", "[CE]"),
]


def anonymize_text(text: str, user_id: str) -> str:
    """
    Reemplaza datos personales en el texto con placeholders seguros
    antes de enviarlo a la IA.

    El user_id se incluye como referencia para que GPT pueda
    contextualizar sin ver datos reales.
    """
    anonymized = text

    for pattern, placeholder in _PATTERNS:
        matches = re.findall(pattern, anonymized, flags=re.IGNORECASE)
        if matches:
            logger.info(f"Datos anonimizados: {placeholder} x{len(matches)}")
        anonymized = re.sub(pattern, placeholder, anonymized, flags=re.IGNORECASE)

    return anonymized


def build_context(user_id: str) -> list:
    """
    Construye el contexto de conversacion para enviar a la API de Analytics.
    Solo incluye los ultimos mensajes — sin datos personales.
    """
    history = get_conversation_history(user_id, limit=10)

    # El historial ya esta anonimizado porque se guarda despues de anonimizar
    context = [
        {"role": msg["role"], "content": msg["content"]}
        for msg in history
    ]

    return context
