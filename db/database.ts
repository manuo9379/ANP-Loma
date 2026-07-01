import * as fs from 'fs';
import * as path from 'path';

// Define DB directory paths
const DB_DIR = path.resolve('./db/data');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const CAJAS_FILE = path.join(DB_DIR, 'cajas.json');
const SALES_FILE = path.join(DB_DIR, 'sales.json');
const TICKETS_FILE = path.join(DB_DIR, 'tickets.json');
const SETTINGS_FILE = path.join(DB_DIR, 'settings.json');

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
}

export interface SystemSettings {
  ticketPrices: {
    extranjero: number;
    nacional: number;
    residente: number;
    minor: number;
  };
}

// Helpers to read and write
function ensureDirectoryExistence() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

function readJSON<T>(filePath: string, defaultValue: T): T {
  ensureDirectoryExistence();
  if (!fs.existsSync(filePath)) {
    writeJSON(filePath, defaultValue);
    return defaultValue;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`Error reading database file at ${filePath}:`, error);
    return defaultValue;
  }
}

function writeJSON<T>(filePath: string, data: T) {
  ensureDirectoryExistence();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing database file at ${filePath}:`, error);
  }
}

// Seed Initial Data
export function initializeDatabase() {
  ensureDirectoryExistence();

  // 1. Settings
  const defaultSettings: SystemSettings = {
    ticketPrices: {
      extranjero: 10000,
      nacional: 5000,
      residente: 2500,
      minor: 0
    }
  };
  readJSON<SystemSettings>(SETTINGS_FILE, defaultSettings);

  // 2. Users
  const defaultUsers: User[] = [
    { id: 'usr-1', username: 'admin', password: 'admin123', role: 'admin', name: 'Administrador de Área', active: true },
    { id: 'usr-2', username: 'cajero1', password: 'cajero123', role: 'cajero', name: 'Juan Pérez', active: true },
    { id: 'usr-3', username: 'cajero2', password: 'cajero123', role: 'cajero', name: 'María Gómez', active: true }
  ];
  const users = readJSON<User[]>(USERS_FILE, defaultUsers);
  // Ensure default users exist if file was empty
  if (users.length === 0) {
    writeJSON(USERS_FILE, defaultUsers);
  }

  // 3. Historical Sales and Boxes Seeding
  // We want to seed data if empty, so there is rich visualization out-of-the-box
  const cajas = readJSON<Caja[]>(CAJAS_FILE, []);
  const sales = readJSON<Sale[]>(SALES_FILE, []);
  const tickets = readJSON<Ticket[]>(TICKETS_FILE, []);

  if (cajas.length === 0 && sales.length === 0) {
    console.log('Seeding simulated database with 7 days of historical sales...');
    const seedCajas: Caja[] = [];
    const seedSales: Sale[] = [];
    const seedTickets: Ticket[] = [];

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

        // Generate sales inside this shift
        const salesInShift = Math.floor(Math.random() * 8) + 5; // 5-12 sales per shift

        for (let s = 0; s < salesInShift; s++) {
          const saleId = `sale-${cajaId}-${s}`;
          const saleMinutes = Math.floor(Math.random() * 240); // within 4 hours
          const saleTime = new Date(new Date(openTime).getTime() + saleMinutes * 60000).toISOString();

          // Items inside this sale
          const saleItems: SaleItem[] = [];
          let saleTotal = 0;

          // Pick 1-3 categories of tickets
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

            // Generate tickets
            for (let t = 0; t < qty; t++) {
              const ticketId = `ticket-${saleId}-${cat.key}-${t}`;
              const ticketCode = `PL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
              const custIndex = Math.floor(Math.random() * names.length);
              const name = names[custIndex];
              const dni = Math.floor(10000000 + Math.random() * 40000000).toString();

              // Foreigners might not have numeric DNI, random passport format
              const finalDni = cat.key === 'extranjero' ? `PA-${Math.random().toString(36).substring(2, 8).toUpperCase()}` : dni;

              // Some tickets might have been validated (especially past days)
              const validated = dayOffset > 1 || Math.random() > 0.3; // mostly validated if past days
              const validatedAt = validated ? new Date(new Date(saleTime).getTime() + 15 * 60000).toISOString() : undefined;
              const validatedBy = validated ? 'usr-1' : undefined;

              seedTickets.push({
                id: ticketId,
                saleId,
                ticketCode,
                category: cat.key,
                price: cat.price,
                customerName: name,
                customerDni: finalDni,
                purchaseDate: saleTime,
                validated,
                validatedAt,
                validatedBy
              });
            }
          }

          const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
          const paymentRef = `E-${Math.floor(10000000 + Math.random() * 90000000)}`;

          seedSales.push({
            id: saleId,
            timestamp: saleTime,
            cajaId,
            userId: shift.user.id,
            userName: shift.user.name,
            items: saleItems,
            paymentMethod,
            totalAmount: saleTotal,
            paymentRef,
            customerName: names[Math.floor(Math.random() * names.length)],
            customerDni: Math.floor(20000000 + Math.random() * 25000000).toString()
          });

          currentSales += saleTotal;
          salesCount++;
        }

        seedCajas.push({
          id: cajaId,
          userId: shift.user.id,
          userName: shift.user.name,
          openTime,
          closeTime,
          status: 'closed',
          initialBalance: 0, // all electronic, standard starts at 0
          currentSales,
          finalBalance: currentSales,
          salesCount
        });
      });
    }

    writeJSON(CAJAS_FILE, seedCajas);
    writeJSON(SALES_FILE, seedSales);
    writeJSON(TICKETS_FILE, seedTickets);
    console.log(`Database seeded successfully! Added ${seedCajas.length} shifts, ${seedSales.length} transactions, and ${seedTickets.length} tickets.`);
  }
}

// DB Data Actions

// Settings Accessors
export function getSettings(): SystemSettings {
  return readJSON<SystemSettings>(SETTINGS_FILE, {
    ticketPrices: { extranjero: 10000, nacional: 5000, residente: 2500, minor: 0 }
  });
}

export function saveSettings(settings: SystemSettings) {
  writeJSON(SETTINGS_FILE, settings);
}

// User Actions
export function getUsers(): User[] {
  const users = readJSON<User[]>(USERS_FILE, []);
  // Return users without passwords for security
  return users;
}

export function saveUsers(users: User[]) {
  // Read existing file to preserve passwords of existing users if editing
  const existingUsers = readJSON<User[]>(USERS_FILE, []);
  const updatedWithPasswords = users.map(u => {
    const existing = existingUsers.find(ex => ex.id === u.id);
    return {
      ...u,
      password: u.password || existing?.password || 'cajero123' // fallback
    };
  });
  writeJSON(USERS_FILE, updatedWithPasswords);
}

export function getUserWithPassword(username: string): User | undefined {
  const users = readJSON<User[]>(USERS_FILE, []);
  return users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.active);
}

// Caja Actions
export function getCajas(): Caja[] {
  return readJSON<Caja[]>(CAJAS_FILE, []);
}

export function getOpenCaja(userId: string): Caja | undefined {
  const cajas = getCajas();
  return cajas.find(c => c.userId === userId && c.status === 'open');
}

export function openCaja(userId: string, userName: string, initialBalance: number): Caja {
  const cajas = getCajas();
  const existingOpen = cajas.find(c => c.userId === userId && c.status === 'open');
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

  cajas.push(newCaja);
  writeJSON(CAJAS_FILE, cajas);
  return newCaja;
}

export function closeCaja(cajaId: string): Caja {
  const cajas = getCajas();
  const index = cajas.findIndex(c => c.id === cajaId);
  if (index === -1) {
    throw new Error('Caja no encontrada');
  }

  const caja = cajas[index];
  caja.status = 'closed';
  caja.closeTime = new Date().toISOString();
  caja.finalBalance = caja.initialBalance + caja.currentSales;

  writeJSON(CAJAS_FILE, cajas);
  return caja;
}

// Sales Actions
export function getSales(): Sale[] {
  return readJSON<Sale[]>(SALES_FILE, []);
}

export function getTickets(): Ticket[] {
  return readJSON<Ticket[]>(TICKETS_FILE, []);
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
  const cajas = getCajas();
  const cajaIndex = cajas.findIndex(c => c.id === cajaId && c.status === 'open');
  if (cajaIndex === -1) {
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

  // Save Sale
  const sales = getSales();
  sales.push(newSale);
  writeJSON(SALES_FILE, sales);

  // Save Tickets
  const tickets = getTickets();
  tickets.push(...createdTickets);
  writeJSON(TICKETS_FILE, tickets);

  // Update Caja balances
  cajas[cajaIndex].currentSales += saleTotal;
  cajas[cajaIndex].salesCount += 1;
  cajas[cajaIndex].finalBalance = cajas[cajaIndex].initialBalance + cajas[cajaIndex].currentSales;
  writeJSON(CAJAS_FILE, cajas);

  return { sale: newSale, tickets: createdTickets };
}

// Ticket Validation
export function validateTicket(ticketCode: string, validatedBy: string): Ticket {
  const tickets = getTickets();
  const index = tickets.findIndex(t => t.ticketCode.toUpperCase() === ticketCode.toUpperCase());
  if (index === -1) {
    throw new Error('Código de entrada inválido o no existente');
  }

  const ticket = tickets[index];
  if (ticket.validated) {
    throw new Error(`Esta entrada ya fue validada el ${new Date(ticket.validatedAt!).toLocaleString('es-AR')}`);
  }

  ticket.validated = true;
  ticket.validatedAt = new Date().toISOString();
  ticket.validatedBy = validatedBy;

  writeJSON(TICKETS_FILE, tickets);
  return ticket;
}
