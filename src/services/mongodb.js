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

// ─────────────────────────────────────────────
// Dashboard: stats y conversaciones
// ─────────────────────────────────────────────

/**
 * Retorna KPIs agregados para el panel de administracion.
 * Incluye totales de usuarios, mensajes, escalamientos y actividad reciente.
 */
const getDashboardStats = async () => {
  const database = await getDb();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOf7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const startOf30Days = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsersToday,
    activeUsers7d,
    totalMessages,
    messagesToday,
    totalEscalated,
    escalatedToday,
  ] = await Promise.all([
    database.collection('users').countDocuments({ active: true }),
    database.collection('messages').distinct('user_id', { timestamp: { $gte: startOfToday } }).then(a => a.length),
    database.collection('messages').distinct('user_id', { timestamp: { $gte: startOf7Days } }).then(a => a.length),
    database.collection('messages').countDocuments(),
    database.collection('messages').countDocuments({ timestamp: { $gte: startOfToday } }),
    database.collection('users').countDocuments({ escalated: true }),
    database.collection('users').countDocuments({ escalated: true, updated_at: { $gte: startOfToday } }),
  ]);

  // Mensajes por dia en los ultimos 30 dias (para grafico de barras)
  const dailyActivity = await database.collection('messages').aggregate([
    { $match: { timestamp: { $gte: startOf30Days } } },
    { $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
      count: { $sum: 1 },
    }},
    { $sort: { _id: 1 } },
  ]).toArray();

  return {
    users: { total: totalUsers, activeToday: activeUsersToday, active7d: activeUsers7d },
    messages: { total: totalMessages, today: messagesToday },
    escalations: { total: totalEscalated, today: escalatedToday },
    dailyActivity,
  };
};

/**
 * Lista conversaciones con filtros opcionales.
 * Soporta: escalated, dateFrom, dateTo, search (nombre/telefono), page, limit
 */
const getConversations = async (filters = {}) => {
  const database = await getDb();
  const { escalated, dateFrom, dateTo, search, page = 1, limit = 20 } = filters;

  const query = {};
  if (typeof escalated !== 'undefined') query.escalated = escalated === 'true' || escalated === true;
  if (dateFrom || dateTo) {
    query.updated_at = {};
    if (dateFrom) query.updated_at.$gte = new Date(dateFrom);
    if (dateTo)   query.updated_at.$lte = new Date(dateTo);
  }
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone_number: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    database.collection('users')
      .find(query)
      .sort({ updated_at: -1 })
      .skip(skip)
      .limit(Number(limit))
      .toArray(),
    database.collection('users').countDocuments(query),
  ]);

  return { users, total, page: Number(page), limit: Number(limit) };
};

// ─────────────────────────────────────────────
// Egresados: carga y consulta
// ─────────────────────────────────────────────

/**
 * Inserta o actualiza un lote de egresados cargados desde CSV/Excel.
 * Usa el telefono como clave de upsert.
 * records: Array<{ phone_number, name, email?, career?, graduation_year?, ... }>
 */
const upsertEgresados = async (records) => {
  const database = await getDb();
  const now = new Date();
  const ops = records.map((r) => ({
    updateOne: {
      filter: { phone_number: r.phone_number },
      update: {
        $set: { ...r, updated_at: now },
        $setOnInsert: { created_at: now, active: true, data_validated: false },
      },
      upsert: true,
    },
  }));
  const result = await database.collection('users').bulkWrite(ops, { ordered: false });
  console.info(`Egresados upsert — insertados: ${result.upsertedCount}, actualizados: ${result.modifiedCount}`);
  return { inserted: result.upsertedCount, updated: result.modifiedCount };
};

/**
 * Lista egresados con filtros opcionales para la pantalla de envios masivos.
 * Soporta: career, graduation_year, search, page, limit
 */
const getEgresados = async (filters = {}) => {
  const database = await getDb();
  const { career, graduation_year, search, page = 1, limit = 50 } = filters;

  const query = { active: true };
  if (career) query.career = { $regex: career, $options: 'i' };
  if (graduation_year) query.graduation_year = Number(graduation_year);
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone_number: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    database.collection('users')
      .find(query, { projection: { _id: 1, phone_number: 1, name: 1, career: 1, graduation_year: 1 } })
      .sort({ name: 1 })
      .skip(skip)
      .limit(Number(limit))
      .toArray(),
    database.collection('users').countDocuments(query),
  ]);

  return { users, total, page: Number(page), limit: Number(limit) };
};

/**
 * Registra el log de un envio masivo (campaña).
 */
const logCampaignSend = async (campaignData) => {
  const database = await getDb();
  const record = {
    ...campaignData,
    sent_at: new Date(),
  };
  const result = await database.collection('campaigns').insertOne(record);
  return result.insertedId.toString();
};

module.exports = {
  getUser, saveUser, updateUser, saveMessage, getConversationHistory,
  getDashboardStats, getConversations,
  upsertEgresados, getEgresados, logCampaignSend,
};
