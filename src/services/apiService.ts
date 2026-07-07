import { Caja, Sale, Ticket, PriceSettings, User } from '../types';

// Auth Service
export const authService = {
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Credenciales inválidas');
    }
    return data;
  }
};

// Caja Service
export const cajaService = {
  async getStatus(token: string): Promise<{ openCaja: Caja | null }> {
    const response = await fetch('/api/caja/status', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error al obtener el estado de la caja');
    }
    return response.json();
  },

  async open(token: string, initialBalance: number): Promise<Caja> {
    const response = await fetch('/api/caja/open', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ initialBalance })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error al abrir la caja');
    }
    return data.openCaja;
  },

  async close(token: string): Promise<Caja> {
    const response = await fetch('/api/caja/close', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error al cerrar la caja');
    }
    return data.closedCaja;
  },

  async getHistory(token: string): Promise<Caja[]> {
    const response = await fetch('/api/caja/history', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error al obtener el historial de cajas');
    }
    return response.json();
  }
};

// Ticket Service
export interface SellRequest {
  items: Array<{ category: string; qty: number; holders?: Array<{ residence: string }> }>;
  paymentMethod: string;
  paymentRef: string;
  customerName?: string;
  customerDni?: string;
  customerResidence?: string;
}

export const ticketService = {
  async sell(token: string, req: SellRequest): Promise<{ sale: Sale; tickets: Ticket[] }> {
    const response = await fetch('/api/tickets/sell', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(req)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error al emitir entradas');
    }
    return data;
  },

  async search(token: string, ticketCode: string): Promise<Ticket> {
    const response = await fetch(`/api/tickets/search/${encodeURIComponent(ticketCode.trim().toUpperCase())}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error al buscar la entrada');
    }
    return data;
  },

  async validate(token: string, ticketCode: string): Promise<{ message: string; ticket: Ticket }> {
    const response = await fetch('/api/tickets/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ ticketCode })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error al validar la entrada');
    }
    return data;
  }
};

// Reports Service
export const reportsService = {
  async getGeneralStats(token: string) {
    const response = await fetch('/api/reports/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error al obtener las estadísticas');
    }
    return response.json();
  },

  async getDailyStats(token: string, date: string) {
    const response = await fetch(`/api/reports/daily?date=${date}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error al obtener las estadísticas diarias');
    }
    return response.json();
  }
};

// Admin Service
export const adminService = {
  async getPrices(): Promise<PriceSettings> {
    const response = await fetch('/api/settings/prices');
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error al obtener los precios de las entradas');
    }
    return response.json();
  },

  async savePrices(token: string, prices: PriceSettings): Promise<PriceSettings> {
    const response = await fetch('/api/settings/prices', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(prices)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error al guardar los precios');
    }
    return data.prices;
  },

  async getUsers(token: string): Promise<User[]> {
    const response = await fetch('/api/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error al obtener el listado de usuarios');
    }
    return response.json();
  },

  async createUser(token: string, user: Omit<User, 'id' | 'active'> & { password?: string }): Promise<User> {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(user)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error al crear el usuario');
    }
    return data.user;
  },

  async updateUser(token: string, userId: string, user: Partial<User> & { password?: string }): Promise<void> {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(user)
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error al actualizar el usuario');
    }
  },

  async deactivateUser(token: string, userId: string): Promise<void> {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error al desactivar el usuario');
    }
  }
};
