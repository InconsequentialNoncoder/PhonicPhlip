// Session management for multi-user support
// Named sessions route to isolated Durable Objects with persistent settings.
// Guest mode (no session) uses 'default-room' — same as original single-session behaviour.

const STORAGE_KEY = 'phonic-session';

export function getSessionId() {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch (e) {
    return null;
  }
}

export function setSessionId(id) {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    // localStorage unavailable — session won't persist across refresh
  }
}

export function isNamedSession() {
  return getSessionId() !== null;
}

export function isLocalServer() {
  const h = location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.');
}

export function buildWsUrl() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  let url = `${protocol}//${location.host}/ws`;
  const session = getSessionId();
  if (session && !isLocalServer()) {
    url += `?session=${encodeURIComponent(session)}`;
  }
  return url;
}

export function sanitiseSessionId(raw) {
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
}
