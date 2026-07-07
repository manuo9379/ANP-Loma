import React, { useState, useEffect } from 'react';
import { Caja, PriceSettings, Ticket as TicketType } from '../types';
import { 
  CreditCard, 
  Smartphone, 
  Users, 
  User as UserIcon, 
  Download, 
  Printer, 
  ShoppingBag, 
  Plus, 
  Minus, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Award
} from 'lucide-react';
import { adminService, ticketService } from '../services/apiService';

interface TicketVentaProps {
  token: string;
  openCaja: Caja | null;
  onNavigateToCaja: () => void;
}

interface SaleCartItem {
  category: 'extranjero' | 'nacional' | 'residente' | 'minor';
  qty: number;
  price: number;
  holders: { residence: string }[];
}

export default function TicketVenta({ token, openCaja, onNavigateToCaja }: TicketVentaProps) {
  const [prices, setPrices] = useState<PriceSettings>({
    extranjero: 10000,
    nacional: 5000,
    residente: 2500,
    minor: 0
  });

  // Client sales cart state
  const [cart, setCart] = useState<Record<string, SaleCartItem>>({
    extranjero: { category: 'extranjero', qty: 0, price: 10000, holders: [] },
    nacional: { category: 'nacional', qty: 0, price: 5000, holders: [] },
    residente: { category: 'residente', qty: 0, price: 2500, holders: [] },
    minor: { category: 'minor', qty: 0, price: 0, holders: [] }
  });

  // Customer information
  const [customerResidence, setCustomerResidence] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Transferencia' | 'Tarjeta de Crédito' | 'Tarjeta de Débito' | 'Mercado Pago'>('Mercado Pago');
  const [paymentRef, setPaymentRef] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soldTickets, setSoldTickets] = useState<TicketType[] | null>(null);

  // Fetch current ticket prices from settings
  const fetchPrices = async () => {
    try {
      const data = await adminService.getPrices();
      setPrices(data);
      setCart(prev => ({
        extranjero: { ...prev.extranjero, price: data.extranjero },
        nacional: { ...prev.nacional, price: data.nacional },
        residente: { ...prev.residente, price: data.residente },
        minor: { ...prev.minor, price: data.minor }
      }));
    } catch (err) {
      console.error('Error loading current prices:', err);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  const updateQuantity = React.useCallback((category: keyof PriceSettings, delta: number) => {
    setCart(prev => {
      const current = prev[category];
      const newQty = Math.max(0, current.qty + delta);
      
      // Adjust holders list length dynamically
      let newHolders = [...current.holders];
      if (newQty > current.holders.length) {
        for (let i = current.holders.length; i < newQty; i++) {
          newHolders.push({ residence: '' });
        }
      } else if (newQty < current.holders.length) {
        newHolders = newHolders.slice(0, newQty);
      }

      return {
        ...prev,
        [category]: {
          ...current,
          qty: newQty,
          holders: newHolders
        }
      };
    });
  }, []);

  const handleHolderChange = React.useCallback((category: string, index: number, field: 'residence', value: string) => {
    setCart(prev => {
      const current = prev[category];
      const newHolders = [...current.holders];
      newHolders[index] = {
        ...newHolders[index],
        [field]: value
      };
      return {
        ...prev,
        [category]: {
          ...current,
          holders: newHolders
        }
      };
    });
  }, []);

  const getCartItems = (): SaleCartItem[] => {
    return Object.values(cart) as unknown as SaleCartItem[];
  };

  // Get total cart summary (memoized)
  const totalTickets = React.useMemo(() => {
    return Object.values(cart).reduce((acc, item) => acc + item.qty, 0);
  }, [cart]);

  const totalAmount = React.useMemo(() => {
    return Object.values(cart).reduce((acc, item) => acc + (item.qty * item.price), 0);
  }, [cart]);

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (totalTickets === 0) {
      setError('Debe seleccionar al menos una entrada para vender.');
      return;
    }

    if (!customerResidence.trim() || customerResidence.trim().length < 3) {
      setError('El País y Ciudad de residencia debe tener al menos 3 caracteres.');
      return;
    }

    if (!paymentRef.trim() || paymentRef.trim().length < 3) {
      setError('La Referencia de Pago Electrónico debe tener al menos 3 caracteres.');
      return;
    }

    setLoading(true);

    // Prepare sale items list
    const itemsPayload = getCartItems()
      .filter(item => item.qty > 0)
      .flatMap(item => {
        // We'll map each holder to an individual record
        return item.holders.map((holder) => {
          const resVal = holder.residence.trim() || customerResidence;
          return {
            category: item.category,
            qty: 1,
            customerName: resVal,
            customerDni: '',
            customerResidence: resVal
          };
        });
      });

    try {
      const data = await ticketService.sell(token, {
        items: itemsPayload,
        paymentMethod,
        paymentRef,
        customerName: customerResidence,
        customerDni: '',
        customerResidence
      });

      setSoldTickets(data.tickets);
      
      // Reset Cart & Inputs
      setCart({
        extranjero: { category: 'extranjero', qty: 0, price: prices.extranjero, holders: [] },
        nacional: { category: 'nacional', qty: 0, price: prices.nacional, holders: [] },
        residente: { category: 'residente', qty: 0, price: prices.residente, holders: [] },
        minor: { category: 'minor', qty: 0, price: prices.minor, holders: [] }
      });
      setCustomerResidence('');
      setPaymentRef('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQr = (qrDataUrl: string, ticketCode: string) => {
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR-Acceso-PuntaLoma-${ticketCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintTickets = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
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

  if (!openCaja) {
    return (
      <div id="caja_closed_warning" className="max-w-2xl mx-auto bg-white border border-slate-100 rounded-2xl shadow-sm p-8 text-center space-y-6">
        <div className="mx-auto bg-amber-50 w-16 h-16 rounded-full flex items-center justify-center border border-amber-100">
          <AlertTriangle className="w-8 h-8 text-amber-500 animate-pulse" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-xl font-bold text-slate-800">Caja Cerrada u Turno Inactivo</h2>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Debe iniciar su turno y abrir la caja activa antes de poder realizar ventas y emitir entradas QR de acceso.
          </p>
        </div>
        <button
          onClick={onNavigateToCaja}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium rounded-xl text-sm transition-all flex items-center gap-2 mx-auto cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          Ir a Apertura de Caja
        </button>
      </div>
    );
  }

  return (
    <div id="ticket_venta_view" className="space-y-6">
      
      {/* Title */}
      <div className="border-b border-slate-100 pb-4">
        <h2 className="font-display text-2xl font-bold text-slate-800 tracking-tight">Nueva Venta de Entradas</h2>
        <p className="text-slate-500 text-sm">Emisión de accesos digitales con pagos electrónicos para el ANP Punta Loma.</p>
      </div>

      {soldTickets ? (
        /* Venta Realizada - Ticket QR Screen */
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex items-center gap-4">
            <CheckCircle className="w-10 h-10 text-emerald-500 shrink-0" />
            <div>
              <h3 className="font-display font-bold text-emerald-800 text-lg">¡Venta Registrada Exitosamente!</h3>
              <p className="text-emerald-700 text-sm">
                Se han generado {soldTickets.length} entrada(s) de acceso con códigos QR únicos listos para ser escaneados en el portal.
              </p>
            </div>
            <button
              onClick={() => setSoldTickets(null)}
              data-testid="venta-new-sale-btn"
              className="ml-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-xs transition-colors cursor-pointer"
            >
              Nueva Venta
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-end noprint">
            <button
              onClick={handlePrintTickets}
              data-testid="venta-print-all-btn"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir Todas las Entradas
            </button>
          </div>

          {/* Tickets Display Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="tickets_print_area">
            {soldTickets.map((ticket, index) => (
              <div 
                key={ticket.id} 
                className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row gap-5 relative overflow-hidden"
              >
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
                
                {/* Ticket Details */}
                <div className="flex-1 space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono tracking-widest text-emerald-600 font-bold uppercase block">
                      ENTRADA OFICIAL
                    </span>
                    <h4 className="font-display font-bold text-slate-800 text-lg">ANP Punta Loma</h4>
                    <p className="text-[11px] text-slate-400">Puerto Madryn, Chubut, Argentina</p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Categoría</span>
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-slate-400" />
                        {translateCategory(ticket.category)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Residencia</span>
                      <span className="font-semibold text-slate-700 block">{ticket.customerResidence || ticket.customerName}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Costo</span>
                        <span className="font-bold text-slate-800 text-sm">{formatCurrency(ticket.price)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Código de Acceso</span>
                        <span className="font-mono font-bold text-emerald-600 tracking-wider text-sm">
                          {ticket.ticketCode}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* QR Section */}
                <div className="flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-dashed border-slate-200 pt-4 md:pt-0 md:pl-5 shrink-0">
                  {ticket.qrDataUrl ? (
                    <>
                      <img 
                        src={ticket.qrDataUrl} 
                        alt="Acceso QR Punta Loma" 
                        className="w-36 h-36 border border-slate-100 rounded-xl"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        onClick={() => handleDownloadQr(ticket.qrDataUrl!, ticket.ticketCode)}
                        data-testid={`venta-download-qr-btn-${ticket.ticketCode}`}
                        className="mt-3 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer noprint"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Descargar QR
                      </button>
                    </>
                  ) : (
                    <div className="w-36 h-36 bg-slate-100 flex items-center justify-center rounded-xl text-slate-400 text-xs">
                      QR Error
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Selling Screen Form */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Form left */}
          <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6">
            
            {/* Category Selectors */}
            <div className="space-y-4">
              <h3 className="font-display font-semibold text-slate-800 text-base flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                1. Selección de Entradas
              </h3>

              <div className="space-y-3.5">
                {/* Foreigner */}
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl transition-all hover:bg-slate-50/80">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-800 block text-sm">Extranjero</span>
                    <span className="text-[11px] text-slate-400">Turista internacional sin residencia</span>
                    <span className="font-bold text-emerald-600 text-sm block mt-1">{formatCurrency(prices.extranjero)}</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => updateQuantity('extranjero', -1)}
                      data-testid="venta-qty-minus-extranjero"
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-mono font-bold text-slate-700 w-6 text-center text-sm">
                      {cart.extranjero.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity('extranjero', 1)}
                      data-testid="venta-qty-plus-extranjero"
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* National */}
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl transition-all hover:bg-slate-50/80">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-800 block text-sm">Nacional</span>
                    <span className="text-[11px] text-slate-400">Turistas residentes en Argentina</span>
                    <span className="font-bold text-emerald-600 text-sm block mt-1">{formatCurrency(prices.nacional)}</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => updateQuantity('nacional', -1)}
                      data-testid="venta-qty-minus-nacional"
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-mono font-bold text-slate-700 w-6 text-center text-sm">
                      {cart.nacional.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity('nacional', 1)}
                      data-testid="venta-qty-plus-nacional"
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Chubut resident */}
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl transition-all hover:bg-slate-50/80">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-800 block text-sm">Residente de Chubut</span>
                    <span className="text-[11px] text-slate-400">Comprobante de domicilio local requerido</span>
                    <span className="font-bold text-emerald-600 text-sm block mt-1">{formatCurrency(prices.residente)}</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => updateQuantity('residente', -1)}
                      data-testid="venta-qty-minus-residente"
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-mono font-bold text-slate-700 w-6 text-center text-sm">
                      {cart.residente.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity('residente', 1)}
                      data-testid="venta-qty-plus-residente"
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Minor or retired */}
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl transition-all hover:bg-slate-50/80">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-800 block text-sm">Jubilados o Menores</span>
                    <span className="text-[11px] text-slate-400">Menores de 12 años o acreditación jubilatoria</span>
                    <span className="font-bold text-slate-400 text-sm block mt-1">{prices.minor === 0 ? 'Sin Costo ($0)' : formatCurrency(prices.minor)}</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => updateQuantity('minor', -1)}
                      data-testid="venta-qty-minus-minor"
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-mono font-bold text-slate-700 w-6 text-center text-sm">
                      {cart.minor.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity('minor', 1)}
                      data-testid="venta-qty-plus-minor"
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Individual Holders customization (if totalTickets > 0) */}
            {totalTickets > 0 && (
              <div className="space-y-4 border-t border-slate-100 pt-5 animate-fadeIn">
                <h3 className="font-display font-semibold text-slate-800 text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  2. Datos de los Visitantes / Titulares
                </h3>
                
                <p className="text-xs text-slate-400 leading-normal">
                  Cargue el País y Ciudad de residencia de cada persona. Si se dejan en blanco, se heredarán los datos del comprador principal cargados al costado.
                </p>

                <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
                  {getCartItems().flatMap((item) => {
                    if (item.qty === 0) return [];
                    return item.holders.map((holder, idx) => (
                      <div key={`${item.category}-${idx}`} className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-emerald-700 capitalize">
                            Entrada {translateCategory(item.category)} #{idx + 1}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <input
                            type="text"
                            data-testid={`venta-holder-residence-${item.category}-${idx}`}
                            placeholder="País y Ciudad de Residencia"
                            value={holder.residence}
                            onChange={(e) => handleHolderChange(item.category, idx, 'residence', e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    ));
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Form right (Cart / Payment summary) */}
          <form onSubmit={handleSell} className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-5">
              <h3 className="font-display font-semibold text-slate-800 text-base flex items-center gap-2 border-b border-slate-50 pb-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                3. Resumen y Medios de Pago
              </h3>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Principal Customer Details */}
              <div className="space-y-3.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Datos del Comprador Principal
                </span>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">
                      País y Ciudad de Residencia <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <UserIcon className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        data-testid="venta-customer-residence"
                        value={customerResidence}
                        onChange={(e) => setCustomerResidence(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                        placeholder="Ej: Argentina, Puerto Madryn o España, Barcelona"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-3.5 border-t border-slate-100 pt-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Canal de Cobro Electrónico
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Mercado Pago', label: 'Mercado Pago', icon: Smartphone },
                    { id: 'Transferencia', label: 'Transferencia', icon: RefreshCw },
                    { id: 'Tarjeta de Crédito', label: 'Crédito', icon: CreditCard },
                    { id: 'Tarjeta de Débito', label: 'Débito', icon: CreditCard }
                  ].map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        data-testid={`venta-paymethod-${method.id}`}
                        onClick={() => setPaymentMethod(method.id as any)}
                        className={`py-2 px-3 border rounded-xl flex items-center gap-1.5 justify-start text-left transition-all cursor-pointer ${
                          paymentMethod === method.id 
                            ? 'bg-emerald-50/80 border-emerald-500 text-emerald-800' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${paymentMethod === method.id ? 'text-emerald-500' : 'text-slate-400'}`} />
                        <span className="text-xs font-medium">{method.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Audit Reference code */}
                <div className="space-y-1 mt-3">
                  <label className="text-[11px] font-semibold text-slate-600 block flex justify-between">
                    <span>Nro de Comprobante / Ref. del Pago</span>
                    <span className="text-red-500 text-[10px] uppercase font-bold">Obligatorio</span>
                  </label>
                  <input
                    type="text"
                    data-testid="venta-payment-ref"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                    placeholder="Ej: MP-981762 o TRANS-0988"
                  />
                </div>
              </div>
            </div>

            {/* Total Balance & Submit */}
            <div className="border-t border-slate-100 pt-5 space-y-4 mt-6">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Subtotal de entradas:</span>
                  <span>{totalTickets} u.</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-display font-bold text-slate-700 text-base">TOTAL NETO:</span>
                  <span className="font-display font-bold text-2xl text-emerald-600">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>

              <button
                id="sell_submit_btn"
                data-testid="venta-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium rounded-xl text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    Emitir Entradas QR
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
      )}
    </div>
  );
}
