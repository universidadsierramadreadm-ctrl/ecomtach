/* ══════════════════════════════════════════════════════
   ECOMATCH — api.js
   Configuración y funciones para llamadas API al backend
   ══════════════════════════════════════════════════════ */

'use strict';

// ── Configuración base de la API ──
const API_BASE_URL = window.location.origin; // Usará el mismo origen que el frontend (localhost:3000)

// ── Funciones de utilidad para API ──
const api = {
  // Función genérica para hacer peticiones HTTP
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    };

    const headers = {
      ...defaultOptions.headers,
      ...options.headers
    };

    const token = localStorage.getItem('authToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...defaultOptions,
      ...options,
      headers,
    };

    if (config.body && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);

      // Si la respuesta no es ok, intentar obtener el mensaje de error
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      // Para respuestas vacías (como 204 No Content)
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error en API request:', error);
      throw error;
    }
  },

  // ── Métodos específicos para cada endpoint ──

  // Autenticación
  auth: {
    async register(userData) {
      return api.request('/api/auth/register', {
        method: 'POST',
        body: userData
      });
    },

    async login(credentials) {
      return api.request('/api/auth/login', {
        method: 'POST',
        body: credentials
      });
    },

    async getProfile() {
      return api.request('/api/auth/me');
    },

    async changePassword(passwordData) {
      return api.request('/api/auth/change-password', {
        method: 'POST',
        body: passwordData
      });
    }
  },

  // Usuarios
  users: {
    async getAll() {
      return api.request('/api/users');
    },

    async getById(id) {
      return api.request(`/api/users/${id}`);
    },

    async update(id, userData) {
      return api.request(`/api/users/${id}`, {
        method: 'PUT',
        body: userData
      });
    },

    async delete(id) {
      return api.request(`/api/users/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // Productos/Materiales
  products: {
    async getAll() {
      return api.request('/api/products');
    },

    async getById(id) {
      return api.request(`/api/products/${id}`);
    },

    async create(productData) {
      return api.request('/api/products', {
        method: 'POST',
        body: productData
      });
    },

    async update(id, productData) {
      return api.request(`/api/products/${id}`, {
        method: 'PUT',
        body: productData
      });
    },

    async delete(id) {
      return api.request(`/api/products/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // Pagos
  payments: {
    async createTransaction(transactionData) {
      return api.request('/api/payments/transaccion', {
        method: 'POST',
        body: transactionData
      });
    },

    async getHistory() {
      return api.request('/api/payments/history');
    },

    async getAdminStats() {
      return api.request('/api/payments/admin/stats');
    }
  },

  // VIP
  vip: {
    async getPlans() {
      return api.request('/api/vip/planes');
    },

    async getStatus() {
      return api.request('/api/vip/status');
    }
  },

  // Chat
  chat: {
    async getMessages() {
      return api.request('/api/chat');
    },

    async sendMessage(messageData) {
      return api.request('/api/chat', {
        method: 'POST',
        body: messageData
      });
    }
  },

  // Health check
  async health() {
    return api.request('/api/health');
  }
};

// ── Gestión de autenticación ──
const authManager = {
  token: localStorage.getItem('authToken'),

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  },

  logout() {
    this.setToken(null);
    window.location.href = '#inicio';
    window.location.reload();
  },

  isAuthenticated() {
    return !!this.token;
  }
};

// ── Función para probar la conexión ──
async function testConnection() {
  try {
    const health = await api.health();
    console.log('✅ Conexión con backend exitosa:', health);
    return true;
  } catch (error) {
    console.error('❌ Error conectando con backend:', error);
    return false;
  }
}

// Exportar funciones globales
window.api = api;
window.authManager = authManager;
window.testConnection = testConnection;