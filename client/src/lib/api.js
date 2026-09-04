import { apiDemo } from './api-demo';
import { getSession } from './auth';

const BASE = '/api';
const DEMO = import.meta.env.VITE_DEMO === '1';

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

const authHeaders = () => {
  const s = getSession();
  const h = { 'Content-Type': 'application/json' };
  if (s && s.token) h.Authorization = 'Bearer ' + s.token;
  return h;
};

const apiServer = {
  get: (path) => fetch(BASE + path, { headers: authHeaders() }).then(handle),
  post: (path, body) => fetch(BASE + path, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  put: (path, body) => fetch(BASE + path, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  del: (path) => fetch(BASE + path, { method: 'DELETE', headers: authHeaders() }).then(handle)
};

export const api = DEMO ? apiDemo : apiServer;
