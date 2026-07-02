import React, { useState } from 'react';
import { User, Lock, Save, HelpCircle, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import UserAvatar, { AVATAR_MAP } from './UserAvatar';

interface UserProfileProps {
  token: string | null;
  user: {
    id: string;
    username: string;
    role: 'admin' | 'cajero';
    name: string;
    avatar?: string;
    recoveryHint?: string;
  } | null;
  onProfileUpdate: (updatedUser: {
    id: string;
    username: string;
    role: 'admin' | 'cajero';
    name: string;
    avatar?: string;
    recoveryHint?: string;
  }) => void;
}

export default function UserProfile({ token, user, onProfileUpdate }: UserProfileProps) {
  if (!user) return null;

  // Form states
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatar || 'lobo');
  const [recoveryHint, setRecoveryHint] = useState(user.recoveryHint || '');
  
  // Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Visual UI states
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Recovery Hint Modal / View Toggle
  const [showRecoveryHintHelper, setShowRecoveryHintHelper] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validations
    if (!name.trim()) {
      setError('El nombre no puede estar vacío.');
      setLoading(false);
      return;
    }

    if (newPassword) {
      if (!currentPassword) {
        setError('Debe ingresar su contraseña actual para establecer una nueva.');
        setLoading(false);
        return;
      }
      if (newPassword.length < 6) {
        setError('La nueva contraseña debe tener al menos 6 caracteres.');
        setLoading(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('La nueva contraseña y su confirmación no coinciden.');
        setLoading(false);
        return;
      }
    }

    try {
      const body: any = {
        name,
        avatar,
        recoveryHint
      };

      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }

      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar el perfil.');
      }

      // Success! Update parent app state
      onProfileUpdate(data.user);
      
      // Clean password inputs
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setSuccess('Perfil actualizado con éxito.');
    } catch (err: any) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="user_profile_view" className="space-y-6 max-w-4xl mx-auto">
      
      {/* Title Section */}
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <h2 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Mi Perfil</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Administre su información personal, elija su avatar de fauna y configure sus opciones de seguridad.</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 p-4 rounded-2xl text-sm flex items-start gap-3 animate-fadeIn">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400 p-4 rounded-2xl text-sm flex items-start gap-3 animate-fadeIn">
          <Check className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Avatar Display & Selector */}
        <div className="md:col-span-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 flex flex-col items-center space-y-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider self-start">Vista Previa</h3>
          
          <div className="flex flex-col items-center text-center">
            <UserAvatar avatar={avatar} name={name} size="lg" className="hover:scale-100" />
            <h4 className="font-display font-bold text-slate-800 dark:text-slate-100 text-lg mt-4">{name || 'Operador'}</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 capitalize mt-1">
              {user.role === 'admin' ? 'Administrador' : 'Cajero / Operador'}
            </p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-2 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/40">
              @{user.username}
            </p>
          </div>

          <div className="w-full border-t border-slate-100 dark:border-slate-800 pt-4">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 tracking-wide uppercase">Seleccione su Avatar Animal</h4>
            <div className="grid grid-cols-3 gap-3">
              {Object.keys(AVATAR_MAP).map((key) => {
                const isSelected = avatar === key;
                const config = AVATAR_MAP[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAvatar(key)}
                    className={`flex flex-col items-center p-2 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-slate-200'
                    }`}
                  >
                    <span className="text-2xl mb-1 select-none">{config.emoji}</span>
                    <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 text-center leading-none truncate w-full">
                      {config.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: General Info and Security fields */}
        <div className="md:col-span-2 space-y-6">
          
          {/* General Information card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-150 dark:border-slate-800">
              <User className="w-4 h-4" />
              Datos Generales
            </h3>

            {/* Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase block">
                Nombre Completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="Ingrese su nombre completo"
              />
              <p className="text-[10px] text-slate-400">Este nombre aparecerá impreso en las entradas emitidas en su turno.</p>
            </div>

            {/* Username display (read only) */}
            <div className="space-y-1.5 opacity-70">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase block">
                Nombre de Usuario
              </label>
              <input
                type="text"
                value={user.username}
                disabled
                className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-400">El nombre de usuario es único y no puede ser modificado.</p>
            </div>
          </div>

          {/* Security and password card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-150 dark:border-slate-800">
              <Lock className="w-4 h-4" />
              Seguridad y Contraseña
            </h3>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase block">
                  Contraseña Actual
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={loading}
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="Solo si desea cambiarla"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase block">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase block">
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="Repita la nueva contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Recovery Hint section */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase flex items-center gap-1">
                  Pista de Recuperación
                  <button 
                    type="button" 
                    onClick={() => setShowRecoveryHintHelper(!showRecoveryHintHelper)}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 cursor-pointer" />
                  </button>
                </label>
              </div>

              {showRecoveryHintHelper && (
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-emerald-850 dark:text-emerald-300 p-3.5 rounded-xl text-xs space-y-1.5 animate-fadeIn">
                  <p className="font-semibold flex items-center gap-1.5">
                    ¿Qué es la Pista de Recuperación?
                  </p>
                  <p className="leading-relaxed">
                    Si olvida su contraseña, podrá ver esta pista desde la pantalla de login haciendo clic en <strong>"Olvidé mi contraseña"</strong>. 
                    Configure algo que le ayude a recordar pero que no sea obvio para terceros (ej: <em>"Marca de mi primer auto + 123"</em>).
                  </p>
                </div>
              )}

              <input
                type="text"
                value={recoveryHint}
                onChange={(e) => setRecoveryHint(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="Ej: Año de fundación de Punta Loma + color de mi mascota"
              />
            </div>
          </div>

          {/* Action button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 h-4 border-2 border-white border-t-transparent" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>

        </div>

      </form>
      
    </div>
  );
}
