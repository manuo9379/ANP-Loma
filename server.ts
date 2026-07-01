import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import QRCode from 'qrcode';
import * as db from './db/database';

// Extend Express Request interface to include session info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: 'admin' | 'cajero';
        name: string;
      };
    }
  }
}

// Memory session store
const SESSIONS = new Map<string, {
  id: string;
  username: string;
  role: 'admin' | 'cajero';
  name: string;
}>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize DB and Seed Data
  db.initializeDatabase();

  // Middleware
  app.use(express.json());

  // CORS-like / Auth extraction middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const session = SESSIONS.get(token);
      if (session) {
        req.user = session;
      }
    }
    next();
  });

  // Auth Guard Middlewares
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'No autorizado. Debe iniciar sesión.' });
      return;
    }
    next();
  };

  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
      return;
    }
    next();
  };

  // --- API ENDPOINTS ---

  // 1. Auth API
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Usuario y contraseña requeridos' });
      return;
    }

    const user = db.getUserWithPassword(username);
    if (!user || user.password !== password) {
      res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
      return;
    }

    // Create session token
    const token = `tok-${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
    const sessionUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name
    };
    SESSIONS.set(token, sessionUser);

    res.json({
      token,
      user: sessionUser
    });
  });

  app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
    res.json({ user: req.user });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      SESSIONS.delete(token);
    }
    res.json({ message: 'Sesión cerrada' });
  });

  // 2. Settings / Prices API
  app.get('/api/settings/prices', (req: Request, res: Response) => {
    const settings = db.getSettings();
    res.json(settings.ticketPrices);
  });

  app.put('/api/settings/prices', requireAuth, requireAdmin, (req: Request, res: Response) => {
    const prices = req.body;
    if (!prices || typeof prices !== 'object') {
      res.status(400).json({ error: 'Precios inválidos' });
      return;
    }

    const requiredKeys = ['extranjero', 'nacional', 'residente', 'minor'];
    for (const key of requiredKeys) {
      if (typeof prices[key] !== 'number' || prices[key] < 0) {
        res.status(400).json({ error: `Precio inválido para la categoría: ${key}` });
        return;
      }
    }

    db.saveSettings({ ticketPrices: prices });
    res.json({ message: 'Precios actualizados exitosamente', prices });
  });

  // 3. Users CRUD API (Admin only)
  app.get('/api/users', requireAuth, requireAdmin, (req: Request, res: Response) => {
    const users = db.getUsers();
    res.json(users);
  });

  app.post('/api/users', requireAuth, requireAdmin, (req: Request, res: Response) => {
    const { username, password, name, role } = req.body;
    if (!username || !password || !name || !role) {
      res.status(400).json({ error: 'Todos los campos son obligatorios' });
      return;
    }

    const users = db.getUsers();
    // Check if duplicate
    const exists = db.getUserWithPassword(username);
    if (exists) {
      res.status(400).json({ error: 'El nombre de usuario ya está registrado' });
      return;
    }

    const newUser: db.User = {
      id: `usr-${Date.now()}`,
      username,
      password,
      role,
      name,
      active: true
    };

    const updatedUsers = [...users, newUser];
    db.saveUsers(updatedUsers);
    res.status(210).json({ message: 'Usuario creado', user: { id: newUser.id, username: newUser.username, name: newUser.name, role: newUser.role, active: newUser.active } });
  });

  app.put('/api/users/:id', requireAuth, requireAdmin, (req: Request, res: Response) => {
    const userId = req.params.id;
    const { username, password, name, role, active } = req.body;

    const users = db.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const existingUsersFile = db.getUsers();
    const exUser = existingUsersFile.find(u => u.id === userId)!;

    const updatedUser: db.User = {
      id: userId,
      username: username || exUser.username,
      password: password || undefined, // will merge inside db.saveUsers
      name: name || exUser.name,
      role: role || exUser.role,
      active: active !== undefined ? active : exUser.active
    };

    const updatedUsers = [...users];
    updatedUsers[userIndex] = updatedUser;
    db.saveUsers(updatedUsers);

    res.json({ message: 'Usuario actualizado exitosamente' });
  });

  app.delete('/api/users/:id', requireAuth, requireAdmin, (req: Request, res: Response) => {
    const userId = req.params.id;
    if (userId === req.user!.id) {
      res.status(400).json({ error: 'No puede eliminarse a sí mismo' });
      return;
    }

    const users = db.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    // Soft delete or deactivate is safer, let's toggle active = false
    users[userIndex].active = false;
    db.saveUsers(users);

    res.json({ message: 'Usuario desactivado exitosamente' });
  });

  // 4. Caja Management API
  app.get('/api/caja/status', requireAuth, (req: Request, res: Response) => {
    const openCaja = db.getOpenCaja(req.user!.id);
    res.json({ openCaja: openCaja || null });
  });

  app.post('/api/caja/open', requireAuth, (req: Request, res: Response) => {
    const { initialBalance } = req.body;
    const balanceNum = parseFloat(initialBalance) || 0;

    try {
      const openCaja = db.openCaja(req.user!.id, req.user!.name, balanceNum);
      res.json({ message: 'Caja abierta con éxito', openCaja });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/caja/close', requireAuth, (req: Request, res: Response) => {
    const openCaja = db.getOpenCaja(req.user!.id);
    if (!openCaja) {
      res.status(400).json({ error: 'No hay ninguna caja abierta para este usuario' });
      return;
    }

    try {
      const closedCaja = db.closeCaja(openCaja.id);
      res.json({ message: 'Caja cerrada con éxito', closedCaja });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/caja/history', requireAuth, (req: Request, res: Response) => {
    const cajas = db.getCajas();
    // Admin sees all, cashiers see only their own
    if (req.user!.role === 'admin') {
      res.json(cajas);
    } else {
      res.json(cajas.filter(c => c.userId === req.user!.id));
    }
  });

  // 5. Ticket Sales API
  app.post('/api/tickets/sell', requireAuth, async (req: Request, res: Response) => {
    const { items, paymentMethod, paymentRef, customerName, customerDni, customerResidence } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Debe incluir al menos un ítem para la venta' });
      return;
    }

    const openCaja = db.getOpenCaja(req.user!.id);
    if (!openCaja) {
      res.status(400).json({ error: 'Debe abrir caja antes de realizar una venta.' });
      return;
    }

    if (!paymentMethod || !paymentRef) {
      res.status(400).json({ error: 'Los datos de pago electrónico son obligatorios.' });
      return;
    }

    try {
      const { sale, tickets } = db.createSale(
        openCaja.id,
        req.user!.id,
        req.user!.name,
        items,
        paymentMethod,
        paymentRef,
        customerName,
        customerDni,
        customerResidence
      );

      // Map tickets to include a server-generated QR base64 code
      const ticketsWithQr = await Promise.all(
        tickets.map(async (t) => {
          // Generate actual QR containing ticket information (code, details)
          const qrPayload = JSON.stringify({
            code: t.ticketCode,
            cat: t.category,
            name: t.customerName,
            dni: t.customerDni,
            residence: t.customerResidence,
            date: t.purchaseDate
          });
          const qrDataUrl = await QRCode.toDataURL(qrPayload, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 250
          });
          return {
            ...t,
            qrDataUrl
          };
        })
      );

      res.json({
        message: 'Venta registrada con éxito',
        sale,
        tickets: ticketsWithQr
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 6. Ticket Validation API
  app.post('/api/tickets/validate', requireAuth, (req: Request, res: Response) => {
    const { ticketCode } = req.body;
    if (!ticketCode) {
      res.status(400).json({ error: 'El código de entrada es requerido' });
      return;
    }

    try {
      const ticket = db.validateTicket(ticketCode, req.user!.name);
      res.json({ message: 'Entrada validada correctamente', ticket });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Simple endpoint to search or scan ticket details
  app.get('/api/tickets/search/:code', requireAuth, (req: Request, res: Response) => {
    const code = req.params.code;
    const tickets = db.getTickets();
    const ticket = tickets.find(t => t.ticketCode.toUpperCase() === code.toUpperCase());

    if (!ticket) {
      res.status(404).json({ error: 'Entrada no encontrada' });
      return;
    }

    res.json(ticket);
  });

  // 7. Reports & Statistics API
  app.get('/api/reports/daily', requireAuth, (req: Request, res: Response) => {
    const dateQuery = req.query.date as string || new Date().toISOString().split('T')[0];
    
    const sales = db.getSales();
    const tickets = db.getTickets();

    // Filter sales and tickets for the target date
    const dailySales = sales.filter(s => s.timestamp.startsWith(dateQuery));
    const dailyTickets = tickets.filter(t => t.purchaseDate.startsWith(dateQuery));

    // Desglose por categoría
    const statsByCategory = {
      extranjero: { count: 0, revenue: 0 },
      nacional: { count: 0, revenue: 0 },
      residente: { count: 0, revenue: 0 },
      minor: { count: 0, revenue: 0 }
    };

    dailyTickets.forEach(t => {
      if (statsByCategory[t.category]) {
        statsByCategory[t.category].count += 1;
        statsByCategory[t.category].revenue += t.price;
      }
    });

    // Desglose por método de pago
    const paymentStats: Record<string, number> = {
      'Transferencia': 0,
      'Tarjeta de Crédito': 0,
      'Tarjeta de Débito': 0,
      'Mercado Pago': 0
    };

    dailySales.forEach(s => {
      if (paymentStats[s.paymentMethod] !== undefined) {
        paymentStats[s.paymentMethod] += s.totalAmount;
      }
    });

    const totalRevenue = dailySales.reduce((acc, s) => acc + s.totalAmount, 0);

    res.json({
      date: dateQuery,
      totalRevenue,
      salesCount: dailySales.length,
      ticketCount: dailyTickets.length,
      validatedCount: dailyTickets.filter(t => t.validated).length,
      byCategory: statsByCategory,
      byPayment: paymentStats,
      salesList: dailySales
    });
  });

  app.get('/api/reports/stats', requireAuth, (req: Request, res: Response) => {
    const sales = db.getSales();
    const tickets = db.getTickets();

    // Group sales by day for the last 7 days to draw charts
    const dailyTrendMap = new Map<string, { date: string; revenue: number; tickets: number }>();
    
    // Seed trend map for the last 7 days
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      dailyTrendMap.set(dStr, { date: dStr, revenue: 0, tickets: 0 });
    }

    sales.forEach(s => {
      const day = s.timestamp.split('T')[0];
      if (dailyTrendMap.has(day)) {
        const current = dailyTrendMap.get(day)!;
        current.revenue += s.totalAmount;
        dailyTrendMap.set(day, current);
      }
    });

    tickets.forEach(t => {
      const day = t.purchaseDate.split('T')[0];
      if (dailyTrendMap.has(day)) {
        const current = dailyTrendMap.get(day)!;
        current.tickets += 1;
        dailyTrendMap.set(day, current);
      }
    });

    const trendData = Array.from(dailyTrendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Distribution by Category
    const categoryDistribution = [
      { name: 'Extranjero', value: tickets.filter(t => t.category === 'extranjero').length, revenue: tickets.filter(t => t.category === 'extranjero').reduce((acc, t) => acc + t.price, 0) },
      { name: 'Nacional', value: tickets.filter(t => t.category === 'nacional').length, revenue: tickets.filter(t => t.category === 'nacional').reduce((acc, t) => acc + t.price, 0) },
      { name: 'Residente Chubut', value: tickets.filter(t => t.category === 'residente').length, revenue: tickets.filter(t => t.category === 'residente').reduce((acc, t) => acc + t.price, 0) },
      { name: 'Menor / Jubilado', value: tickets.filter(t => t.category === 'minor').length, revenue: 0 }
    ];

    // Method of Payment Distribution
    const paymentMethodsStats = [
      { name: 'Mercado Pago', value: sales.filter(s => s.paymentMethod === 'Mercado Pago').reduce((acc, s) => acc + s.totalAmount, 0) },
      { name: 'Transferencia', value: sales.filter(s => s.paymentMethod === 'Transferencia').reduce((acc, s) => acc + s.totalAmount, 0) },
      { name: 'Crédito', value: sales.filter(s => s.paymentMethod === 'Tarjeta de Crédito').reduce((acc, s) => acc + s.totalAmount, 0) },
      { name: 'Débito', value: sales.filter(s => s.paymentMethod === 'Tarjeta de Débito').reduce((acc, s) => acc + s.totalAmount, 0) }
    ];

    // Top active cashiers
    const cashiers = db.getUsers().filter(u => u.role === 'cajero');
    const cashierRanking = cashiers.map(c => {
      const cashierSales = sales.filter(s => s.userId === c.id);
      return {
        name: c.name,
        salesCount: cashierSales.length,
        revenue: cashierSales.reduce((acc, s) => acc + s.totalAmount, 0)
      };
    }).sort((a, b) => b.revenue - a.revenue);

    res.json({
      trend: trendData,
      categories: categoryDistribution,
      payments: paymentMethodsStats,
      cashiers: cashierRanking,
      totals: {
        revenue: sales.reduce((acc, s) => acc + s.totalAmount, 0),
        tickets: tickets.length,
        validated: tickets.filter(t => t.validated).length
      }
    });
  });

  // --- VITE MIDDLEWARE SETUP ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Server failed to start:', error);
});
