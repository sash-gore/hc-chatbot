import { useState, useEffect, useCallback } from 'react';
import { getEgresados, sendCampaign } from '../lib/api';

// Plantillas de ejemplo — reemplazar con las aprobadas por Meta
const TEMPLATES = [
  { name: 'bienvenida_egresado',     label: 'Bienvenida a egresados',         language: 'es', params: [] },
  { name: 'recordatorio_evento',     label: 'Recordatorio de evento',         language: 'es', params: ['nombre_evento', 'fecha'] },
  { name: 'oferta_laboral',          label: 'Nueva oferta laboral',           language: 'es', params: ['cargo', 'empresa'] },
  { name: 'encuesta_satisfaccion',   label: 'Encuesta de satisfacción',       language: 'es', params: [] },
];

export default function Campaigns() {
  const [egresados, setEgresados]   = useState([]);
  const [totalEg, setTotalEg]       = useState(0);
  const [filters, setFilters]       = useState({ search: '', career: '', graduation_year: '', page: 1 });
  const [loadingEg, setLoadingEg]   = useState(false);

  const [selected, setSelected]     = useState([]); // ids seleccionados
  const [selectAll, setSelectAll]   = useState(false);

  const [template, setTemplate]     = useState(TEMPLATES[0]);
  const [paramValues, setParamValues] = useState({});

  const [sending, setSending]       = useState(false);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState('');
  const [confirm, setConfirm]       = useState(false);

  const totalPages = Math.ceil(totalEg / 20);

  const loadEgresados = useCallback(() => {
    setLoadingEg(true);
    const params = { page: filters.page, limit: 20 };
    if (filters.search)          params.search          = filters.search;
    if (filters.career)          params.career          = filters.career;
    if (filters.graduation_year) params.graduation_year = filters.graduation_year;

    getEgresados(params)
      .then(data => {
        setEgresados(data.users || []);
        setTotalEg(data.total || 0);
      })
      .catch(() => setEgresados([]))
      .finally(() => setLoadingEg(false));
  }, [filters]);

  useEffect(() => { loadEgresados(); }, [loadEgresados]);

  // Al cambiar de plantilla, resetear valores de parámetros
  useEffect(() => {
    const t = TEMPLATES.find(t => t.name === template.name);
    setTemplate(t);
    setParamValues({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.name]);

  const toggleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelected([]);
      setSelectAll(false);
    } else {
      setSelected(egresados.map(e => e.phone_number));
      setSelectAll(true);
    }
  };

  const handleSend = async () => {
    setError('');
    setSending(true);
    setConfirm(false);
    try {
      const params = template.params.map(p => paramValues[p] || '');
      const data = await sendCampaign({
        templateName: template.name,
        templateLanguage: template.language,
        phoneNumbers: selected,
        params,
      });
      setResult(data);
      setSelected([]);
      setSelectAll(false);
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al enviar la campaña.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Envíos Masivos</h1>
        <p className="text-text-secondary text-sm mt-1">
          Filtra egresados, elige una plantilla aprobada por Meta y envía la campaña.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Columna izquierda: filtros + tabla ─── */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Filtros */}
          <div className="bg-white rounded-lg shadow-card p-4 flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Buscar nombre o teléfono..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
              className="border border-gray-200 rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 flex-1 min-w-40"
            />
            <input
              type="text"
              placeholder="Carrera"
              value={filters.career}
              onChange={e => setFilters(f => ({ ...f, career: e.target.value, page: 1 }))}
              className="border border-gray-200 rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 w-36"
            />
            <input
              type="number"
              placeholder="Año egreso"
              value={filters.graduation_year}
              onChange={e => setFilters(f => ({ ...f, graduation_year: e.target.value, page: 1 }))}
              className="border border-gray-200 rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 w-28"
            />
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-lg shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-text-primary text-sm">
                Egresados <span className="text-text-secondary font-normal">({totalEg} total)</span>
              </p>
              {selected.length > 0 && (
                <span className="text-xs font-semibold text-brand-500">
                  {selected.length} seleccionado(s)
                </span>
              )}
            </div>

            {loadingEg ? (
              <p className="text-text-secondary text-sm">Cargando...</p>
            ) : egresados.length === 0 ? (
              <p className="text-text-secondary text-sm">No hay egresados. Carga un CSV primero.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-text-secondary text-xs uppercase tracking-wide">
                        <th className="pb-2 pr-3">
                          <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={handleSelectAll}
                            className="accent-brand-500"
                          />
                        </th>
                        <th className="pb-2 pr-4">Nombre</th>
                        <th className="pb-2 pr-4">Teléfono</th>
                        <th className="pb-2 pr-4">Carrera</th>
                        <th className="pb-2">Año</th>
                      </tr>
                    </thead>
                    <tbody>
                      {egresados.map(eg => (
                        <tr
                          key={eg._id}
                          className="border-b border-gray-50 hover:bg-neutral-background cursor-pointer transition"
                          onClick={() => toggleSelect(eg.phone_number)}
                        >
                          <td className="py-2 pr-3">
                            <input
                              type="checkbox"
                              checked={selected.includes(eg.phone_number)}
                              onChange={() => toggleSelect(eg.phone_number)}
                              onClick={e => e.stopPropagation()}
                              className="accent-brand-500"
                            />
                          </td>
                          <td className="py-2 pr-4 font-semibold text-text-primary">{eg.name}</td>
                          <td className="py-2 pr-4 text-text-secondary">{eg.phone_number}</td>
                          <td className="py-2 pr-4 text-text-secondary">{eg.career || '—'}</td>
                          <td className="py-2 text-text-secondary">{eg.graduation_year || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginación */}
                <div className="flex items-center justify-end gap-2 mt-3">
                  <button
                    disabled={filters.page <= 1}
                    onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                    className="px-3 py-1.5 rounded-sm border border-gray-200 text-xs font-semibold text-text-secondary hover:bg-neutral-background disabled:opacity-40 transition"
                  >
                    Anterior
                  </button>
                  <span className="text-xs text-text-secondary">
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
              </>
            )}
          </div>
        </div>

        {/* ─── Columna derecha: configurar envío ─── */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-lg shadow-card p-5 flex flex-col gap-4">
            <p className="font-bold text-text-primary text-sm">Configurar envío</p>

            {/* Selector de plantilla */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1 uppercase tracking-wide">
                Plantilla Meta
              </label>
              <select
                value={template.name}
                onChange={e => setTemplate(TEMPLATES.find(t => t.name === e.target.value))}
                className="w-full border border-gray-200 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                {TEMPLATES.map(t => (
                  <option key={t.name} value={t.name}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Parámetros dinámicos de la plantilla */}
            {template.params.length > 0 && (
              <div className="flex flex-col gap-2">
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Parámetros
                </label>
                {template.params.map(param => (
                  <div key={param}>
                    <label className="text-xs text-text-secondary mb-0.5 block">{param}</label>
                    <input
                      type="text"
                      value={paramValues[param] || ''}
                      onChange={e => setParamValues(v => ({ ...v, [param]: e.target.value }))}
                      placeholder={param}
                      className="w-full border border-gray-200 rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Resumen */}
            <div className="bg-neutral-background rounded-md p-3 text-xs text-text-secondary">
              <p><span className="font-semibold text-text-primary">{selected.length}</span> destinatarios seleccionados</p>
              <p className="mt-0.5">Plantilla: <span className="font-semibold text-text-primary">{template.label}</span></p>
            </div>

            {/* Error / Resultado */}
            {error && (
              <p className="text-red-500 text-xs">{error}</p>
            )}
            {result && (
              <div className="bg-green-50 border border-green-200 rounded-md px-3 py-2 text-xs text-green-700">
                ✓ Enviado: <strong>{result.sent}</strong> exitosos
                {result.failed > 0 && `, ${result.failed} fallidos`}
              </div>
            )}

            {/* Botón enviar */}
            <button
              disabled={selected.length === 0 || sending}
              onClick={() => setConfirm(true)}
              className="w-full bg-action-500 hover:bg-action-600 text-white font-semibold text-sm rounded-pill py-2.5 transition disabled:opacity-50"
            >
              {sending ? 'Enviando...' : `Enviar a ${selected.length} egresado(s)`}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmación */}
      {confirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-card w-full max-w-sm p-6 flex flex-col gap-4">
            <p className="font-bold text-text-primary text-lg">¿Confirmar envío?</p>
            <p className="text-text-secondary text-sm">
              Se enviará la plantilla <strong>{template.label}</strong> a{' '}
              <strong>{selected.length}</strong> destinatario(s). Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(false)}
                className="flex-1 border border-gray-200 text-text-secondary text-sm font-semibold rounded-pill py-2 hover:bg-neutral-background transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSend}
                className="flex-1 bg-action-500 hover:bg-action-600 text-white text-sm font-semibold rounded-pill py-2 transition"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
