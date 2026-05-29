const BASE = '/api';

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function request(method, path, body) {
  const opts = { method, headers: headers() };
  if (body && !(body instanceof FormData)) opts.body = JSON.stringify(body);
  if (body instanceof FormData) { opts.body = body; delete opts.headers['Content-Type']; }
  const res = await fetch(BASE + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const auth = {
  login: (body) => request('POST', '/auth/login', body),
  register: (body) => request('POST', '/auth/register', body),
  me: () => request('GET', '/auth/me'),
  users: () => request('GET', '/auth/users'),
  updateUser: (id, body) => request('PUT', `/auth/users/${id}`, body),
  deleteUser: (id) => request('DELETE', `/auth/users/${id}`),
};

export const kits = {
  list: () => request('GET', '/kits'),
  get: (id) => request('GET', `/kits/${id}`),
  upload: (files) => {
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    return request('POST', '/kits/upload', fd);
  },
  rename: (id, name) => request('PUT', `/kits/${id}`, { name }),
  delete: (id) => request('DELETE', `/kits/${id}`),
};

export const crystals = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/crystals${qs ? '?' + qs : ''}`);
  },
  get: (id) => request('GET', `/crystals/${id}`),
  create: (body) => request('POST', '/crystals', body),
  update: (id, body) => request('PUT', `/crystals/${id}`, body),
  delete: (id) => request('DELETE', `/crystals/${id}`),
  uploadImage: (id, file) => {
    const fd = new FormData();
    fd.append('image', file);
    return request('POST', `/crystals/${id}/image`, fd);
  },
  lookupCondition: (kitId, wellId) => request('GET', `/crystals/condition/lookup?kit_id=${kitId}&well_id=${wellId}`),
};
