import React, { useState, useEffect } from 'react';
import { Caja } from '../types';
import { 
  Lock, 
  Unlock, 
  Calendar, 
  DollarSign, 
  Ticket, 
  User as UserIcon, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Clock
} from 'lucide-react';

interface CajaManagerProps {
  token: string;
  user: { id: string; username: string; role: 'admin' | 'cajero'; name: string };
  openCaja: Caja | null;
  onCajaChange: (caja: Caja | null) => void;
}

export default function CajaManager({ token, user, openCaja, onCajaChange }: CajaManagerProps) {
  const [initialBalance, setInitialBalance] = useState('0');
  const [cajaHistory, setCajaHistory] = useState<Caja[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState<Caja | null>(null);

  // Fetch caja history
  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/caja/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Sort newest first
        setCajaHistory(data.sort((a: Caja, b: Caja) => new Date(b.openTime).getTime() - new Date(a.openTime).getTime()));
      }
    } catch (err) {
      console.error('Error fetching shift history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [openCaja]);

  const handleOpenCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const balance = parseFloat(initialBalance);
    if (isNaN(balance) || balance < 0) {
      setError('El saldo inicial debe ser un número válido igual o mayor a cero.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/caja/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ initialBalance: balance })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al abrir la caja.');
      }

      onCajaChange(data.openCaja);
      setSuccess('¡Caja abierta exitosamente! Ya puede comenzar a registrar ventas.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCaja = async () => {
    if (!window.confirm('¿Está seguro de que desea CERRAR LA CAJA activa? Se finalizará el turno y se generará el reporte de cierre.')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/caja/close', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al cerrar la caja.');
      }

      setShowReceipt(data.closedCaja);
      onCajaChange(null);
      setSuccess('¡Caja cerrada correctamente! Turno finalizado.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div id="caja_manager_view" className="space-y-6 max-w-4xl mx-auto">
      
      {/* Title section */}
      <div className="border-b border-slate-100 pb-4">
        <h2 className="font-display text-2xl font-bold text-slate-800 tracking-tight">Gestión de Turnos y Cajas</h2>
        <p className="text-slate-500 text-sm">Abra, controle y finalice sus sesiones de venta diaria en la reserva.</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-xl text-sm flex items-start gap-3">
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Active Caja Panel */}
        <div className="md:col-span-7 bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-50 pb-4">
            <h3 className="font-display font-semibold text-slate-800 flex items-center gap-2">
              <Unlock className={`w-5 h-5 ${openCaja ? 'text-emerald-500' : 'text-slate-400'}`} />
              Estado del Turno Actual
            </h3>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${
              openCaja ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'
            }`}>
              {openCaja ? '● Caja Abierta' : '■ Caja Cerrada'}
            </span>
          </div>

          {openCaja ? (
            /* Opened Shift Info */
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-50 to-emerald-50/20 border border-slate-100 rounded-2xl p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 block uppercase font-medium">Operador</span>
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      {openCaja.userName}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 block uppercase font-medium">Apertura</span>
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {formatDate(openCaja.openTime)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-200/50 pt-4 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 block uppercase font-medium">Transacciones</span>
                    <span className="text-xl font-bold text-slate-700 flex items-baseline gap-1">
                      {openCaja.salesCount}
                      <span className="text-xs font-normal text-slate-400">ventas</span>
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 block uppercase font-medium">Ventas Acumuladas</span>
                    <span className="text-xl font-bold text-emerald-600">
                      {formatCurrency(openCaja.currentSales)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 text-xs text-amber-800 space-y-1">
                <span className="font-semibold block">Aviso de Operación:</span>
                <p>Las ventas se realizan **únicamente** a través de medios electrónicos de pago (Tarjeta de Crédito, Débito, Transferencia, Mercado Pago). No se debe aceptar dinero en efectivo.</p>
              </div>

              <button
                id="close_caja_btn"
                onClick={handleCloseCaja}
                disabled={loading}
                className="w-full py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium rounded-xl text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                Cerrar Caja y Terminar Shift
              </button>
            </div>
          ) : (
            /* Open Caja Form */
            <form onSubmit={handleOpenCaja} className="space-y-5">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-600 space-y-2">
                <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-emerald-500" />
                  Instrucciones de Apertura:
                </p>
                <p className="text-xs">
                  Para comenzar a vender, debe abrir la caja diaria. Dado que los pagos son 100% electrónicos, el saldo inicial recomendado es **$0.00**.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase block">
                  Monto / Fondo Inicial ($)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 font-medium">
                    $
                  </span>
                  <input
                    id="initial_balance_input"
                    type="number"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    disabled={loading}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <button
                id="open_caja_btn"
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium rounded-xl text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Unlock className="w-4 h-4" />
                Abrir Caja Activa
              </button>
            </form>
          )}
        </div>

        {/* Side Help Panel / Last shift receipt */}
        <div className="md:col-span-5 space-y-6">
          
          {/* Shift receipt modal-like widget */}
          {showReceipt && (
            <div className="bg-slate-900 text-white rounded-2xl shadow-lg p-5 border border-slate-800 space-y-4 animate-scaleUp">
              <div className="text-center border-b border-slate-800 pb-3">
                <FileText className="w-8 h-8 text-emerald-400 mx-auto mb-1.5" />
                <h4 className="font-display font-bold text-base tracking-tight text-emerald-400">Recibo de Turno Finalizado</h4>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">PUNTA LOMA ACCESO</span>
              </div>

              <div className="space-y-2 text-xs font-mono text-slate-300">
                <div className="flex justify-between">
                  <span>ID Turno:</span>
                  <span className="text-white">{showReceipt.id.substring(0, 14)}...</span>
                </div>
                <div className="flex justify-between">
                  <span>Operador:</span>
                  <span className="text-white">{showReceipt.userName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Apertura:</span>
                  <span className="text-white">{formatDate(showReceipt.openTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cierre:</span>
                  <span className="text-white">{showReceipt.closeTime ? formatDate(showReceipt.closeTime) : '-'}</span>
                </div>
                <hr className="border-slate-800 my-2" />
                <div className="flex justify-between text-slate-400">
                  <span>Fondo Inicial:</span>
                  <span>{formatCurrency(showReceipt.initialBalance)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-semibold text-sm">
                  <span>Ventas Electrónicas:</span>
                  <span>{formatCurrency(showReceipt.currentSales)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Cant. de Ventas:</span>
                  <span>{showReceipt.salesCount}</span>
                </div>
                <hr className="border-slate-800 my-2" />
                <div className="flex justify-between text-white font-bold text-base">
                  <span>SALDO FINAL:</span>
                  <span className="text-emerald-400">{formatCurrency(showReceipt.finalBalance)}</span>
                </div>
              </div>

              <button
                onClick={() => setShowReceipt(null)}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          )}

          {/* Quick Stats Summary Card */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
            <h4 className="font-display font-semibold text-slate-700 text-sm flex items-center gap-1.5">
              <Clock className="w-4.5 h-4.5 text-slate-500" />
              Pautas de Control de Acceso
            </h4>
            <ul className="text-xs text-slate-600 space-y-2.5 list-disc pl-4 leading-relaxed">
              <li>Cada venta de entrada requiere registrar el **Nombre** y **DNI** del titular para la validación posterior de acceso.</li>
              <li>Asegúrese de cargar correctamente el **Comprobante de Operación** de la pasarela electrónica (Mercado Pago, Posnet de Tarjeta, etc.) en cada transacción.</li>
              <li>El código QR emitido al final de la venta se puede descargar o imprimir para ser leído en el portal de entrada de la reserva.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Cajas History Log */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <h3 className="font-display font-semibold text-slate-800 text-base mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-400" />
          Historial de Cajas y Turnos Recientes
        </h3>

        {cajaHistory.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            No se encontraron registros de turnos anteriores.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="text-xs text-slate-400 uppercase bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 font-semibold">Operador</th>
                  <th className="py-3 px-4 font-semibold">Apertura</th>
                  <th className="py-3 px-4 font-semibold">Cierre</th>
                  <th className="py-3 px-4 font-semibold">Monto Inicial</th>
                  <th className="py-3 px-4 font-semibold">Ventas</th>
                  <th className="py-3 px-4 font-semibold">Monto Total</th>
                  <th className="py-3 px-4 font-semibold text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cajaHistory.slice(0, 10).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-700">{c.userName}</td>
                    <td className="py-3 px-4 text-xs text-slate-500">{formatDate(c.openTime)}</td>
                    <td className="py-3 px-4 text-xs text-slate-500">{c.closeTime ? formatDate(c.closeTime) : '-'}</td>
                    <td className="py-3 px-4">{formatCurrency(c.initialBalance)}</td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700">{c.salesCount}</span> sales
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-600">{formatCurrency(c.currentSales)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${
                        c.status === 'open' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {c.status === 'open' ? 'Abierta' : 'Cerrada'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cajaHistory.length > 10 && (
              <p className="text-[11px] text-slate-400 text-right mt-3">
                * Mostrando los últimos 10 turnos.
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
