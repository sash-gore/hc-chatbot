import json
import os
import logging

from src.services.whatsapp import parse_incoming_message, send_message
from src.services.mongodb import get_user, save_user, save_message
from src.services.analytics import call_analytics_api
from src.utils.anonymizer import anonymize_text, build_context
from src.utils.escalation import should_escalate, send_escalation_alert

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    http_method = event.get("httpMethod", "")

    if http_method == "GET":
        return _verify_webhook(event)
    elif http_method == "POST":
        return _process_message(event)
    else:
        return _response(405, {"error": "Method not allowed"})


# ─────────────────────────────────────────────
# GET: Verificación del webhook con Meta
# ─────────────────────────────────────────────
def _verify_webhook(event):
    params = event.get("queryStringParameters") or {}
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    verify_token = os.environ.get("WHATSAPP_VERIFY_TOKEN")

    if mode == "subscribe" and token == verify_token:
        logger.info("Webhook verificado correctamente")
        return {
            "statusCode": 200,
            "body": challenge
        }

    logger.warning("Fallo en verificacion del webhook")
    return _response(403, {"error": "Forbidden"})


# ─────────────────────────────────────────────
# POST: Procesamiento del mensaje entrante
# ─────────────────────────────────────────────
def _process_message(event):
    try:
        body = json.loads(event.get("body", "{}"))
        logger.info(f"Mensaje recibido: {json.dumps(body)}")

        # 1. Parsear el mensaje de WhatsApp
        parsed = parse_incoming_message(body)
        if not parsed:
            # Puede ser una notificacion de estado, ignorar
            return _response(200, {"status": "ignored"})

        phone_number = parsed["phone_number"]
        user_message = parsed["message"]

        # 2. Obtener o crear usuario en MongoDB
        user = get_user(phone_number)
        if not user:
            user = save_user(phone_number)

        user_id = str(user["_id"])
        user_name = user.get("name", "Usuario")

        # 3. Guardar mensaje del usuario
        save_message(user_id, role="user", content=user_message)

        # 4. Anonimizar: reemplaza datos personales por el user_id
        anonymized_message = anonymize_text(user_message, user_id)
        context = build_context(user_id)

        # 5. Verificar si se debe escalar a agente humano
        if should_escalate(user_message, user):
            logger.info(f"Escalando usuario {user_id} a agente humano")
            send_escalation_alert(phone_number, user_id)
            reply = "Tu consulta ha sido derivada a un agente. En breve te contactaremos."
            send_message(phone_number, reply)
            save_message(user_id, role="assistant", content=reply)
            return _response(200, {"status": "escalated"})

        # 6. Llamar a la Analytics API (GPT via modulo externo)
        ai_response = call_analytics_api(
            user_id=user_id,
            message=anonymized_message,
            context=context
        )

        # 7. Personalizar respuesta con el nombre real del egresado
        personalized_response = ai_response.replace("[NOMBRE]", user_name)

        # 8. Guardar respuesta y enviar por WhatsApp
        save_message(user_id, role="assistant", content=personalized_response)
        send_message(phone_number, personalized_response)

        return _response(200, {"status": "ok"})

    except Exception as e:
        logger.error(f"Error procesando mensaje: {str(e)}")
        return _response(500, {"error": "Internal server error"})


def _response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body)
    }
