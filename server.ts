import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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

const JWT_SECRET = process.env.JWT_SECRET || 'punta-loma-mr-roboto-secure-key';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize DB and Seed Data
  db.initializeDatabase();

  // Middleware
  app.use(express.json());

  // CORS-like / Auth extraction middleware using JWT
  app.use((req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.user = {
          id: decoded.id,
          username: decoded.username,
          role: decoded.role,
          name: decoded.name
        };
      } catch (err) {
        // Token invalid or expired, proceed silently
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
    if (!user || !user.password) {
      res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
      return;
    }

    // Verify bcrypt password
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
      return;
    }

    const sessionUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name
    };

    // Sign expirable JWT
    const token = jwt.sign(sessionUser, JWT_SECRET, { expiresIn: '8h' });

    res.json({
      token,
      user: sessionUser
    });
  });

  app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
    res.json({ user: req.user });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
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
      res.status(400).json({ error: 'Todos los campos (usuario, contraseña, nombre y rol) son obligatorios' });
      return;
    }

    const trimmedUsername = username.trim();
    const trimmedName = name.trim();

    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20 || !usernameRegex.test(trimmedUsername)) {
      res.status(422).json({ error: 'El nombre de usuario debe tener entre 3 y 20 caracteres y contener solo letras, números, puntos o guiones bajos.' });
      return;
    }

    if (password.length < 6) {
      res.status(422).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 50) {
      res.status(422).json({ error: 'El nombre completo debe tener entre 2 y 50 caracteres.' });
      return;
    }

    if (role !== 'admin' && role !== 'cajero') {
      res.status(422).json({ error: 'El rol especificado es inválido.' });
      return;
    }

    const users = db.getUsers();
    // Check if duplicate
    const exists = db.getUserWithPassword(trimmedUsername);
    if (exists) {
      res.status(422).json({ error: 'El nombre de usuario ya está registrado' });
      return;
    }

    const newUser: db.User = {
      id: `usr-${Date.now()}`,
      username: trimmedUsername,
      password,
      role,
      name: trimmedName,
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

    const exUser = users[userIndex];

    const trimmedUsername = username !== undefined ? username.trim() : exUser.username;
    const trimmedName = name !== undefined ? name.trim() : exUser.name;
    const resolvedRole = role || exUser.role;

    if (username !== undefined) {
      const usernameRegex = /^[a-zA-Z0-9._]+$/;
      if (trimmedUsername.length < 3 || trimmedUsername.length > 20 || !usernameRegex.test(trimmedUsername)) {
        res.status(422).json({ error: 'El nombre de usuario debe tener entre 3 y 20 caracteres y contener solo letras, números, puntos o guiones bajos.' });
        return;
      }
      
      const exists = db.getUserWithPassword(trimmedUsername);
      if (exists && exists.id !== userId) {
        res.status(422).json({ error: 'El nombre de usuario ya está registrado por otro operador.' });
        return;
      }
    }

    if (password !== undefined && password.length < 6) {
      res.status(422).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    if (name !== undefined && (trimmedName.length < 2 || trimmedName.length > 50)) {
      res.status(422).json({ error: 'El nombre completo debe tener entre 2 y 50 caracteres.' });
      return;
    }

    if (role !== undefined && resolvedRole !== 'admin' && resolvedRole !== 'cajero') {
      res.status(422).json({ error: 'El rol especificado es inválido.' });
      return;
    }

    const updatedUser: db.User = {
      id: userId,
      username: trimmedUsername,
      password: password || undefined,
      name: trimmedName,
      role: resolvedRole,
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
    if (initialBalance === undefined || initialBalance === null || String(initialBalance).trim() === '') {
      res.status(400).json({ error: 'El saldo inicial de apertura es obligatorio' });
      return;
    }

    const balanceNum = parseFloat(initialBalance);
    if (isNaN(balanceNum) || balanceNum < 0) {
      res.status(422).json({ error: 'El saldo inicial de apertura debe ser un número válido mayor o igual a cero.' });
      return;
    }

    try {
      const openCaja = db.openCaja(req.user!.id, req.user!.name, balanceNum);
      res.json({ message: 'Caja abierta con éxito', openCaja });
    } catch (err: any) {
      res.status(422).json({ error: err.message });
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
      res.status(400).json({ error: 'Los datos de pago electrónico (método y referencia) son obligatorios.' });
      return;
    }

    const allowedPaymentMethods = ['Transferencia', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Mercado Pago'];
    if (!allowedPaymentMethods.includes(paymentMethod)) {
      res.status(422).json({ error: 'El método de pago especificado no es válido.' });
      return;
    }

    const trimmedPaymentRef = paymentRef.trim();
    if (trimmedPaymentRef.length < 3 || trimmedPaymentRef.length > 50) {
      res.status(422).json({ error: 'La referencia de pago electrónico debe tener entre 3 y 50 caracteres.' });
      return;
    }

    const trimmedCustomerResidence = customerResidence ? customerResidence.trim() : '';
    if (!trimmedCustomerResidence || trimmedCustomerResidence.length < 3) {
      res.status(422).json({ error: 'El país y ciudad de residencia del comprador principal es obligatorio y debe tener al menos 3 caracteres.' });
      return;
    }

    // Validate items
    let totalQty = 0;
    for (const item of items) {
      const allowedCategories = ['extranjero', 'nacional', 'residente', 'minor'];
      if (!item.category || !allowedCategories.includes(item.category)) {
        res.status(422).json({ error: 'La categoría de entrada especificada no es válida.' });
        return;
      }
      const qtyNum = parseInt(item.qty);
      if (isNaN(qtyNum) || qtyNum < 0 || qtyNum > 100) {
        res.status(422).json({ error: 'La cantidad de entradas por categoría debe ser un número entero entre 0 y 100.' });
        return;
      }
      totalQty += qtyNum;

      if (item.holders && Array.isArray(item.holders)) {
        for (let idx = 0; idx < item.holders.length; idx++) {
          const holder = item.holders[idx];
          if (holder.residence && holder.residence.trim().length > 0 && holder.residence.trim().length < 3) {
            res.status(422).json({ error: `La residencia del visitante #${idx + 1} de la categoría ${item.category} debe tener al menos 3 caracteres si se especifica.` });
            return;
          }
        }
      }
    }

    if (totalQty === 0) {
      res.status(422).json({ error: 'La cantidad total de entradas emitidas debe ser mayor a cero.' });
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
    const dbSqlite = db.getDB();

    // Fetch sales for the day
    const dailySalesRows = dbSqlite.prepare(`
      SELECT id, timestamp, cajaId, userId, userName, items, paymentMethod, totalAmount, paymentRef, customerName, customerDni, customerResidence 
      FROM sales 
      WHERE timestamp LIKE ?
    `).all(dateQuery + '%');

    const dailySales = dailySalesRows.map((r: any) => ({
      id: r.id,
      timestamp: r.timestamp,
      cajaId: r.cajaId,
      userId: r.userId,
      userName: r.userName,
      items: JSON.parse(r.items),
      paymentMethod: r.paymentMethod,
      totalAmount: r.totalAmount,
      paymentRef: r.paymentRef,
      customerName: r.customerName || undefined,
      customerDni: r.customerDni || undefined,
      customerResidence: r.customerResidence || undefined
    }));

    // Aggregate category counts and revenues directly in SQLite
    const categoryStatsRows = dbSqlite.prepare(`
      SELECT category, COUNT(*) as count, SUM(price) as revenue 
      FROM tickets 
      WHERE purchaseDate LIKE ? 
      GROUP BY category
    `).all(dateQuery + '%');

    const statsByCategory = {
      extranjero: { count: 0, revenue: 0 },
      nacional: { count: 0, revenue: 0 },
      residente: { count: 0, revenue: 0 },
      minor: { count: 0, revenue: 0 }
    };

    categoryStatsRows.forEach((r: any) => {
      if (r.category in statsByCategory) {
        statsByCategory[r.category as keyof typeof statsByCategory] = {
          count: r.count,
          revenue: r.revenue
        };
      }
    });

    // Aggregate payment methods directly in SQLite
    const paymentStatsRows = dbSqlite.prepare(`
      SELECT paymentMethod, SUM(totalAmount) as revenue 
      FROM sales 
      WHERE timestamp LIKE ? 
      GROUP BY paymentMethod
    `).all(dateQuery + '%');

    const paymentStats: Record<string, number> = {
      'Transferencia': 0,
      'Tarjeta de Crédito': 0,
      'Tarjeta de Débito': 0,
      'Mercado Pago': 0
    };

    paymentStatsRows.forEach((r: any) => {
      if (r.paymentMethod in paymentStats) {
        paymentStats[r.paymentMethod] = r.revenue;
      }
    });

    // Ticket counts and validated count
    const ticketCounts = dbSqlite.prepare(`
      SELECT COUNT(*) as total, SUM(CASE WHEN validated = 1 THEN 1 ELSE 0 END) as validated 
      FROM tickets 
      WHERE purchaseDate LIKE ?
    `).get(dateQuery + '%') || { total: 0, validated: 0 };

    const totalRevenue = dailySales.reduce((acc, s) => acc + s.totalAmount, 0);

    res.json({
      date: dateQuery,
      totalRevenue,
      salesCount: dailySales.length,
      ticketCount: ticketCounts.total,
      validatedCount: ticketCounts.validated || 0,
      byCategory: statsByCategory,
      byPayment: paymentStats,
      salesList: dailySales
    });
  });

  app.get('/api/reports/stats', requireAuth, (req: Request, res: Response) => {
    const dbSqlite = db.getDB();

    // 1. Seed trend map for the last 8 days
    const dailyTrendMap = new Map<string, { date: string; revenue: number; tickets: number }>();
    const datesList: string[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      dailyTrendMap.set(dStr, { date: dStr, revenue: 0, tickets: 0 });
      datesList.push(dStr);
    }

    const minDate = datesList[0];
    const maxDate = datesList[datesList.length - 1] + 'T23:59:59';

    // Query sales trend
    const salesTrend = dbSqlite.prepare(`
      SELECT SUBSTR(timestamp, 1, 10) as day, SUM(totalAmount) as revenue 
      FROM sales 
      WHERE timestamp BETWEEN ? AND ? 
      GROUP BY day
    `).all(minDate, maxDate);

    salesTrend.forEach((r: any) => {
      if (dailyTrendMap.has(r.day)) {
        dailyTrendMap.get(r.day)!.revenue = r.revenue;
      }
    });

    // Query tickets trend
    const ticketsTrend = dbSqlite.prepare(`
      SELECT SUBSTR(purchaseDate, 1, 10) as day, COUNT(*) as count 
      FROM tickets 
      WHERE purchaseDate BETWEEN ? AND ? 
      GROUP BY day
    `).all(minDate, maxDate);

    ticketsTrend.forEach((r: any) => {
      if (dailyTrendMap.has(r.day)) {
        dailyTrendMap.get(r.day)!.tickets = r.count;
      }
    });

    const trendData = Array.from(dailyTrendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // 2. Category Distribution
    const categoryStats = dbSqlite.prepare(`
      SELECT category, COUNT(*) as count, SUM(price) as revenue 
      FROM tickets 
      GROUP BY category
    `).all();

    const categoryMap: Record<string, { value: number; revenue: number }> = {
      extranjero: { value: 0, revenue: 0 },
      nacional: { value: 0, revenue: 0 },
      residente: { value: 0, revenue: 0 },
      minor: { value: 0, revenue: 0 }
    };

    categoryStats.forEach((r: any) => {
      if (r.category in categoryMap) {
        categoryMap[r.category] = { value: r.count, revenue: r.revenue };
      }
    });

    const categoryDistribution = [
      { name: 'Extranjero', value: categoryMap.extranjero.value, revenue: categoryMap.extranjero.revenue },
      { name: 'Nacional', value: categoryMap.nacional.value, revenue: categoryMap.nacional.revenue },
      { name: 'Residente Chubut', value: categoryMap.residente.value, revenue: categoryMap.residente.revenue },
      { name: 'Menor / Jubilado', value: categoryMap.minor.value, revenue: categoryMap.minor.revenue }
    ];

    // 3. Method of Payment Distribution
    const paymentStats = dbSqlite.prepare(`
      SELECT paymentMethod, SUM(totalAmount) as value 
      FROM sales 
      GROUP BY paymentMethod
    `).all();

    const paymentMap: Record<string, number> = {
      'Mercado Pago': 0,
      'Transferencia': 0,
      'Tarjeta de Crédito': 0,
      'Tarjeta de Débito': 0
    };

    paymentStats.forEach((r: any) => {
      paymentMap[r.paymentMethod] = r.value;
    });

    const paymentMethodsStats = [
      { name: 'Mercado Pago', value: paymentMap['Mercado Pago'] || 0 },
      { name: 'Transferencia', value: paymentMap['Transferencia'] || 0 },
      { name: 'Crédito', value: paymentMap['Tarjeta de Crédito'] || 0 },
      { name: 'Débito', value: paymentMap['Tarjeta de Débito'] || 0 }
    ];

    // 4. Top active cashiers
    const cashierStats = dbSqlite.prepare(`
      SELECT userId, userName, COUNT(*) as count, SUM(totalAmount) as revenue 
      FROM sales 
      GROUP BY userId, userName
    `).all();

    const usersList = db.getUsers();
    const cashiers = usersList.filter(u => u.role === 'cajero');

    const cashierRanking = cashiers.map(c => {
      const stats = cashierStats.find((s: any) => s.userId === c.id) || { count: 0, revenue: 0 };
      return {
        name: c.name,
        salesCount: stats.count,
        revenue: stats.revenue
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // 5. Overall Totals
    const overallTotals = dbSqlite.prepare(`
      SELECT 
        (SELECT SUM(totalAmount) FROM sales) as totalRevenue,
        (SELECT COUNT(*) FROM tickets) as totalTickets,
        (SELECT COUNT(*) FROM tickets WHERE validated = 1) as totalValidated
    `).get() || { totalRevenue: 0, totalTickets: 0, totalValidated: 0 };

    res.json({
      trend: trendData,
      categories: categoryDistribution,
      payments: paymentMethodsStats,
      cashiers: cashierRanking,
      totals: {
        revenue: overallTotals.totalRevenue || 0,
        tickets: overallTotals.totalTickets || 0,
        validated: overallTotals.totalValidated || 0
      }
    });
  });

  // Serve static assets in production mode
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handling Middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled Server Error:', err);
    const statusCode = err.status || 500;
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(statusCode).json({
      error: isProduction ? 'Ocurrió un error interno en el servidor.' : err.message,
      ...(isProduction ? {} : { stack: err.stack })
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Server failed to start:', error);
});
