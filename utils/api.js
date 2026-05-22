// Central API helper - attaches JWT token to every request
const BASE = process.env.NEXT_PUBLIC_API_URL || '';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ptms_token');
}

async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(BASE + url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed: ${res.status}`);
  return data;
}

// ── Auth ───────────────────────────────────────────────────────
export const api = {
  auth: {
    login: (body) => apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    register: (body) => apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    me: () => apiFetch('/api/auth/me'),
    forgotPassword: (body) => apiFetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
    resetPassword: (body) => apiFetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  },

  users: {
    list: (params = {}) => apiFetch('/api/users?' + new URLSearchParams(params)),
    get: (id) => apiFetch(`/api/users/${id}`),
    create: (body) => apiFetch('/api/users', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => apiFetch(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id) => apiFetch(`/api/users/${id}`, { method: 'DELETE' }),
    generateResetToken: (id) => apiFetch(`/api/users/${id}/reset-token`, { method: 'POST' }),
  },

  students: {
    list: (params = {}) => apiFetch('/api/students?' + new URLSearchParams(params)),
    get: (id) => apiFetch(`/api/students/${id}`),
    my: () => apiFetch('/api/students/my'),
    update: (id, body) => apiFetch(`/api/students/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    updateBulk: (body) => apiFetch('/api/students', { method: 'PUT', body: JSON.stringify(body) }),
    getGlobalEndDate: () => apiFetch('/api/students', { method: 'PATCH' }),
  },

  teachers: {
    list: () => apiFetch('/api/teachers'),
  },

  locations: {
    list: () => apiFetch('/api/locations'),
    create: (body) => apiFetch('/api/locations', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => apiFetch(`/api/locations/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id) => apiFetch(`/api/locations/${id}`, { method: 'DELETE' }),
  },

  visits: {
    create: (body) => apiFetch('/api/visits', { method: 'POST', body: JSON.stringify(body) }),
    list: (params = {}) => apiFetch('/api/visits?' + new URLSearchParams(params)),
  },

  reports: {
    get: (params = {}) => apiFetch('/api/reports?' + new URLSearchParams(params)),
  },

  notifications: {
    list: () => apiFetch('/api/notifications'),
    markAllRead: () => apiFetch('/api/notifications', { method: 'PUT' }),
  },
};
