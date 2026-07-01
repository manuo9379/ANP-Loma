import React, { useState } from 'react';
import { Ticket } from '../types';
import { 
  Scan, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Search, 
  Clock, 
  User as UserIcon, 
  MapPin, 
  Calendar,
  Compass
} from 'lucide-react';

interface TicketValidadorProps {
  token: string;
}

export default function TicketValidador({ token }: TicketValidadorProps) {
  const [ticketCode, setTicketCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Scanned Ticket status
  const [scannedTicket, setScannedTicket] = useState<Ticket | null>(null);
  
  // Session validation log (to keep track of who entered recently)
  const [validationLog, setValidationLog] = useState<Ticket[]>([]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ticketCode.trim()) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setScannedTicket(null);

    try {
      const response = await fetch(`/api/tickets/search/${ticketCode.trim().toUpperCase()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se encontró ninguna entrada con ese código.');
      }

      setScannedTicket(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!scannedTicket) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tickets/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ticketCode: scannedTicket.ticketCode })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al validar la entrada.');
      }

      setSuccessMessage('¡Acceso Autorizado! La entrada se marcó como validada con éxito.');
      setScannedTicket(data.ticket);
      
      // Add to session validation log
      setValidationLog(prev => [data.ticket, ...prev]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const translateCategory = (cat: string) => {
    switch (cat) {
      case 'extranjero': return 'Extranjero';
      case 'nacional': return 'Nacional';
      case 'residente': return 'Residente de Chubut';
      case 'minor': return 'Jubilado o Menor';
      default: return cat;
    }
  };

  const clearSearch = () => {
    setTicketCode('');
    setScannedTicket(null);
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div id="ticket_validador_view" className="space-y-6 max-w-4xl mx-auto">
      
      {/* Title */}
      <div className="border-b border-slate-100 pb-4">
        <h2 className="font-display text-2xl font-bold text-slate-800 tracking-tight">Portal de Acceso - Validación</h2>
        <p className="text-slate-500 text-sm">Escanee o ingrese los códigos de las entradas para habilitar el ingreso al área natural.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Validator Control Box */}
        <div className="md:col-span-7 space-y-6">
          
          {/* Input Form */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
            <h3 className="font-display font-semibold text-slate-800 text-base flex items-center gap-2">
              <Scan className="w-5 h-5 text-emerald-600" />
              Buscador de Código de Entrada
            </h3>

            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  id="ticket_search_input"
                  type="text"
                  value={ticketCode}
                  onChange={(e) => setTicketCode(e.target.value)}
                  disabled={loading}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono font-semibold tracking-wider"
                  placeholder="Ej: PL-X7B8N9"
                  autoCapitalize="characters"
                />
              </div>
              <button
                id="search_ticket_btn"
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium rounded-xl text-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                Buscar
              </button>
            </form>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-start gap-3 animate-fadeIn">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <div>
                <span className="font-semibold block">Error de Validación</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-xl text-sm flex items-start gap-3 animate-fadeIn">
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
              <div>
                <span className="font-semibold block">Acceso Autorizado</span>
                <span>{successMessage}</span>
              </div>
            </div>
          )}

          {/* Scanned Result details Card */}
          {scannedTicket && (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden animate-scaleUp">
              
              {/* Card Header Status Banner */}
              <div className={`px-6 py-4 border-b flex justify-between items-center ${
                scannedTicket.validated 
                  ? 'bg-red-50 border-red-100 text-red-700' 
                  : 'bg-emerald-50 border-emerald-100 text-emerald-800'
              }`}>
                <div className="flex items-center gap-2">
                  {scannedTicket.validated ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  )}
                  <span className="font-display font-bold text-sm uppercase tracking-wide">
                    {scannedTicket.validated ? 'ENTRADA YA UTILIZADA' : 'ENTRADA VÁLIDA / POR VALIDAR'}
                  </span>
                </div>
                <button 
                  onClick={clearSearch}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
                >
                  Limpiar
                </button>
              </div>

              {/* Ticket Details Body */}
              <div className="p-6 space-y-5">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono tracking-widest text-slate-400 font-bold uppercase block">
                      ÁREA NATURAL PROTEGIDA
                    </span>
                    <h4 className="font-display font-bold text-slate-800 text-xl">Reserva Punta Loma</h4>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono font-semibold">
                      CÓDIGO: {scannedTicket.ticketCode}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block uppercase">Categoría</span>
                    <span className="font-bold text-emerald-600 text-sm">
                      {translateCategory(scannedTicket.category)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1 col-span-2">
                    <span className="text-xs text-slate-400 block uppercase">País y Ciudad de Residencia</span>
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      {scannedTicket.customerResidence || scannedTicket.customerName || 'N/C'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 block uppercase">Fecha de Emisión</span>
                    <span className="font-semibold text-slate-500 flex items-center gap-1 text-xs">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {formatDateTime(scannedTicket.purchaseDate)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 block uppercase">Precio del Ticket</span>
                    <span className="font-bold text-slate-700">
                      {scannedTicket.price === 0 ? 'Sin Costo' : `$ ${scannedTicket.price}`}
                    </span>
                  </div>
                </div>

                {/* Audit log for ALREADY VALIDATED */}
                {scannedTicket.validated && (
                  <div className="bg-red-50 border border-red-100 text-red-800 rounded-xl p-4 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>DETALLES DEL INGRESO REGISTRADO:</span>
                    </div>
                    <div className="space-y-1 font-medium pl-5">
                      <p>• Validada el: <span className="font-bold text-slate-800">{formatDateTime(scannedTicket.validatedAt)}</span></p>
                      <p>• Operador de Acceso: <span className="font-bold text-slate-800">{scannedTicket.validatedBy || 'Desconocido'}</span></p>
                    </div>
                  </div>
                )}

                {/* Action CTA for NEW VALIDATION */}
                {!scannedTicket.validated && (
                  <button
                    id="validate_ticket_btn"
                    onClick={handleValidate}
                    disabled={loading}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle className="w-5 h-5" />
                    CONCEDER ACCESO Y VALIDAR ENTRADA
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Live session scans sidebar */}
        <div className="md:col-span-5 bg-white border border-slate-100 rounded-2xl shadow-sm p-5 space-y-4">
          <h3 className="font-display font-semibold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-50 pb-2">
            <Clock className="w-4.5 h-4.5 text-slate-500" />
            Accesos Validados Recientemente
          </h3>

          {validationLog.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs space-y-2">
              <Compass className="w-8 h-8 mx-auto text-slate-300 animate-spin-slow" />
              <p>No se han registrado validaciones en esta sesión.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {validationLog.map((log, idx) => (
                <div key={`${log.id}-${idx}`} className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1.5 animate-fadeIn">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-mono font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">
                      {log.ticketCode}
                    </span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                      <CheckCircle className="w-3 h-3" />
                      Ingresó {new Date(log.validatedAt!).toLocaleTimeString('es-AR')}
                    </span>
                  </div>
                  
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800 block truncate">{log.customerResidence || log.customerName}</span>
                    <span className="text-[10px] text-slate-500 capitalize">{translateCategory(log.category)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
