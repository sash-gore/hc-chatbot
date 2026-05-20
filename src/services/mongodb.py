import os
import logging
from datetime import datetime, timezone
from pymongo import MongoClient
from bson.objectid import ObjectId

logger = logging.getLogger()

_client = None
_db = None


def _get_db():
    """Conexion lazy a MongoDB Atlas (reutiliza la conexion entre invocaciones Lambda)."""
    global _client, _db
    if _db is None:
        uri = os.environ.get("MONGODB_URI")
        db_name = os.environ.get("MONGODB_DB_NAME", "hc_chatbot")
        _client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        _db = _client[db_name]
        logger.info("Conexion a MongoDB establecida")
    return _db


# ─────────────────────────────────────────────
# Usuarios
# ─────────────────────────────────────────────

def get_user(phone_number: str) -> dict | None:
    """Busca un egresado por numero de telefono."""
    db = _get_db()
    return db.users.find_one({"phone_number": phone_number})


def save_user(phone_number: str, name: str = None) -> dict:
    """Crea un nuevo usuario si no existe."""
    db = _get_db()
    user = {
        "phone_number": phone_number,
        "name": name or "Usuario",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "consented_at": None,        # fecha de consentimiento informado
        "data_validated": False,     # numero validado
        "active": True
    }
    result = db.users.insert_one(user)
    user["_id"] = result.inserted_id
    logger.info(f"Nuevo usuario creado: {phone_number}")
    return user


def update_user(user_id: str, data: dict) -> bool:
    """Actualiza datos basicos del egresado."""
    db = _get_db()
    data["updated_at"] = datetime.now(timezone.utc)
    result = db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": data}
    )
    return result.modified_count > 0


# ─────────────────────────────────────────────
# Mensajes / Historial de conversacion
# ─────────────────────────────────────────────

def save_message(user_id: str, role: str, content: str) -> str:
    """
    Guarda un mensaje en el historial de la conversacion.
    role: 'user' | 'assistant' | 'system'
    """
    db = _get_db()
    message = {
        "user_id": user_id,
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc)
    }
    result = db.messages.insert_one(message)
    return str(result.inserted_id)


def get_conversation_history(user_id: str, limit: int = 10) -> list:
    """Retorna los ultimos N mensajes del usuario para dar contexto al GPT."""
    db = _get_db()
    messages = list(
        db.messages.find(
            {"user_id": user_id},
            {"_id": 0, "role": 1, "content": 1}
        )
        .sort("timestamp", -1)
        .limit(limit)
    )
    # Retornar en orden cronologico
    return list(reversed(messages))
