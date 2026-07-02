import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import CajaManager from './components/CajaManager';
import TicketVenta from './components/TicketVenta';
import TicketValidador from './components/TicketValidador';
import Reports from './components/Reports';
import AdminPanel from './components/AdminPanel';
import { Caja } from './types';
import { 
  LogOut, 
  ShoppingBag, 
  Unlock, 
  Scan, 
  BarChart3, 
  Settings, 
  User as UserIcon,
  Compass,
  Sun,
  Moon
} from 'lucide-react';
import LoboMarinoIcon from './components/LoboMarinoIcon';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; username: string; role: 'admin' | 'cajero'; name: string } | null>(null);
  const [openCaja, setOpenCaja] = useState<Caja | null>(null);
  const [activeTab, setActiveTab] = useState<string>('venta');
  const [appLoading, setAppLoading] = useState(true);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // Apply dark class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Restore session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('pl_token');
    const savedUser = localStorage.getItem('pl_user');

    if (savedToken && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setToken(savedToken);
      setUser(parsedUser);
      checkCajaStatus(savedToken, parsedUser.id);
    } else {
      setAppLoading(false);
    }
  }, []);

  const checkCajaStatus = async (authToken: string, userId: string) => {
    try {
      const response = await fetch('/api/caja/status', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await response.json();
      if (response.ok && data.openCaja) {
        setOpenCaja(data.openCaja);
        // If they have an active open caja, default to POS selling page
        setActiveTab('venta');
      } else {
        setOpenCaja(null);
        // If they don't have an active open caja, direct them to turn management first
        setActiveTab('caja');
      }
    } catch (err) {
      console.error('Error checking caja status:', err);
    } finally {
      setAppLoading(false);
    }
  };

  const handleLoginSuccess = (newToken: string, loggedUser: { id: string; username: string; role: 'admin' | 'cajero'; name: string }) => {
    setToken(newToken);
    setUser(loggedUser);
    localStorage.setItem('pl_token', newToken);
    localStorage.setItem('pl_user', JSON.stringify(loggedUser));
    
    // Check if user already has an active caja opened
    checkCajaStatus(newToken, loggedUser.id);
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error('Logout request error:', err);
      }
    }

    setToken(null);
    setUser(null);
    setOpenCaja(null);
    localStorage.removeItem('pl_token');
    localStorage.removeItem('pl_user');
  };

  const handleCajaChange = (caja: Caja | null) => {
    setOpenCaja(caja);
    if (caja) {
      // Automatically switch to selling tab on box opening
      setActiveTab('venta');
    }
  };

  if (appLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <Compass className="w-12 h-12 text-emerald-600 dark:text-emerald-400 animate-spin" />
        <span className="text-slate-500 dark:text-slate-400 font-medium text-sm font-display">Iniciando Boletería Punta Loma...</span>
      </div>
    );
  }

  // Render Login page if not authenticated
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between">
        <div className="flex-1 flex items-center justify-center">
          <Login onLoginSuccess={handleLoginSuccess} />
        </div>
        <footer className="bg-slate-100 dark:bg-slate-900 py-4 text-center border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            ANP Punta Loma - Sistema de Control y Boletería Digital • Puerto Madryn, Chubut, Argentina
          </p>
        </footer>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  // Main application view
  return (
    <div className="flex h-screen w-full bg-slate-100 dark:bg-slate-950 overflow-hidden font-sans text-slate-700 dark:text-slate-200">
      
      {/* SIDEBAR - HIDDEN IN PRINT */}
      <aside className="w-60 bg-emerald-950 dark:bg-slate-900 text-emerald-50 flex flex-col shrink-0 border-r border-emerald-900/40 dark:border-slate-800/40 noprint">
        {/* Brand Header */}
        <div className="p-5 border-b border-emerald-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-600/90 text-white p-1.5 rounded-lg shadow-sm">
              <LoboMarinoIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-white text-sm leading-tight tracking-tight uppercase">
                ANP Punta Loma
              </h1>
              <p className="text-[9px] text-emerald-300 font-semibold tracking-wider uppercase opacity-80">
                Acceso y Control
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Tabs */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {/* Sell Ticket tab */}
          <button
            onClick={() => setActiveTab('venta')}
            className={`w-full px-5 py-2.5 text-left text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer border-l-4 ${
              activeTab === 'venta'
                ? 'bg-emerald-900/60 border-emerald-400 text-white font-bold'
                : 'border-transparent text-emerald-100/70 hover:bg-emerald-900/30 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Terminal de Ventas</span>
          </button>

          {/* Shift management tab */}
          <button
            onClick={() => setActiveTab('caja')}
            className={`w-full px-5 py-2.5 text-left text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer border-l-4 relative ${
              activeTab === 'caja'
                ? 'bg-emerald-900/60 border-emerald-400 text-white font-bold'
                : 'border-transparent text-emerald-100/70 hover:bg-emerald-900/30 hover:text-white'
            }`}
          >
            <Unlock className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Control de Caja / Turno</span>
            {openCaja && (
              <span className="absolute right-4 w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            )}
          </button>

          {/* Validation gate check-in tab */}
          <button
            onClick={() => setActiveTab('validador')}
            className={`w-full px-5 py-2.5 text-left text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer border-l-4 ${
              activeTab === 'validador'
                ? 'bg-emerald-900/60 border-emerald-400 text-white font-bold'
                : 'border-transparent text-emerald-100/70 hover:bg-emerald-900/30 hover:text-white'
            }`}
          >
            <Scan className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Validar Accesos</span>
          </button>

          {/* Reports tab */}
          <button
            onClick={() => setActiveTab('reportes')}
            className={`w-full px-5 py-2.5 text-left text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer border-l-4 ${
              activeTab === 'reportes'
                ? 'bg-emerald-900/60 border-emerald-400 text-white font-bold'
                : 'border-transparent text-emerald-100/70 hover:bg-emerald-900/30 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Estadísticas y Reportes</span>
          </button>

          {/* Admin only pricing & user panel tab */}
          {user.role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`w-full px-5 py-2.5 text-left text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer border-l-4 ${
                activeTab === 'admin'
                  ? 'bg-emerald-900/60 border-emerald-400 text-white font-bold'
                  : 'border-transparent text-emerald-100/70 hover:bg-emerald-900/30 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Ajustes Panel Admin</span>
            </button>
          )}
        </nav>

        {/* Profile and Logout area */}
        <div className="p-4 bg-emerald-950/60 border-t border-emerald-900/60 shrink-0 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center italic uppercase shrink-0">
              {user.name ? user.name.slice(0, 2).toUpperCase() : 'OP'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-emerald-400/80 truncate font-semibold tracking-wide">
                {openCaja ? `Caja Activa #${openCaja.id.substring(0, 4)}` : 'Sin Turno Abierto'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-1.5 text-[10px] border border-emerald-800 text-emerald-200 hover:text-white hover:bg-emerald-900/50 rounded transition-colors uppercase font-bold tracking-widest flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* MAIN WORKSPACE - HEIGHT AND WIDTH ADJUSTED TO FULL WINDOW WITH SCROLL IN COMPONENT VIEW */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* HEADER STATS BAR - HIGH DENSITY SPECS */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 noprint z-10">
          {/* Header statistics info */}
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider leading-none">Total Recaudado (Turno)</span>
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 leading-tight mt-1">
                {openCaja ? formatCurrency(openCaja.currentSales) : '$0,00'}
              </span>
            </div>
            <div className="h-8 border-r border-slate-200 dark:border-slate-800"></div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider leading-none">Entradas Emitidas</span>
              <span className="text-xl font-black text-slate-700 dark:text-slate-300 leading-tight mt-1">
                {openCaja ? openCaja.salesCount : '0'}
              </span>
            </div>
          </div>

          {/* Active status elements */}
          <div className="flex items-center gap-4">
            {/* Elegant Mode Toggle */}
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center border border-transparent hover:border-slate-200 dark:hover:border-slate-750"
              title={darkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Nocturno"}
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-full text-emerald-700 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-wide">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Boletería Online
            </div>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-tight">
              {new Date().toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </header>

        {/* WORKSPACE AREA */}
        <main className="flex-1 overflow-y-auto p-5 scroll-smooth bg-slate-100 dark:bg-slate-950">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'venta' && (
              <TicketVenta 
                token={token} 
                openCaja={openCaja} 
                onNavigateToCaja={() => setActiveTab('caja')} 
              />
            )}

            {activeTab === 'caja' && (
              <CajaManager 
                token={token} 
                user={user} 
                openCaja={openCaja} 
                onCajaChange={handleCajaChange} 
              />
            )}

            {activeTab === 'validador' && (
              <TicketValidador token={token} />
            )}

            {activeTab === 'reportes' && (
              <Reports token={token} />
            )}

            {activeTab === 'admin' && user.role === 'admin' && (
              <AdminPanel token={token} />
            )}
          </div>
        </main>

        {/* FOOTER STATUS BAR - HIGH DENSITY STYLE */}
        <footer className="h-8 bg-slate-200 dark:bg-slate-900 border-t border-slate-300 dark:border-slate-800 px-6 flex items-center justify-between text-[10px] font-medium text-slate-500 dark:text-slate-400 shrink-0 noprint">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              SISTEMA ONLINE
            </span>
            <span>IP: 192.168.1.104</span>
            <span className="opacity-75">Boletería Digital Punta Loma v2.4</span>
          </div>
          <div className="uppercase tracking-tight text-[9px] font-bold">
            &copy; {new Date().getFullYear()} Ministerio de Turismo y Áreas Protegidas - Chubut
          </div>
        </footer>

      </div>
    </div>
  );
}
