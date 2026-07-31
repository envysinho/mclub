const AUTH_STORAGE_KEY = "gym.auth";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8082";

function readSession(storage) {
  try {
    const raw = storage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getStoredSession() {
  return readSession(sessionStorage);
}

export function saveSession(session) {
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function login({ username, password }) {
  const trimmedUsername = username.trim();
  const trimmedPassword = password.trim();

  if (!trimmedUsername || !trimmedPassword) {
    throw new Error("Usuario y contraseña son obligatorios");
  }

  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: trimmedUsername,
      password: trimmedPassword,
    }),
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      payload && typeof payload.message === "string"
        ? payload.message
        : "Credenciales inválidas";
    throw new Error(message);
  }

  saveSession(payload);
  return payload;
}

export function logout() {
  clearSession();
}
