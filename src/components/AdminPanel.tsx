import React, { useState, useEffect } from 'react';
import { PriceSettings, User } from '../types';
import { 
  Settings, 
  Users, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  UserPlus, 
  Edit3, 
  Trash2, 
  AlertTriangle,
  Lock,
  UserCheck,
  UserX,
  RefreshCw,
  Plus,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { adminService } from '../services/apiService';

interface AdminPanelProps {
  token: string;
}

export default function AdminPanel({ token }: AdminPanelProps) {
  // Price states
  const [prices, setPrices] = useState<PriceSettings>({
    extranjero: 10000,
    nacional: 5000,
    residente: 2500,
    minor: 0
  });
  const [priceSuccess, setPriceSuccess] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);

  // User management states
  const [users, setUsers] = useState<User[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);

  // Create user form states
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'cajero'>('cajero');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Edit user state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'cajero'>('cajero');
  const [editActive, setEditActive] = useState(true);
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);

  // Load prices
  const loadPrices = async () => {
    try {
      const data = await adminService.getPrices();
      setPrices(data);
    } catch (err) {
      console.error('Error loading prices:', err);
    }
  };

  // Load users
  const loadUsers = async () => {
    setUserLoading(true);
    try {
      const data = await adminService.getUsers(token);
      setUsers(data);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setUserLoading(false);
    }
  };

  useEffect(() => {
    loadPrices();
    loadUsers();
  }, []);

  const handlePriceSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPriceLoading(true);
    setPriceSuccess(false);

    try {
      const updatedPrices = await adminService.savePrices(token, prices);
      setPrices(updatedPrices);
      setPriceSuccess(true);
      setTimeout(() => setPriceSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPriceLoading(false);
    }
  };

  const handlePriceChange = (category: keyof PriceSettings, value: string) => {
    const num = parseFloat(value);
    setPrices(prev => ({
      ...prev,
      [category]: isNaN(num) ? 0 : num
    }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    setUserSuccess(null);

    const trimmedUsername = newUsername.trim();
    const trimmedName = newName.trim();

    if (!trimmedUsername || !newPassword.trim() || !trimmedName) {
      setUserError('Todos los campos son obligatorios para crear un usuario.');
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20 || !usernameRegex.test(trimmedUsername)) {
      setUserError('El nombre de usuario debe tener entre 3 y 20 caracteres y contener solo letras, números, puntos o guiones bajos.');
      return;
    }

    if (newPassword.length < 6) {
      setUserError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 50) {
      setUserError('El nombre completo debe tener entre 2 y 50 caracteres.');
      return;
    }

    try {
      await adminService.createUser(token, {
        username: trimmedUsername,
        password: newPassword,
        name: trimmedName,
        role: newRole
      });

      setUserSuccess(`¡Usuario "${newName}" creado correctamente!`);
      setNewUsername('');
      setNewPassword('');
      setNewName('');
      setNewRole('cajero');

      loadUsers(); // Refresh list
    } catch (err: any) {
      setUserError(err.message);
    }
  };

  const handleStartEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditActive(user.active);
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setUserError(null);
    setUserSuccess(null);

    const trimmedName = editName.trim();
    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 50) {
      setUserError('El nombre completo debe tener entre 2 y 50 caracteres.');
      return;
    }

    try {
      await adminService.updateUser(token, editingUser.id, {
        name: trimmedName,
        role: editRole,
        active: editActive
      });

      setUserSuccess(`¡Usuario "${editName}" actualizado correctamente!`);
      setEditingUser(null);
      loadUsers(); // Refresh
    } catch (err: any) {
      setUserError(err.message);
    }
  };

  const handleDeactivateUser = (user: User) => {
    setDeactivatingUser(user);
  };

  const executeDeactivateUser = async () => {
    if (!deactivatingUser) return;
    const user = deactivatingUser;
    setDeactivatingUser(null);
    setUserError(null);
    setUserSuccess(null);

    try {
      await adminService.deactivateUser(token, user.id);
      setUserSuccess(`El usuario "${user.name}" fue desactivado exitosamente.`);
      loadUsers();
    } catch (err: any) {
      setUserError(err.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  return (
    <div id="admin_panel_view" className="space-y-8 max-w-6xl mx-auto">
      
      {/* Title */}
      <div className="border-b border-slate-100 pb-4">
        <h2 className="font-display text-2xl font-bold text-slate-800 tracking-tight">Panel de Administración General</h2>
        <p className="text-slate-500 text-sm">Ajuste valores arancelarios y gestione las credenciales del equipo de boletería.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Price Settings (Left - 5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
            <h3 className="font-display font-semibold text-slate-800 text-base flex items-center gap-2 border-b border-slate-50 pb-2">
              <Settings className="w-5 h-5 text-emerald-600" />
              1. Control de Tarifarios ($ ARS)
            </h3>

            <p className="text-xs text-slate-400">
              Modifique los precios de las entradas. Los cambios impactarán en tiempo real en la pantalla de facturación de boletería.
            </p>

            <form onSubmit={handlePriceSave} className="space-y-4">
              {/* Extranjero */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Categoría Extranjero</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 font-medium">$</span>
                  <input
                    type="number"
                    value={prices.extranjero}
                    onChange={(e) => handlePriceChange('extranjero', e.target.value)}
                    data-testid="admin-price-extranjero"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono font-bold"
                    placeholder="10000"
                    min="0"
                  />
                </div>
              </div>

              {/* Nacional */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Categoría Nacional</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 font-medium">$</span>
                  <input
                    type="number"
                    value={prices.nacional}
                    onChange={(e) => handlePriceChange('nacional', e.target.value)}
                    data-testid="admin-price-nacional"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono font-bold"
                    placeholder="5000"
                    min="0"
                  />
                </div>
              </div>

              {/* Residente Chubut */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Categoría Residente Chubut</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 font-medium">$</span>
                  <input
                    type="number"
                    value={prices.residente}
                    onChange={(e) => handlePriceChange('residente', e.target.value)}
                    data-testid="admin-price-residente"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono font-bold"
                    placeholder="2500"
                    min="0"
                  />
                </div>
              </div>

              {/* Jubilado / Menor */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Categoría Menor / Jubilado (Sin Costo)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 font-medium">$</span>
                  <input
                    type="number"
                    value={prices.minor}
                    onChange={(e) => handlePriceChange('minor', e.target.value)}
                    data-testid="admin-price-minor"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono font-bold"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              {priceSuccess && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>¡Valores de boletería actualizados!</span>
                </div>
              )}

              <button
                id="save_prices_btn"
                data-testid="admin-save-prices-btn"
                type="submit"
                disabled={priceLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium rounded-xl text-xs transition-colors shadow-md cursor-pointer flex items-center justify-center gap-1"
              >
                {priceLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Guardar Precios'}
              </button>
            </form>
          </div>
        </div>

        {/* User Management (Right - 7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Alerts */}
          {userError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <span>{userError}</span>
            </div>
          )}
          {userSuccess && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-xl text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
              <span>{userSuccess}</span>
            </div>
          )}

          {/* User Form Box (Modal-like inline state or insert form) */}
          {editingUser ? (
            /* Editing user inline form */
            <form onSubmit={handleSaveEdit} className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 space-y-4 animate-scaleUp">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h3 className="font-display font-semibold text-emerald-400 text-sm flex items-center gap-1.5">
                  <Edit3 className="w-4.5 h-4.5" />
                  Modificar Operador: "{editingUser.username}"
                </h3>
                <button type="button" onClick={handleCancelEdit} data-testid="admin-edit-user-cancel-header" className="text-slate-400 hover:text-white text-xs">
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">Nombre Completo</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    data-testid="admin-edit-user-name"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    placeholder="Ej: Pedro Madryn"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">Rol / Privilegio</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    data-testid="admin-edit-user-role"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="cajero">Cajero / Operador</option>
                    <option value="admin">Administrador General</option>
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-300 block">Estado de la cuenta</label>
                  <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-lg border border-slate-700">
                    <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        checked={editActive === true}
                        onChange={() => setEditActive(true)}
                        data-testid="admin-edit-user-active-true"
                        className="text-emerald-500 focus:ring-0"
                      />
                      <span>Habilitado (Activo)</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        checked={editActive === false}
                        onChange={() => setEditActive(false)}
                        data-testid="admin-edit-user-active-false"
                        className="text-emerald-500 focus:ring-0"
                      />
                      <span>Inhabilitado (De baja)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  data-testid="admin-edit-user-cancel-btn"
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="save_user_edit_btn"
                  type="submit"
                  data-testid="admin-edit-user-save-btn"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          ) : (
            /* Create new user Form */
            <form onSubmit={handleCreateUser} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
              <h3 className="font-display font-semibold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-50 pb-2">
                <UserPlus className="w-4.5 h-4.5 text-emerald-600" />
                2. Crear Nuevo Operador de Boletería
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">Nombre Completo</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    data-testid="admin-create-user-name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">Privilegio</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    data-testid="admin-create-user-role"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="cajero">Cajero / Operador</option>
                    <option value="admin">Administrador General</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">Nombre de Usuario</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    data-testid="admin-create-user-username"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                    placeholder="Ej: jperez"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">Contraseña Inicial</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      data-testid="admin-create-user-password"
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      data-testid="admin-create-user-show-password"
                      className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  id="create_user_submit_btn"
                  data-testid="admin-create-user-submit-btn"
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Habilitar Operador
                </button>
              </div>
            </form>
          )}

          {/* Users List Box */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
            <h3 className="font-display font-semibold text-slate-800 text-sm flex items-center gap-2">
              <Users className="w-4.5 h-4.5 text-slate-500" />
              Operadores Habilitados
            </h3>

            {userLoading ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Cargando listado de usuarios...
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No se encontraron usuarios en la base de datos.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="text-[10px] text-slate-400 uppercase bg-slate-50 border-b border-slate-100 font-bold">
                    <tr>
                      <th className="py-2 px-3">Operador</th>
                      <th className="py-2 px-3">Usuario</th>
                      <th className="py-2 px-3">Privilegio</th>
                      <th className="py-2 px-3 text-center">Estado</th>
                      <th className="py-2 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-700">{u.name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{u.username}</td>
                        <td className="py-2.5 px-3 capitalize">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            u.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {u.role === 'admin' ? 'Administrador' : 'Cajero'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase ${
                            u.active 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-red-50 text-red-700 border border-red-100'
                          }`}>
                            {u.active ? 'Habilitado' : 'De Baja'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleStartEdit(u)}
                              data-testid={`admin-user-list-edit-btn-${u.username}`}
                              className="p-1 text-slate-400 hover:text-emerald-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Editar operador"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {u.active && (
                              <button
                                onClick={() => handleDeactivateUser(u)}
                                data-testid={`admin-user-list-deactivate-btn-${u.username}`}
                                className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Desactivar operador"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Confirmation Modal for deactivating user */}
      {deactivatingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-6 animate-scaleUp">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2 bg-red-50 rounded-xl text-red-500">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-slate-800 text-base">¿Desactivar Operador?</h4>
                <p className="text-[11px] text-slate-400">Desactivar cuenta de operador en el sistema.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              ¿Está seguro de desactivar la cuenta de <span className="font-bold text-slate-800">"{deactivatingUser.name}"</span>? 
              El operador ya no podrá acceder al sistema de boletería ni registrar nuevas transacciones.
            </p>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeactivatingUser(null)}
                data-testid="admin-deactivate-modal-cancel-btn"
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeDeactivateUser}
                data-testid="admin-deactivate-modal-confirm-btn"
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer"
              >
                Desactivar Cuenta
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
