// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://corus-site.onrender.com";

export const api = {
  // ─── Auth ────────────────────────────────────────────────
  auth: {
    register: (data: any) =>
      fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    login: (data: { username: string; password: string }) =>
      fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    verifyOtp: (data: { email: string; otp: string }) =>
      fetch(`${API_BASE}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    resendOtp: (data: { email: string }) =>
      fetch(`${API_BASE}/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    me: (token: string) =>
      fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    logout: () => {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
    },
  },

  // ─── Catalog (public) ──────────────────────────────────────
  catalog: {
    products: (params?: { category?: string; page?: number; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.category) qs.append("category", params.category);
      if (params?.page) qs.append("page", String(params.page));
      if (params?.limit) qs.append("limit", String(params.limit));
      return fetch(`${API_BASE}/catalog/products?${qs}`);
    },
    productBySlug: (slug: string) => fetch(`${API_BASE}/catalog/products/${slug}`),
    categories: () => fetch(`${API_BASE}/catalog/categories`),
    homepageContent: () => fetch(`${API_BASE}/catalog/content/homepage`),
    galleryContent: () => fetch(`${API_BASE}/catalog/content/gallery`),
    rentalInfo: () => fetch(`${API_BASE}/catalog/content/rental-info`),
  },

  // ─── Cart (authenticated) ─────────────────────────────────
  cart: {
    get: (token: string) =>
      fetch(`${API_BASE}/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    delete: (token: string) =>
      fetch(`${API_BASE}/cart`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }),
    addItem: (data: { product_id: string; quantity: number }, token: string) =>
      fetch(`${API_BASE}/cart/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      }),
    updateItem: (product_id: string, quantity: number, token: string) =>
      fetch(`${API_BASE}/cart/items/${product_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity }),
      }),
    deleteItem: (product_id: string, token: string) =>
      fetch(`${API_BASE}/cart/items/${product_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }),
  },

  

  // ─── Rentals (public + authenticated) ─────────────────────
  rentals: {
    equipment: () => fetch(`${API_BASE}/rentals/equipment`),
    equipmentBySlug: (slug: string) => fetch(`${API_BASE}/rentals/equipment/${slug}`),
    checkout: (data: { equipment_id: string; start_date: string; end_date: string }, token: string) =>
      fetch(`${API_BASE}/rentals/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      }),
    myRentals: (token: string) =>
      fetch(`${API_BASE}/rentals/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    getRental: (rental_id: string, token: string) =>
      fetch(`${API_BASE}/rentals/${rental_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
  },

  // ─── Reservations (studio requests) ──────────────────────
  reservations: {
    create: (data: { requested_start: string; requested_end: string; purpose: string; notes?: string }, token: string) =>
      fetch(`${API_BASE}/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      }),
    myReservations: (token: string) =>
      fetch(`${API_BASE}/reservations/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    getById: (reservation_id: string, token: string) =>
      fetch(`${API_BASE}/reservations/${reservation_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    checkout: (reservation_id: string, token: string) =>
      fetch(`${API_BASE}/reservations/${reservation_id}/checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }),
  },

  // ─── Sessions (bookings) ──────────────────────────────────
// lib/api.ts – add inside the `api` object

    sessions: {
    types: () => fetch(`${API_BASE}/sessions/types`),
    availability: (start: string, end: string) =>
        fetch(`${API_BASE}/sessions/availability?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),
    createHold: (data: { slot_id: string; session_type_id: string }, token: string) =>
        fetch(`${API_BASE}/sessions/holds`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
        }),
    checkoutBooking: (data: { hold_id: string }, token: string) =>
        fetch(`${API_BASE}/sessions/bookings/checkout`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
        }),
    },

    orders: {
  // Checkout: converts the whole cart to an order and returns payment info
  checkout: (token: string) =>
    fetch(`${API_BASE}/orders/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }),
  myOrders: (token: string) =>
    fetch(`${API_BASE}/orders/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getOrder: (order_id: string, token: string) =>
    fetch(`${API_BASE}/orders/${order_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
},

  // ─── Admin ─────────────────────────────────────────────────
  admin: {
    dashboard: {
      summary: (token: string) =>
        fetch(`${API_BASE}/admin/dashboard/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      activity: (token: string, params?: { page?: number; limit?: number; days?: number }) => {
        const qs = new URLSearchParams();
        if (params?.page) qs.append("page", String(params.page));
        if (params?.limit) qs.append("limit", String(params.limit));
        if (params?.days) qs.append("days", String(params.days));
        return fetch(`${API_BASE}/admin/dashboard/activity?${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      },
    },
    bookings: {
      list: (token: string, params?: { page?: number; limit?: number; status?: string }) => {
        const qs = new URLSearchParams();
        if (params?.page) qs.append("page", String(params.page));
        if (params?.limit) qs.append("limit", String(params.limit));
        if (params?.status) qs.append("status", params.status);
        return fetch(`${API_BASE}/admin/bookings?${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      },
    },
  },
};

export default api;