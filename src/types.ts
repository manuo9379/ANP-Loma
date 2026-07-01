export interface User {
  id: string;
  username: string;
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
  qrDataUrl?: string; // Base64 data URL representing the QR code image
}

export interface PriceSettings {
  extranjero: number;
  nacional: number;
  residente: number;
  minor: number;
}
