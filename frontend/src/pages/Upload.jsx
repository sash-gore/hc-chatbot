import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { uploadCSV } from '../lib/api';

const REQUIRED_COLS = ['phone_number', 'name'];
const OPTIONAL_COLS = ['email', 'career', 'graduation_year'];

export default function Upload() {
  const [rows, setRows]           = useState([]);
  const [headers, setHeaders]     = useState([]);
  const [fileName, setFileName]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [dragging, setDragging]   = useState(false);
  const inputRef = useRef();

  const processFile = (file) => {
    setError('');
    setResult(null);
    setRows([]);
    setHeaders([]);
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        const cols = meta.fields || [];
        const missing = REQUIRED_COLS.filter(c => !cols.includes(c));
        if (missing.length) {
          setError(`Faltan columnas requeridas: ${missing.join(', ')}`);
          return;
        }
        setHeaders(cols);
        setRows(data.slice(0, 5)); // preview: primeras 5 filas
      },
      error: () => setError('No se pudo leer el archivo. Verifica que sea un CSV válido.'),
    });
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleUpload = async () => {
    setError('');
    setLoading(true);
    try {
      const file = inputRef.current.files[0];
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result.split(',')[1];
        const data = await uploadCSV(base64);
        setResult(data);
        setRows([]);
        setHeaders([]);
        setFileName('');
        inputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al subir el archivo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Carga de Datos</h1>
        <p className="text-text-secondary text-sm mt-1">
          Sube un archivo CSV con los datos de los egresados. Se insertarán nuevos registros
          y se actualizarán los existentes por número de teléfono.
        </p>
      </div>

      {/* Columnas esperadas */}
      <div className="bg-white rounded-lg shadow-card p-5">
        <p className="font-bold text-text-primary text-sm mb-3">Formato del CSV</p>
        <div className="flex flex-wrap gap-2">
          {REQUIRED_COLS.map(c => (
            <span key={c} className="px-2 py-1 bg-brand-500 text-white text-xs rounded-sm font-semibold">
              {c} *
            </span>
          ))}
          {OPTIONAL_COLS.map(c => (
            <span key={c} className="px-2 py-1 bg-neutral-background text-text-secondary text-xs rounded-sm">
              {c}
            </span>
          ))}
        </div>
        <p className="text-xs text-text-secondary mt-2">* Columnas requeridas</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`bg-white rounded-lg shadow-card border-2 border-dashed cursor-pointer transition p-10 flex flex-col items-center gap-3
          ${dragging ? 'border-brand-500 bg-brand-300/10' : 'border-gray-200 hover:border-brand-300'}`}
      >
        <svg className="w-10 h-10 text-brand-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 5.25 5.25 0 011.001 10.32" />
        </svg>
        {fileName ? (
          <p className="text-sm font-semibold text-brand-500">{fileName}</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-text-primary">Arrastra tu CSV aquí</p>
            <p className="text-xs text-text-secondary">o haz clic para seleccionar</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* Preview */}
      {rows.length > 0 && (
        <div className="bg-white rounded-lg shadow-card p-5">
          <p className="font-bold text-text-primary text-sm mb-3">
            Vista previa (primeras 5 filas)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-text-secondary text-left">
                  {headers.map(h => (
                    <th key={h} className="pb-2 pr-4 font-semibold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {headers.map(h => (
                      <td key={h} className="py-1.5 pr-4 text-text-primary">{row[h] || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Resultado exitoso */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-md px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Carga exitosa — <strong>{result.inserted}</strong> nuevos,{' '}
            <strong>{result.updated}</strong> actualizados ({result.total} total)
          </span>
        </div>
      )}

      {/* Botón de confirmar */}
      {rows.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={loading}
          className="self-start bg-action-500 hover:bg-action-600 text-white font-semibold text-sm rounded-pill px-6 py-2.5 transition disabled:opacity-60"
        >
          {loading ? 'Subiendo...' : 'Confirmar carga'}
        </button>
      )}
    </div>
  );
}
