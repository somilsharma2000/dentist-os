// Shared session helpers (used by admin auth, api shim, and server client).
const KEY = 'dentos-session-v1';

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch (e) {
    return null;
  }
}

export function setSession(session) {
  localStorage.setItem(KEY, JSON.stringify(session));
  return session;
}

export function updateSession(patch) {
  const s = getSession() || {};
  return setSession({ ...s, ...patch });
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

// White-label theming: tenant.brandColor is an HSL triple ("189 94% 43%")
// matching the shadcn --primary token in index.css.
export function applyTenantTheme(tenant) {
  const root = document.documentElement;
  if (tenant && tenant.brandColor) root.style.setProperty('--primary', tenant.brandColor);
  else root.style.removeProperty('--primary');
}

export const ROLE_LABELS = {
  super: 'Agency Owner',
  admin: 'Clinic Admin',
  dentist: 'Dentist',
  front: 'Receptionist'
};
