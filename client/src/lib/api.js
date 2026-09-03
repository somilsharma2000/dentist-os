import { apiDemo } from './api-demo';

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

const apiServer = {
  get: (path) => fetch(BASE + path).then(handle),
  post: (path, body) =>
    fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(handle),
  put: (path, body) =>
    fetch(BASE + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(handle),
  del: (path) => fetch(BASE + path, { method: 'DELETE' }).then(handle)
};

export const api = DEMO ? apiDemo : apiServer;
