import React, { useState } from 'react';
import { LogIn, KeyRound, User as UserIcon, AlertCircle, Eye, EyeOff } from 'lucide-react';
import LoboMarinoIcon from './LoboMarinoIcon';

interface LoginProps {
  onLoginSuccess: (token: string, user: { id: string; username: string; role: 'admin' | 'cajero'; name: string }) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Recovery Hint states
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryUsername, setRecoveryUsername] = useState('');
  const [recoveryHint, setRecoveryHint] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const handleFetchRecoveryHint = async () => {
    if (!recoveryUsername.trim()) return;
    setRecoveryLoading(true);
    setRecoveryError(null);
    setRecoveryHint(null);

    try {
      const response = await fetch(`/api/auth/recovery-hint/${encodeURIComponent(recoveryUsername.trim())}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener la pista.');
      }
      setRecoveryHint(data.hint);
    } catch (err: any) {
      setRecoveryError(err.message || 'Error de conexión.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor, ingrese usuario y contraseña.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Credenciales inválidas');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login_container" className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
        
        {/* Decorative Brand Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-orange-500 px-6 py-8 text-white text-center relative">
          <div className="absolute top-3 right-3 bg-white/10 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider">
            ANP PUNTA LOMA
          </div>
          <div className="mx-auto bg-white/15 w-16 h-16 rounded-full flex items-center justify-center mb-3 backdrop-blur-sm border border-white/20">
            <LoboMarinoIcon className="w-9 h-9 text-emerald-100" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Acceso al Sistema</h1>
          <p className="text-emerald-100 text-xs mt-1 max-w-xs mx-auto">
            Control de Boletería y Gestión de Ventas Electrónicas • Chubut, Argentina
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 p-3.5 rounded-xl text-sm flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase block">
              Nombre de Usuario
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <UserIcon className="w-5 h-5" />
              </span>
              <input
                id="login_username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="Ej: cajero1 o admin"
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase block">
                Contraseña
              </label>
              <button
                type="button"
                onClick={() => {
                  setRecoveryUsername(username);
                  setShowRecovery(true);
                }}
                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-350 focus:outline-none transition-colors cursor-pointer"
              >
                ¿Olvidó su contraseña?
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <KeyRound className="w-5 h-5" />
              </span>
              <input
                id="login_password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Help Information (Humblest indicator) */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <span className="font-semibold block text-slate-600 dark:text-slate-300">Usuarios por defecto:</span>
            <div className="flex justify-between">
              <span>Admin: <code className="bg-slate-200 dark:bg-slate-700 dark:text-slate-200 px-1 rounded text-[10px]">admin</code> / <code className="bg-slate-200 dark:bg-slate-700 dark:text-slate-200 px-1 rounded text-[10px]">admin123</code></span>
              <span>Cajero: <code className="bg-slate-200 dark:bg-slate-700 dark:text-slate-200 px-1 rounded text-[10px]">cajero1</code> / <code className="bg-slate-200 dark:bg-slate-700 dark:text-slate-200 px-1 rounded text-[10px]">cajero123</code></span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="login_submit_btn"
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium rounded-xl text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Ingresar al Sistema
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Provincia del Chubut • Ministerio de Turismo y Áreas Protegidas
          </p>
        </div>
      </div>

      {/* Recovery Modal */}
      {showRecovery && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-850 space-y-5 animate-scaleUp text-left">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-slate-800 dark:text-slate-100 text-base">Recuperar Contraseña</h4>
                <p className="text-[10px] text-slate-400">Obtenga la pista de recuperación de su cuenta.</p>
              </div>
            </div>

            {recoveryError && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/45 text-red-700 dark:text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{recoveryError}</span>
              </div>
            )}

            {recoveryHint ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-emerald-850 dark:text-emerald-350 p-4 rounded-xl text-xs space-y-2">
                <span className="font-bold block">Pista de recuperación:</span>
                <p className="italic bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30 text-slate-700 dark:text-slate-300">
                  "{recoveryHint}"
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Ingrese su nombre de usuario. Si tiene configurada una pista de recuperación, se la mostraremos para ayudarle a recordar su clave.
                </p>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider block">
                    Nombre de Usuario
                  </label>
                  <input
                    type="text"
                    value={recoveryUsername}
                    onChange={(e) => setRecoveryUsername(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="Ej: cajero1"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowRecovery(false);
                  setRecoveryUsername('');
                  setRecoveryHint(null);
                  setRecoveryError(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Cerrar
              </button>
              {!recoveryHint && (
                <button
                  type="button"
                  onClick={handleFetchRecoveryHint}
                  disabled={recoveryLoading || !recoveryUsername.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {recoveryLoading ? 'Buscando...' : 'Obtener Pista'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
