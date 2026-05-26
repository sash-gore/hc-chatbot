import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-background flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-card w-full max-w-sm p-8">

        {/* Logo + Powered by */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo-selection.png"
            alt="Selection LATAM"
            className="h-20 w-auto object-contain mb-3"
          />
          <h1 className="text-text-primary font-bold text-xl">HC Dashboard</h1>
          <span className="text-text-secondary text-xs mt-1">Powered by Selection LATAM</span>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@ejemplo.com"
              className="w-full border border-gray-200 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-primary mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-500 transition"
            />
          </div>

          {error && (
            <p className="text-red-500 text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-action-500 hover:bg-action-600 text-white font-semibold text-sm rounded-pill py-2.5 transition disabled:opacity-60"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
