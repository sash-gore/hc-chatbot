import os
import requests
import logging

logger = logging.getLogger()

# ─────────────────────────────────────────────
# Cliente para la Analytics API
# (modulo GPT+WhatsApp desarrollado por el reemplazo de Waldo)
#
# NOTA: Esta es una integracion pendiente. Los parametros exactos
# del request/response deben coordinarse cuando el modulo este listo.
# Por ahora se asume la siguiente interfaz como placeholder.
# ─────────────────────────────────────────────

def call_analytics_api(user_id: str, message: str, context: list) -> str:
    """
    Envia el mensaje anonimizado a la Analytics API y retorna la respuesta del GPT.

    Args:
        user_id: ID unico del egresado (nunca datos personales reales)
        message: Texto del usuario ya anonimizado
        context: Historial reciente de la conversacion

    Returns:
        Respuesta de texto generada por GPT
    """
    api_url = os.environ.get("ANALYTICS_API_URL")
    api_key = os.environ.get("ANALYTICS_API_KEY")

    if not api_url:
        logger.error("ANALYTICS_API_URL no configurada")
        return _fallback_response()

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    payload = {
        "user_id": user_id,
        "message": message,
        "context": context
        # TODO: ajustar payload segun especificacion del modulo de Waldo
    }

    try:
        response = requests.post(
            f"{api_url}/chat",
            json=payload,
            headers=headers,
            timeout=25
        )
        response.raise_for_status()
        data = response.json()

        # TODO: ajustar key de respuesta segun especificacion del modulo
        return data.get("response", _fallback_response())

    except requests.Timeout:
        logger.error("Timeout al llamar a Analytics API")
        return _fallback_response()
    except requests.RequestException as e:
        logger.error(f"Error llamando a Analytics API: {str(e)}")
        return _fallback_response()


def _fallback_response() -> str:
    """Respuesta de emergencia cuando la API no esta disponible."""
    return (
        "En este momento no puedo procesar tu consulta. "
        "Por favor intenta nuevamente en unos minutos o escribe 'agente' "
        "para ser atendido por una persona."
    )
