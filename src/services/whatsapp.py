import os
import requests
import logging

logger = logging.getLogger()

WHATSAPP_API_URL = "https://graph.facebook.com/v19.0"


def send_message(phone_number: str, message: str) -> bool:
    """Envia un mensaje de texto al usuario via WhatsApp Cloud API."""
    phone_number_id = os.environ.get("WHATSAPP_PHONE_NUMBER_ID")
    access_token = os.environ.get("WHATSAPP_ACCESS_TOKEN")

    url = f"{WHATSAPP_API_URL}/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phone_number,
        "type": "text",
        "text": {"body": message}
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        logger.info(f"Mensaje enviado a {phone_number}")
        return True
    except requests.RequestException as e:
        logger.error(f"Error enviando mensaje a {phone_number}: {str(e)}")
        return False


def parse_incoming_message(body: dict) -> dict | None:
    """
    Extrae el numero de telefono y el texto del payload de Meta.
    Retorna None si no es un mensaje de texto (ej: notificacion de estado).
    """
    try:
        entry = body["entry"][0]
        changes = entry["changes"][0]
        value = changes["value"]

        # Solo procesar mensajes, ignorar status updates
        if "messages" not in value:
            return None

        message = value["messages"][0]

        # Solo procesar mensajes de texto por ahora
        if message.get("type") != "text":
            logger.info(f"Tipo de mensaje no soportado: {message.get('type')}")
            return None

        phone_number = message["from"]
        text = message["text"]["body"]

        return {
            "phone_number": phone_number,
            "message": text,
            "message_id": message.get("id"),
            "timestamp": message.get("timestamp")
        }

    except (KeyError, IndexError) as e:
        logger.warning(f"No se pudo parsear el mensaje entrante: {str(e)}")
        return None
