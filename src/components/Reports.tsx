import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Ticket, 
  Users, 
  CheckSquare, 
  Printer, 
  FileSpreadsheet,
  Download,
  Award,
  CreditCard,
  User as UserIcon,
  RefreshCw,
  Clock
} from 'lucide-react';

interface ReportsProps {
  token: string;
}

interface DailyStats {
  date: string;
  totalRevenue: number;
  salesCount: number;
  ticketCount: number;
  validatedCount: number;
  byCategory: Record<string, { count: number; revenue: number }>;
  byPayment: Record<string, number>;
  salesList: any[];
}

interface GeneralStats {
  trend: { date: string; revenue: number; tickets: number }[];
  categories: { name: string; value: number; revenue: number }[];
  payments: { name: string; value: number }[];
  cashiers: { name: string; salesCount: number; revenue: number }[];
  totals: { revenue: number; tickets: number; validated: number };
}

export default function Reports({ token }: ReportsProps) {
  const [selectedDate, setSelectedDate] = useState('2026-07-01');
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [generalStats, setGeneralStats] = useState<GeneralStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Colors for pie charts
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];
  const PAYMENT_COLORS = ['#34d399', '#60a5fa', '#fbbf24', '#a78bfa'];

  const fetchDailyStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/reports/daily?date=${selectedDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al cargar reporte diario');
      setDailyStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGeneralStats = async () => {
    try {
      const response = await fetch('/api/reports/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setGeneralStats(data);
      }
    } catch (err) {
      console.error('Error fetching general stats:', err);
    }
  };

  useEffect(() => {
    fetchDailyStats();
    fetchGeneralStats();
  }, [selectedDate]);

  const handlePrintDaily = () => {
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

  return (
    <div id="reports_view" className="space-y-8">
      
      {/* Title */}
      <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 noprint">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800 tracking-tight">Reportes y Estadísticas de Ventas</h2>
          <p className="text-slate-500 text-sm">Monitoree la afluencia de público, ingresos recaudados e indicadores clave.</p>
        </div>
        
        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200">
          <Calendar className="w-4 h-4 text-slate-400 ml-2" />
          <input
            id="reports_date_picker"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-transparent border-0 outline-none focus:ring-0 pr-2"
          />
        </div>
      </div>

      {/* --- SECTION 1: DAILY STATS (PRINT FRIENDLY) --- */}
      {dailyStats && (
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="font-display font-bold text-slate-800 text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              Cierre y Métricas del Día ({new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-AR', { dateStyle: 'long' })})
            </h3>
            <button
              onClick={handlePrintDaily}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer noprint"
            >
              <Printer className="w-4 h-4" />
              Imprimir Reporte Diario
            </button>
          </div>

          {/* KPI Mini widgets */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Recaudación Total</span>
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-slate-800 font-display">
                {formatCurrency(dailyStats.totalRevenue)}
              </p>
              <span className="text-[10px] text-emerald-600 font-semibold block">100% Cobros Electrónicos</span>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Entradas Emitidas</span>
                <Ticket className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-slate-800 font-display">
                {dailyStats.ticketCount} <span className="text-xs text-slate-400 font-normal">unidades</span>
              </p>
              <span className="text-[10px] text-slate-400 block">En {dailyStats.salesCount} transacciones</span>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Accesos Validados</span>
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-slate-800 font-display">
                {dailyStats.validatedCount} <span className="text-xs text-slate-400 font-normal">visitantes</span>
              </p>
              <span className="text-[10px] text-purple-600 font-semibold block">
                {dailyStats.ticketCount > 0 
                  ? `${Math.round((dailyStats.validatedCount / dailyStats.ticketCount) * 100)}% de asistencia` 
                  : 'Sin ingresos registrados'}
              </span>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Ticket Promedio</span>
                <TrendingUp className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-slate-800 font-display">
                {formatCurrency(dailyStats.salesCount > 0 ? dailyStats.totalRevenue / dailyStats.salesCount : 0)}
              </p>
              <span className="text-[10px] text-slate-400 block">Por transacción electrónica</span>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Category Breakdown list */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
              <h4 className="font-display font-semibold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-50 pb-2">
                <Award className="w-4 h-4 text-emerald-500" />
                Desglose por Categoría del Visitante
              </h4>

              <div className="divide-y divide-slate-100">
                {Object.entries(dailyStats.byCategory).map(([catKey, metrics]) => {
                  const m = metrics as { count: number; revenue: number };
                  return (
                    <div key={catKey} className="py-2.5 flex justify-between items-center text-sm">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-700 block">{translateCategory(catKey)}</span>
                        <span className="text-xs text-slate-400">{m.count} entradas vendidas</span>
                      </div>
                      <span className="font-bold text-slate-800">
                        {formatCurrency(m.revenue)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Methods breakdown */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
              <h4 className="font-display font-semibold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-50 pb-2">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                Desglose de Caja por Método de Cobro
              </h4>

              <div className="divide-y divide-slate-100">
                {Object.entries(dailyStats.byPayment).map(([method, amount]) => (
                  <div key={method} className="py-2.5 flex justify-between items-center text-sm">
                    <span className="font-semibold text-slate-700">{method}</span>
                    <span className="font-bold text-emerald-600">
                      {formatCurrency(amount as number)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Daily sales list */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
            <h4 className="font-display font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-4.5 h-4.5 text-slate-500" />
              Listado de Operaciones del Día
            </h4>

            {dailyStats.salesList.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">
                No se registraron ventas en el día seleccionado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="text-[10px] text-slate-400 uppercase bg-slate-50 border-b border-slate-100 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Hora</th>
                      <th className="py-2.5 px-3">Residencia del Comprador</th>
                      <th className="py-2.5 px-3">Cajero</th>
                      <th className="py-2.5 px-3">Canal Pago</th>
                      <th className="py-2.5 px-3">Código Ref.</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyStats.salesList.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 px-3 text-slate-500 font-mono">
                          {new Date(sale.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">{sale.customerResidence || sale.customerName || 'N/C'}</td>
                        <td className="py-2.5 px-3">{sale.userName}</td>
                        <td className="py-2.5 px-3 text-slate-500">{sale.paymentMethod}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-[10px]">{sale.paymentRef}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800">{formatCurrency(sale.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- SECTION 2: CHARTS AND GRAPHS (HISTORICAL - HIDDEN IN PRINT) --- */}
      <div className="space-y-6 noprint border-t border-slate-100 pt-6">
        <h3 className="font-display font-bold text-slate-800 text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          Análisis de Desempeño Histórico y Estadísticas Generales
        </h3>

        {generalStats ? (
          <div className="space-y-6">
            
            {/* Row 1: Weekly Area Chart */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
              <div>
                <h4 className="font-display font-semibold text-slate-800 text-sm">Tendencia de Ventas (Últimos 7 días)</h4>
                <p className="text-[11px] text-slate-400">Total de ingresos diarios generados en boletería por canales electrónicos.</p>
              </div>

              <div className="h-64 sm:h-80 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={generalStats.trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      formatter={(val: number) => [formatCurrency(val), 'Ingresos']}
                      labelFormatter={(label) => `Fecha: ${label}`}
                      contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Row 2: Two charts side-by-side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Category distribution Pie Chart */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-display font-semibold text-slate-800 text-sm">Afluencia de Visitantes por Categoría</h4>
                  <p className="text-[11px] text-slate-400">Distribución porcentual de los accesos vendidos por perfil.</p>
                </div>

                <div className="h-64 flex items-center justify-center text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={generalStats.categories}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {generalStats.categories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} entradas`, 'Cantidad']} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Payment methods Bar chart */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-display font-semibold text-slate-800 text-sm">Distribución de Cobros Electrónicos</h4>
                  <p className="text-[11px] text-slate-400">Monto total acumulado desglosado por pasarela electrónica de pago.</p>
                </div>

                <div className="h-64 flex items-center justify-center text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={generalStats.payments} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), 'Recaudado']} />
                      <Bar dataKey="value" fill="#34d399" radius={[8, 8, 0, 0]}>
                        {generalStats.payments.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Cashier performance leaderboard */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
              <h4 className="font-display font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <UserIcon className="w-4.5 h-4.5 text-slate-500" />
                Desempeño de Ventas de Cajeros
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="text-[10px] text-slate-400 uppercase bg-slate-50 border-b border-slate-100 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Cajero / Operador</th>
                      <th className="py-2.5 px-3 text-center">Transacciones Realizadas</th>
                      <th className="py-2.5 px-3 text-right">Monto Total Vendido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {generalStats.cashiers.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-700 flex items-center gap-1.5">
                          <span className="w-5 h-5 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          {c.name}
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold text-slate-700">{c.salesCount}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{formatCurrency(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 text-sm">
            Cargando gráficos e indicadores históricos...
          </div>
        )}
      </div>

    </div>
  );
}
