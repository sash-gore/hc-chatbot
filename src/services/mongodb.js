'use strict';

const { MongoClient, ObjectId } = require('mongodb');

// Conexion lazy reutilizada entre invocaciones Lambda
let client = null;
let db = null;

const getDb = async () => {
  if (!db) {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME || 'hc_chatbot';
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    db = client.db(dbName);
    console.info('Conexion a MongoDB establecida');
  }
  return db;
};

// ─────────────────────────────────────────────
// Usuarios
// ─────────────────────────────────────────────

/**
 * Busca un egresado por numero de telefono.
 */
const getUser = async (phoneNumber) => {
  const database = await getDb();
  return database.collection('users').findOne({ phone_number: phoneNumber });
};

/**
 * Crea un nuevo usuario si no existe.
 */
const saveUser = async (phoneNumber, name = null) => {
  const database = await getDb();
  const now = new Date();
  const user = {
    phone_number: phoneNumber,
    name: name || 'Usuario',
    created_at: now,
    updated_at: now,
    consented_at: null,     // fecha de consentimiento informado
    data_validated: false,  // numero validado
    active: true,
  };
  const result = await database.collection('users').insertOne(user);
  user._id = result.insertedId;
  console.info(`Nuevo usuario creado: ${phoneNumber}`);
  return user;
};

/**
 * Actualiza datos basicos del egresado.
 */
const updateUser = async (userId, data) => {
  const database = await getDb();
  data.updated_at = new Date();
  const result = await database.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    { $set: data }
  );
  return result.modifiedCount > 0;
};

// ─────────────────────────────────────────────
// Mensajes / Historial de conversacion
// ─────────────────────────────────────────────

/**
 * Guarda un mensaje en el historial de la conversacion.
 * role: 'user' | 'assistant' | 'system'
 */
const saveMessage = async (userId, role, content) => {
  const database = await getDb();
  const message = {
    user_id: userId,
    role,
    content,
    timestamp: new Date(),
  };
  const result = await database.collection('messages').insertOne(message);
  return result.insertedId.toString();
};

/**
 * Retorna los ultimos N mensajes del usuario para dar contexto al GPT.
 */
const getConversationHistory = async (userId, limit = 10) => {
  const database = await getDb();
  const messages = await database
    .collection('messages')
    .find({ user_id: userId }, { projection: { _id: 0, role: 1, content: 1 } })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
  // Retornar en orden cronologico
  return messages.reverse();
};

module.exports = { getUser, saveUser, updateUser, saveMessage, getConversationHistory };
