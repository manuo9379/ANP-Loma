import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import * as bcrypt from 'bcryptjs';

// Define DB directory paths
const DB_DIR = path.resolve('./db/data');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const CAJAS_FILE = path.join(DB_DIR, 'cajas.json');
const SALES_FILE = path.join(DB_DIR, 'sales.json');
const TICKETS_FILE = path.join(DB_DIR, 'tickets.json');
const SETTINGS_FILE = path.join(DB_DIR, 'settings.json');
const SQLITE_FILE = path.join(DB_DIR, 'boleteria.db');

// Interface Declarations
export interface User {
  id: string;
  username: string;
  password?: string;
  role: 'admin' | 'cajero';
  name: string;
  active: boolean;
}

export interface Caja {
  id: string;
  userId: string;
  userName: string;
  openTime: string;
  closeTime: string | null;
  status: 'open' | 'closed';
  initialBalance: number;
  currentSales: number;
  finalBalance: number;
  salesCount: number;
}

export interface SaleItem {
  category: 'extranjero' | 'nacional' | 'residente' | 'minor';
  qty: number;
  price: number;
  total: number;
}

export interface Sale {
  id: string;
  timestamp: string;
  cajaId: string;
  userId: string;
  userName: string;
  items: SaleItem[];
  paymentMethod: 'Transferencia' | 'Tarjeta de Crédito' | 'Tarjeta de Débito' | 'Mercado Pago';
  totalAmount: number;
  paymentRef: string;
  customerName?: string;
  customerDni?: string;
  customerResidence?: string;
}

export interface Ticket {
  id: string;
  saleId: string;
  ticketCode: string;
  category: 'extranjero' | 'nacional' | 'residente' | 'minor';
  price: number;
  customerName?: string;
  customerDni?: string;
  customerResidence?: string;
  purchaseDate: string;
  validated: boolean;
  validatedAt?: string;
  validatedBy?: string;
  qrDataUrl?: string;
}

export interface SystemSettings {
  ticketPrices: {
    extranjero: number;
    nacional: number;
    residente: number;
    minor: number;
  };
}

let dbInstance: any = null;

export function getDB() {
  if (!dbInstance) {
    ensureDirectoryExistence();
    dbInstance = new Database(SQLITE_FILE);
    // Enable WAL mode for performance
    dbInstance.pragma('journal_mode = WAL');
    // Enable foreign keys constraint support
    dbInstance.pragma('foreign_keys = ON');
  }
  return dbInstance;
}

function ensureDirectoryExistence() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

// Seed Initial Data and Migrate JSON to SQLite
export function initializeDatabase() {
  ensureDirectoryExistence();
  const db = getDB();

  // Create SQLite Tables with Foreign Key Constraints
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT,
      name TEXT,
      active INTEGER
    );

    CREATE TABLE IF NOT EXISTS cajas (
      id TEXT PRIMARY KEY,
      userId TEXT,
      userName TEXT,
      openTime TEXT,
      closeTime TEXT,
      status TEXT,
      initialBalance REAL,
      currentSales REAL,
      finalBalance REAL,
      salesCount INTEGER,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      timestamp TEXT,
      cajaId TEXT,
      userId TEXT,
      userName TEXT,
      items TEXT,
      paymentMethod TEXT,
      totalAmount REAL,
      paymentRef TEXT,
      customerName TEXT,
      customerDni TEXT,
      customerResidence TEXT,
      FOREIGN KEY(cajaId) REFERENCES cajas(id) ON DELETE RESTRICT,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      saleId TEXT,
      ticketCode TEXT UNIQUE,
      category TEXT,
      price REAL,
      customerName TEXT,
      customerDni TEXT,
      customerResidence TEXT,
      purchaseDate TEXT,
      validated INTEGER,
      validatedAt TEXT,
      validatedBy TEXT,
      FOREIGN KEY(saleId) REFERENCES sales(id) ON DELETE CASCADE
    );
  `);

  // Performance Indexing
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sales_timestamp ON sales(timestamp);
    CREATE INDEX IF NOT EXISTS idx_tickets_purchasedate ON tickets(purchaseDate);
    CREATE INDEX IF NOT EXISTS idx_cajas_userid ON cajas(userId);
  `);

  // Schema upgrade for existing databases (adds FOREIGN KEY constraints if missing)
  try {
    const schemaCajas = db.prepare("SELECT sql FROM sqlite_schema WHERE name = 'cajas'").get()?.sql || '';
    if (schemaCajas && !schemaCajas.includes('FOREIGN KEY')) {
      console.log("Upgrading 'cajas' table schema to add foreign key constraints...");
      db.exec(`
        PRAGMA foreign_keys = OFF;
        ALTER TABLE cajas RENAME TO cajas_old;
        CREATE TABLE cajas (
          id TEXT PRIMARY KEY,
          userId TEXT,
          userName TEXT,
          openTime TEXT,
          closeTime TEXT,
          status TEXT,
          initialBalance REAL,
          currentSales REAL,
          finalBalance REAL,
          salesCount INTEGER,
          FOREIGN KEY(userId) REFERENCES users(id) ON DELETE RESTRICT
        );
        INSERT INTO cajas SELECT id, userId, userName, openTime, closeTime, status, initialBalance, currentSales, finalBalance, salesCount FROM cajas_old;
        DROP TABLE cajas_old;
        PRAGMA foreign_keys = ON;
      `);
    }

    const schemaSales = db.prepare("SELECT sql FROM sqlite_schema WHERE name = 'sales'").get()?.sql || '';
    if (schemaSales && !schemaSales.includes('FOREIGN KEY')) {
      console.log("Upgrading 'sales' table schema to add foreign key constraints...");
      db.exec(`
        PRAGMA foreign_keys = OFF;
        ALTER TABLE sales RENAME TO sales_old;
        CREATE TABLE sales (
          id TEXT PRIMARY KEY,
          timestamp TEXT,
          cajaId TEXT,
          userId TEXT,
          userName TEXT,
          items TEXT,
          paymentMethod TEXT,
          totalAmount REAL,
          paymentRef TEXT,
          customerName TEXT,
          customerDni TEXT,
          customerResidence TEXT,
          FOREIGN KEY(cajaId) REFERENCES cajas(id) ON DELETE RESTRICT,
          FOREIGN KEY(userId) REFERENCES users(id) ON DELETE RESTRICT
        );
        INSERT INTO sales SELECT id, timestamp, cajaId, userId, userName, items, paymentMethod, totalAmount, paymentRef, customerName, customerDni, customerResidence FROM sales_old;
        DROP TABLE sales_old;
        PRAGMA foreign_keys = ON;
      `);
    }

    const schemaTickets = db.prepare("SELECT sql FROM sqlite_schema WHERE name = 'tickets'").get()?.sql || '';
    if (schemaTickets && !schemaTickets.includes('FOREIGN KEY')) {
      console.log("Upgrading 'tickets' table schema to add foreign key constraints...");
      db.exec(`
        PRAGMA foreign_keys = OFF;
        ALTER TABLE tickets RENAME TO tickets_old;
        CREATE TABLE tickets (
          id TEXT PRIMARY KEY,
          saleId TEXT,
          ticketCode TEXT UNIQUE,
          category TEXT,
          price REAL,
          customerName TEXT,
          customerDni TEXT,
          customerResidence TEXT,
          purchaseDate TEXT,
          validated INTEGER,
          validatedAt TEXT,
          validatedBy TEXT,
          FOREIGN KEY(saleId) REFERENCES sales(id) ON DELETE CASCADE
        );
        INSERT INTO tickets SELECT id, saleId, ticketCode, category, price, customerName, customerDni, customerResidence, purchaseDate, validated, validatedAt, validatedBy FROM tickets_old;
        DROP TABLE tickets_old;
        PRAGMA foreign_keys = ON;
      `);
    }
  } catch (schemaErr) {
    console.error("Error migrating schema constraints:", schemaErr);
  }

  // Migrate JSON to SQLite if JSON files exist and tables are empty
  migrateJsonToSqlite(db);
}

function migrateJsonToSqlite(db: any) {
  // 1. Settings
  const settingsCount = db.prepare("SELECT COUNT(*) as count FROM settings").get().count;
  if (settingsCount === 0) {
    const defaultSettings: SystemSettings = {
      ticketPrices: { extranjero: 10000, nacional: 5000, residente: 2500, minor: 0 }
    };
    let currentSettings = defaultSettings;
    if (fs.existsSync(SETTINGS_FILE)) {
      try {
        currentSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      } catch (e) {
        console.error("Error reading SETTINGS_FILE during migration:", e);
      }
    }
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
      .run('system_settings', JSON.stringify(currentSettings));
  }

  // 2. Users
  const usersCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  if (usersCount === 0) {
    const defaultUsers: User[] = [
      { id: 'usr-1', username: 'admin', password: 'admin123', role: 'admin', name: 'Administrador de Área', active: true },
      { id: 'usr-2', username: 'cajero1', password: 'cajero123', role: 'cajero', name: 'Juan Pérez', active: true },
      { id: 'usr-3', username: 'cajero2', password: 'cajero123', role: 'cajero', name: 'María Gómez', active: true }
    ];
    let currentUsers = defaultUsers;
    if (fs.existsSync(USERS_FILE)) {
      try {
        const fileContent = fs.readFileSync(USERS_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        if (Array.isArray(parsed) && parsed.length > 0) {
          currentUsers = parsed;
        }
      } catch (e) {
        console.error("Error reading USERS_FILE during migration:", e);
      }
    }
    const insertUser = db.prepare("INSERT OR REPLACE INTO users (id, username, password, role, name, active) VALUES (?, ?, ?, ?, ?, ?)");
    const trans = db.transaction((usersList: User[]) => {
      for (const u of usersList) {
        const rawPassword = u.password || 'cajero123';
        const passwordHash = (rawPassword.startsWith('$2a$') || rawPassword.startsWith('$2b$'))
          ? rawPassword
          : bcrypt.hashSync(rawPassword, 10);
        insertUser.run(u.id, u.username, passwordHash, u.role, u.name, u.active ? 1 : 0);
      }
    });
    trans(currentUsers);
  }

  // 3. Cajas
  const cajasCount = db.prepare("SELECT COUNT(*) as count FROM cajas").get().count;
  if (cajasCount === 0 && fs.existsSync(CAJAS_FILE)) {
    try {
      const fileContent = fs.readFileSync(CAJAS_FILE, 'utf-8');
      const cajasList: Caja[] = JSON.parse(fileContent);
      if (Array.isArray(cajasList) && cajasList.length > 0) {
        const insertCaja = db.prepare("INSERT INTO cajas (id, userId, userName, openTime, closeTime, status, initialBalance, currentSales, finalBalance, salesCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        const trans = db.transaction((list: Caja[]) => {
          for (const c of list) {
            insertCaja.run(c.id, c.userId, c.userName, c.openTime, c.closeTime, c.status, c.initialBalance, c.currentSales, c.finalBalance, c.salesCount);
          }
        });
        trans(cajasList);
      }
    } catch (e) {
      console.error("Error reading CAJAS_FILE during migration:", e);
    }
  }

  // 4. Sales
  const salesCount = db.prepare("SELECT COUNT(*) as count FROM sales").get().count;
  if (salesCount === 0 && fs.existsSync(SALES_FILE)) {
    try {
      const fileContent = fs.readFileSync(SALES_FILE, 'utf-8');
      const salesList: Sale[] = JSON.parse(fileContent);
      if (Array.isArray(salesList) && salesList.length > 0) {
        const insertSale = db.prepare("INSERT INTO sales (id, timestamp, cajaId, userId, userName, items, paymentMethod, totalAmount, paymentRef, customerName, customerDni, customerResidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        const trans = db.transaction((list: Sale[]) => {
          for (const s of list) {
            insertSale.run(s.id, s.timestamp, s.cajaId, s.userId, s.userName, JSON.stringify(s.items), s.paymentMethod, s.totalAmount, s.paymentRef, s.customerName || '', s.customerDni || '', s.customerResidence || '');
          }
        });
        trans(salesList);
      }
    } catch (e) {
      console.error("Error reading SALES_FILE during migration:", e);
    }
  }

  // 5. Tickets
  const ticketsCount = db.prepare("SELECT COUNT(*) as count FROM tickets").get().count;
  if (ticketsCount === 0 && fs.existsSync(TICKETS_FILE)) {
    try {
      const fileContent = fs.readFileSync(TICKETS_FILE, 'utf-8');
      const ticketsList: Ticket[] = JSON.parse(fileContent);
      if (Array.isArray(ticketsList) && ticketsList.length > 0) {
        const insertTicket = db.prepare("INSERT INTO tickets (id, saleId, ticketCode, category, price, customerName, customerDni, customerResidence, purchaseDate, validated, validatedAt, validatedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        const trans = db.transaction((list: Ticket[]) => {
          for (const t of list) {
            insertTicket.run(t.id, t.saleId, t.ticketCode, t.category, t.price, t.customerName || '', t.customerDni || '', t.customerResidence || '', t.purchaseDate, t.validated ? 1 : 0, t.validatedAt || null, t.validatedBy || null);
          }
        });
        trans(ticketsList);
      }
    } catch (e) {
      console.error("Error reading TICKETS_FILE during migration:", e);
    }
  }

  // Seed default data if empty database (no json files and tables are empty)
  const hasCajas = db.prepare("SELECT COUNT(*) as count FROM cajas").get().count > 0;
  const hasSales = db.prepare("SELECT COUNT(*) as count FROM sales").get().count > 0;
  if (!hasCajas && !hasSales) {
    console.log("Seeding simulated SQLite database with 7 days of historical sales...");
    seedSimulatedSqlite(db);
  }

  // Optional: Back up / rename old JSON files to avoid migrating them again next start
  try {
    const backupJsonDir = path.join(DB_DIR, 'json_backup');
    if (!fs.existsSync(backupJsonDir)) {
      fs.mkdirSync(backupJsonDir);
    }
    const jsonFiles = [SETTINGS_FILE, USERS_FILE, CAJAS_FILE, SALES_FILE, TICKETS_FILE];
    for (const f of jsonFiles) {
      if (fs.existsSync(f)) {
        fs.renameSync(f, path.join(backupJsonDir, path.basename(f)));
      }
    }
  } catch (err) {
    console.error("Error backing up migrated JSON files:", err);
  }
}

function seedSimulatedSqlite(db: any) {
  // Category configurations
  const categories = [
    { key: 'extranjero', price: 10000 },
    { key: 'nacional', price: 5000 },
    { key: 'residente', price: 2500 },
    { key: 'minor', price: 0 }
  ] as const;

  const paymentMethods = ['Transferencia', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Mercado Pago'] as const;

  const names = [
    'Carlos Bianchi', 'Ana Martínez', 'Esteban Quito', 'Sofía Rodríguez', 'Mateo López', 
    'Lucía Fernández', 'Bautista González', 'Catalina Díaz', 'John Doe', 'Pierre Dupont', 
    'Hans Müller', 'Emily Smith', 'Yuki Tanaka', 'Pedro Chubut'
  ];

  const insertCaja = db.prepare("INSERT INTO cajas (id, userId, userName, openTime, closeTime, status, initialBalance, currentSales, finalBalance, salesCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const insertSale = db.prepare("INSERT INTO sales (id, timestamp, cajaId, userId, userName, items, paymentMethod, totalAmount, paymentRef, customerName, customerDni, customerResidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const insertTicket = db.prepare("INSERT INTO tickets (id, saleId, ticketCode, category, price, customerName, customerDni, customerResidence, purchaseDate, validated, validatedAt, validatedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

  // Run in a transaction for speed and safety
  const seedTransaction = db.transaction(() => {
    // Seed data over past 7 days (June 24 to June 30, 2026)
    for (let dayOffset = 7; dayOffset >= 1; dayOffset--) {
      const date = new Date('2026-07-01T10:00:00-03:00');
      date.setDate(date.getDate() - dayOffset);
      const dateStr = date.toISOString().split('T')[0];

      // Two shifts per day (Morning and Afternoon)
      const shifts = [
        { start: '08:00', end: '13:00', user: { id: 'usr-2', name: 'Juan Pérez' } },
        { start: '13:00', end: '18:00', user: { id: 'usr-3', name: 'María Gómez' } }
      ];

      shifts.forEach((shift, shiftIndex) => {
        const cajaId = `caja-${dateStr}-${shiftIndex}`;
        const openTime = `${dateStr}T${shift.start}:00-03:00`;
        const closeTime = `${dateStr}T${shift.end}:00-03:00`;

        let currentSales = 0;
        let salesCount = 0;

        const salesInShift = Math.floor(Math.random() * 8) + 5; // 5-12 sales per shift

        for (let s = 0; s < salesInShift; s++) {
          const saleId = `sale-${cajaId}-${s}`;
          const saleMinutes = Math.floor(Math.random() * 240); // within 4 hours
          const saleTime = new Date(new Date(openTime).getTime() + saleMinutes * 60000).toISOString();

          const saleItems: SaleItem[] = [];
          let saleTotal = 0;

          const numCategoriesInSale = Math.floor(Math.random() * 2) + 1;
          const shuffledCategories = [...categories].sort(() => Math.random() - 0.5);

          for (let c = 0; c < numCategoriesInSale; c++) {
            const cat = shuffledCategories[c];
            const qty = Math.floor(Math.random() * 3) + 1; // 1-3 tickets
            const total = qty * cat.price;

            saleItems.push({
              category: cat.key,
              qty,
              price: cat.price,
              total
            });

            saleTotal += total;

            for (let t = 0; t < qty; t++) {
              const ticketId = `ticket-${saleId}-${cat.key}-${t}`;
              const ticketCode = `PL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
              const custIndex = Math.floor(Math.random() * names.length);
              const name = names[custIndex];
              const dni = Math.floor(10000000 + Math.random() * 40000000).toString();
              const finalDni = cat.key === 'extranjero' ? `PA-${Math.random().toString(36).substring(2, 8).toUpperCase()}` : dni;

              const validated = dayOffset > 1 || Math.random() > 0.3;
              const validatedAt = validated ? new Date(new Date(saleTime).getTime() + 15 * 60000).toISOString() : null;
              const validatedBy = validated ? 'usr-1' : null;

              insertTicket.run(
                ticketId,
                saleId,
                ticketCode,
                cat.key,
                cat.price,
                name,
                finalDni,
                'Argentina',
                saleTime,
                validated ? 1 : 0,
                validatedAt,
                validatedBy
              );
            }
          }

          const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
          const paymentRef = `E-${Math.floor(10000000 + Math.random() * 90000000)}`;

          insertSale.run(
            saleId,
            saleTime,
            cajaId,
            shift.user.id,
            shift.user.name,
            JSON.stringify(saleItems),
            paymentMethod,
            saleTotal,
            paymentRef,
            names[Math.floor(Math.random() * names.length)],
            Math.floor(20000000 + Math.random() * 25000000).toString(),
            'Argentina'
          );

          currentSales += saleTotal;
          salesCount++;
        }

        insertCaja.run(
          cajaId,
          shift.user.id,
          shift.user.name,
          openTime,
          closeTime,
          'closed',
          0,
          currentSales,
          currentSales,
          salesCount
        );
      });
    }
  });

  seedTransaction();
}

// DB Data Actions

// Settings Accessors
export function getSettings(): SystemSettings {
  const db = getDB();
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get('system_settings');
  if (row) {
    return JSON.parse(row.value);
  }
  return {
    ticketPrices: { extranjero: 10000, nacional: 5000, residente: 2500, minor: 0 }
  };
}

export function saveSettings(settings: SystemSettings) {
  const db = getDB();
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
    .run('system_settings', JSON.stringify(settings));
}

// User Actions
export function getUsers(): User[] {
  const db = getDB();
  const rows = db.prepare("SELECT id, username, role, name, active FROM users").all();
  return rows.map((r: any) => ({
    id: r.id,
    username: r.username,
    role: r.role,
    name: r.name,
    active: r.active === 1
  }));
}

export function saveUsers(users: User[]) {
  const db = getDB();
  // Get all existing users to preserve passwords if editing
  const existingUsers = db.prepare("SELECT id, password FROM users").all();
  const insertUser = db.prepare("INSERT OR REPLACE INTO users (id, username, password, role, name, active) VALUES (?, ?, ?, ?, ?, ?)");
  
  const trans = db.transaction((usersList: User[]) => {
    for (const u of usersList) {
      const existing = existingUsers.find((ex: any) => ex.id === u.id);
      let password = u.password || existing?.password || 'cajero123';
      if (u.password && !u.password.startsWith('$2a$') && !u.password.startsWith('$2b$')) {
        password = bcrypt.hashSync(u.password, 10);
      }
      insertUser.run(u.id, u.username, password, u.role, u.name, u.active ? 1 : 0);
    }
  });
  trans(users);
}

export function getUserWithPassword(username: string): User | undefined {
  const db = getDB();
  const row = db.prepare("SELECT id, username, password, role, name, active FROM users WHERE LOWER(username) = LOWER(?) AND active = 1").get(username);
  if (row) {
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      role: row.role,
      name: row.name,
      active: row.active === 1
    };
  }
  return undefined;
}

// Caja Actions
export function getCajas(): Caja[] {
  const db = getDB();
  const rows = db.prepare("SELECT id, userId, userName, openTime, closeTime, status, initialBalance, currentSales, finalBalance, salesCount FROM cajas").all();
  return rows.map((r: any) => ({
    id: r.id,
    userId: r.userId,
    userName: r.userName,
    openTime: r.openTime,
    closeTime: r.closeTime,
    status: r.status,
    initialBalance: r.initialBalance,
    currentSales: r.currentSales,
    finalBalance: r.finalBalance,
    salesCount: r.salesCount
  }));
}

export function getOpenCaja(userId: string): Caja | undefined {
  const db = getDB();
  const row = db.prepare("SELECT id, userId, userName, openTime, closeTime, status, initialBalance, currentSales, finalBalance, salesCount FROM cajas WHERE userId = ? AND status = 'open'").get(userId);
  if (row) {
    return {
      id: row.id,
      userId: row.userId,
      userName: row.userName,
      openTime: row.openTime,
      closeTime: r.closeTime,
      status: row.status,
      initialBalance: row.initialBalance,
      currentSales: row.currentSales,
      finalBalance: row.finalBalance,
      salesCount: row.salesCount
    };
  }
  return undefined;
}

export function openCaja(userId: string, userName: string, initialBalance: number): Caja {
  const db = getDB();
  const existingOpen = getOpenCaja(userId);
  if (existingOpen) {
    return existingOpen;
  }

  const newCaja: Caja = {
    id: `caja-${Date.now()}`,
    userId,
    userName,
    openTime: new Date().toISOString(),
    closeTime: null,
    status: 'open',
    initialBalance,
    currentSales: 0,
    finalBalance: initialBalance,
    salesCount: 0
  };

  db.prepare("INSERT INTO cajas (id, userId, userName, openTime, closeTime, status, initialBalance, currentSales, finalBalance, salesCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(newCaja.id, newCaja.userId, newCaja.userName, newCaja.openTime, newCaja.closeTime, newCaja.status, newCaja.initialBalance, newCaja.currentSales, newCaja.finalBalance, newCaja.salesCount);

  return newCaja;
}

export function closeCaja(cajaId: string): Caja {
  const db = getDB();
  const row = db.prepare("SELECT id, userId, userName, openTime, closeTime, status, initialBalance, currentSales, finalBalance, salesCount FROM cajas WHERE id = ?").get(cajaId);
  if (!row) {
    throw new Error('Caja no encontrada');
  }

  const closeTime = new Date().toISOString();
  const finalBalance = row.initialBalance + row.currentSales;

  db.prepare("UPDATE cajas SET status = 'closed', closeTime = ?, finalBalance = ? WHERE id = ?")
    .run(closeTime, finalBalance, cajaId);

  return {
    id: row.id,
    userId: row.userId,
    userName: row.userName,
    openTime: row.openTime,
    closeTime,
    status: 'closed',
    initialBalance: row.initialBalance,
    currentSales: row.currentSales,
    finalBalance,
    salesCount: row.salesCount
  };
}

// Sales Actions
export function getSales(): Sale[] {
  const db = getDB();
  const rows = db.prepare("SELECT id, timestamp, cajaId, userId, userName, items, paymentMethod, totalAmount, paymentRef, customerName, customerDni, customerResidence FROM sales").all();
  return rows.map((r: any) => ({
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
}

export function getTickets(): Ticket[] {
  const db = getDB();
  const rows = db.prepare("SELECT id, saleId, ticketCode, category, price, customerName, customerDni, customerResidence, purchaseDate, validated, validatedAt, validatedBy FROM tickets").all();
  return rows.map((r: any) => ({
    id: r.id,
    saleId: r.saleId,
    ticketCode: r.ticketCode,
    category: r.category,
    price: r.price,
    customerName: r.customerName || undefined,
    customerDni: r.customerDni || undefined,
    customerResidence: r.customerResidence || undefined,
    purchaseDate: r.purchaseDate,
    validated: r.validated === 1,
    validatedAt: r.validatedAt || undefined,
    validatedBy: r.validatedBy || undefined
  }));
}

export function createSale(
  cajaId: string,
  userId: string,
  userName: string,
  items: { category: 'extranjero' | 'nacional' | 'residente' | 'minor'; qty: number; customerName?: string; customerDni?: string; customerResidence?: string }[],
  paymentMethod: Sale['paymentMethod'],
  paymentRef: string,
  customerName?: string,
  customerDni?: string,
  customerResidence?: string
): { sale: Sale; tickets: Ticket[] } {
  const db = getDB();
  const caja = db.prepare("SELECT id, initialBalance, currentSales, status FROM cajas WHERE id = ? AND status = 'open'").get(cajaId);
  if (!caja) {
    throw new Error('La caja no está abierta o no existe.');
  }

  const settings = getSettings();
  const prices = settings.ticketPrices;

  const saleItems: SaleItem[] = [];
  let saleTotal = 0;
  const createdTickets: Ticket[] = [];
  const saleId = `sale-${Date.now()}`;
  const timestamp = new Date().toISOString();

  // Process items
  items.forEach(item => {
    if (item.qty <= 0) return;
    const price = prices[item.category];
    const total = item.qty * price;

    saleItems.push({
      category: item.category,
      qty: item.qty,
      price,
      total
    });

    saleTotal += total;

    // Create a ticket for each quantity
    for (let i = 0; i < item.qty; i++) {
      const ticketCode = `PL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      createdTickets.push({
        id: `ticket-${saleId}-${item.category}-${i}-${Date.now()}`,
        saleId,
        ticketCode,
        category: item.category,
        price,
        customerName: item.customerName || customerName || 'Visitante',
        customerDni: item.customerDni || customerDni || '',
        customerResidence: item.customerResidence || customerResidence || '',
        purchaseDate: timestamp,
        validated: false
      });
    }
  });

  const newSale: Sale = {
    id: saleId,
    timestamp,
    cajaId,
    userId,
    userName,
    items: saleItems,
    paymentMethod,
    totalAmount: saleTotal,
    paymentRef,
    customerName,
    customerDni,
    customerResidence
  };

  const runTransaction = db.transaction(() => {
    // 1. Insert Sale
    db.prepare("INSERT INTO sales (id, timestamp, cajaId, userId, userName, items, paymentMethod, totalAmount, paymentRef, customerName, customerDni, customerResidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(
        newSale.id,
        newSale.timestamp,
        newSale.cajaId,
        newSale.userId,
        newSale.userName,
        JSON.stringify(newSale.items),
        newSale.paymentMethod,
        newSale.totalAmount,
        newSale.paymentRef,
        newSale.customerName || '',
        newSale.customerDni || '',
        newSale.customerResidence || ''
      );

    // 2. Insert Tickets
    const insertTicket = db.prepare("INSERT INTO tickets (id, saleId, ticketCode, category, price, customerName, customerDni, customerResidence, purchaseDate, validated, validatedAt, validatedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    for (const t of createdTickets) {
      insertTicket.run(t.id, t.saleId, t.ticketCode, t.category, t.price, t.customerName || '', t.customerDni || '', t.customerResidence || '', t.purchaseDate, 0, null, null);
    }

    // 3. Update Caja balances
    const newCurrentSales = caja.currentSales + saleTotal;
    const newFinalBalance = caja.initialBalance + newCurrentSales;
    db.prepare("UPDATE cajas SET currentSales = ?, salesCount = salesCount + 1, finalBalance = ? WHERE id = ?")
      .run(newCurrentSales, newFinalBalance, cajaId);
  });

  runTransaction();

  return { sale: newSale, tickets: createdTickets };
}

// Ticket Validation
export function validateTicket(ticketCode: string, validatedBy: string): Ticket {
  const db = getDB();
  const ticket = db.prepare("SELECT id, saleId, ticketCode, category, price, customerName, customerDni, customerResidence, purchaseDate, validated, validatedAt, validatedBy FROM tickets WHERE UPPER(ticketCode) = UPPER(?)").get(ticketCode);
  if (!ticket) {
    throw new Error('Código de entrada inválido o no existente');
  }

  if (ticket.validated === 1) {
    throw new Error(`Esta entrada ya fue validada el ${new Date(ticket.validatedAt).toLocaleString('es-AR')}`);
  }

  const validatedAt = new Date().toISOString();
  db.prepare("UPDATE tickets SET validated = 1, validatedAt = ?, validatedBy = ? WHERE id = ?")
    .run(validatedAt, validatedBy, ticket.id);

  return {
    id: ticket.id,
    saleId: ticket.saleId,
    ticketCode: ticket.ticketCode,
    category: ticket.category,
    price: ticket.price,
    customerName: ticket.customerName || undefined,
    customerDni: ticket.customerDni || undefined,
    customerResidence: ticket.customerResidence || undefined,
    purchaseDate: ticket.purchaseDate,
    validated: true,
    validatedAt,
    validatedBy
  };
}
