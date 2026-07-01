import type { SessionInfo } from '../types';

// Albion World nemá vlastní backend. Veškerá data pochází ze stávajícího
// Express serveru (server.js), stejné session, stejné DB, stejné Google Sheets.
// Jediný nový endpoint /api/me/session pouze EXPOSuje už existující
// req.session hodnoty (icName, accessLevel, foto, oprávnění) — žádná nová logika.

export async function fetchSession(): Promise<SessionInfo> {
  const res = await fetch('/api/me/session', { credentials: 'include' });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      window.location.href = '/login';
    }
    throw new Error('Nepodařilo se načíst session');
  }
  const data = await res.json();
  return {
    icName: data.icName || 'Člen',
    accessLevel: data.accessLevel ?? 3,
    photo: data.photo || '/logo.png',
    permissions: data.permissions || [],
  };
}
