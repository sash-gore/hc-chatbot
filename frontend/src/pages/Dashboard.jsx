import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getDashboardStats, getConversations, getConversationDetail } from '../lib/api';

// ─── KPI Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'brand' }) {
  const accent = color === 'action' ? 'border-action-500' : 'border-brand-500';
  return (
    <div className={`bg-white rounded-lg shadow-card p-5 border-l-4 ${accent}`}>
      <p className="text-text-secondary text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-text-primary mt-1">{value ?? '—'}</p>
      {sub && <p className="text-text-secondary text-xs mt-1">{sub}</p>}
    </div>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────
function Badge({ escalated }) {
  return escalated ? (
    <span className="inline-block px-2 py-0.5 rounded-pill bg-red-100 text-red-600 text-xs font-semibold">
      Escalado
    </span>
  ) : (
    <span className="inline-block px-2 py-0.5 rounded-pill bg-green-100 text-green-600 text-xs font-semibold">
      Activo
    </span>
  );
}

// ─── Modal de historial ───────────────────────────────────────────────────────
function ConversationModal({ userId, userName, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConversationDetail(userId)
      .then(data => setHistory(data.history || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-card w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-bold text-text-primary">{userName}</p>
            <p className="text-xs text-text-secondary">Historial de conversación</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-3">
          {loading ? (
            <p className="text-text-secondary text-sm text-center mt-4">Cargando...</p>
          ) : history.length === 0 ? (
            <p className="text-text-secondary text-sm text-center mt-4">Sin mensajes registrados.</p>
          ) : history.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                  msg.role === 'user'
                    ? 'bg-neutral-background text-text-primary'
                    : 'bg-brand-500 text-white'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats]               = useState(null);
  const [conversations, setConversations] = useState([]);
  const [total, setTotal]               = useState(0);
  const [filters, setFilters]           = useState({ escalated: '', search: '', page: 1 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [selected, setSelected]         = useState(null); // { userId, userName }

  // Cargar stats
  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, []);

  // Cargar conversaciones con filtros
  useEffect(() => {
    setLoadingConvs(true);
    const params = { page: filters.page, limit: 10 };
    if (filters.escalated !== '') params.escalated = filters.escalated;
    if (filters.search)          params.search     = filters.search;

    getConversations(params)
      .then(data => {
        setConversations(data.users || []);
        setTotal(data.total || 0);
      })
      .catch(() => setConversations([]))
      .finally(() => setLoadingConvs(false));
  }, [filters]);

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Usuarios totales"
          value={loadingStats ? '...' : stats?.users?.total}
          sub={`${stats?.users?.activeToday ?? 0} activos hoy`}
        />
        <StatCard
          label="Activos (7 días)"
          value={loadingStats ? '...' : stats?.users?.active7d}
          sub="usuarios únicos"
        />
        <StatCard
          label="Mensajes hoy"
          value={loadingStats ? '...' : stats?.messages?.today}
          sub={`${stats?.messages?.total ?? 0} en total`}
          color="action"
        />
        <StatCard
          label="Escalamientos"
          value={loadingStats ? '...' : stats?.escalations?.total}
          sub={`${stats?.escalations?.today ?? 0} hoy`}
          color="action"
        />
      </div>

      {/* Gráfico de actividad */}
      <div className="bg-white rounded-lg shadow-card p-5">
        <p className="font-bold text-text-primary mb-4">Actividad (últimos 30 días)</p>
        {loadingStats ? (
          <p className="text-text-secondary text-sm">Cargando...</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats?.dailyActivity || []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#6B6B6B' }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: '#6B6B6B' }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [v, 'Mensajes']}
                labelFormatter={(l) => `Fecha: ${l}`}
              />
              <Bar dataKey="count" fill="#80109A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tabla de conversaciones */}
      <div className="bg-white rounded-lg shadow-card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <p className="font-bold text-text-primary">Conversaciones</p>
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Buscar nombre o teléfono..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
              className="border border-gray-200 rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <select
              value={filters.escalated}
              onChange={e => setFilters(f => ({ ...f, escalated: e.target.value, page: 1 }))}
              className="border border-gray-200 rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              <option value="">Todos</option>
              <option value="false">Activos</option>
              <option value="true">Escalados</option>
            </select>
          </div>
        </div>

        {loadingConvs ? (
          <p className="text-text-secondary text-sm">Cargando...</p>
        ) : conversations.length === 0 ? (
          <p className="text-text-secondary text-sm">No hay conversaciones.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-text-secondary text-xs uppercase tracking-wide">
                    <th className="pb-2 pr-4">Nombre</th>
                    <th className="pb-2 pr-4">Teléfono</th>
                    <th className="pb-2 pr-4">Estado</th>
                    <th className="pb-2">Última actividad</th>
                  </tr>
                </thead>
                <tbody>
                  {conversations.map(user => (
                    <tr
                      key={user._id}
                      className="border-b border-gray-50 hover:bg-neutral-background cursor-pointer transition"
                      onClick={() => setSelected({ userId: user._id, userName: user.name })}
                    >
                      <td className="py-2.5 pr-4 font-semibold text-text-primary">{user.name}</td>
                      <td className="py-2.5 pr-4 text-text-secondary">{user.phone_number}</td>
                      <td className="py-2.5 pr-4"><Badge escalated={user.escalated} /></td>
                      <td className="py-2.5 text-text-secondary text-xs">
                        {user.updated_at ? new Date(user.updated_at).toLocaleDateString('es-PE') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginacion */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-text-secondary">{total} registros en total</p>
              <div className="flex gap-2">
                <button
                  disabled={filters.page <= 1}
                  onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                  className="px-3 py-1.5 rounded-sm border border-gray-200 text-xs font-semibold text-text-secondary hover:bg-neutral-background disabled:opacity-40 transition"
                >
                  Anterior
                </button>
                <span className="px-3 py-1.5 text-xs text-text-secondary">
                  {filters.page} / {totalPages || 1}
                </span>
                <button
                  disabled={filters.page >= totalPages}
                  onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                  className="px-3 py-1.5 rounded-sm border border-gray-200 text-xs font-semibold text-text-secondary hover:bg-neutral-background disabled:opacity-40 transition"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de historial */}
      {selected && (
        <ConversationModal
          userId={selected.userId}
          userName={selected.userName}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
