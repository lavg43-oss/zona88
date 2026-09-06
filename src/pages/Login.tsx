import { useState } from 'react';
import { School, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (err) {
      setError('Credenciales incorrectas');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 mb-4 drop-shadow-md">
            <img src="/logo.png" alt="Logo Zona Escolar 88" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 text-center">Zona Escolar 88</h2>
          <p className="text-slate-500 text-sm mt-1">Plataforma de Evaluación Diagnóstica y Trimestral</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico de la Escuela</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <School size={18} className="text-slate-400" />
              </div>
              <input
                type="text"
                required
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                placeholder="secundaria1 (Cualquier dato funciona)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-slate-400" />
              </div>
              <input
                type="password"
                required
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando...' : 'Entrar a Plataforma'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-xs text-slate-400">
          Unidad Regional 7 • Monterrey, N.L.
        </div>
      </div>
    </div>
  );
}
