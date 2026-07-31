import { clearSession, getStoredSession } from "@/lib/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8082";

async function parseJsonResponse(res) {
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      payload && typeof payload.message === "string"
        ? payload.message
        : payload && typeof payload.error === "string"
          ? payload.error
          : "Error en la petición";
    throw new Error(message);
  }
  return payload;
}

export async function apiFetch(path, options = {}, onUnauthorized) {
  const session = getStoredSession();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearSession();
    onUnauthorized?.();
    throw new Error("Sesión expirada");
  }

  if (res.status === 204) {
    return null;
  }

  return parseJsonResponse(res);
}

export async function getDashboard(onUnauthorized) {
  return apiFetch("/api/dashboard", {}, onUnauthorized);
}

export async function listMovements(limit = 20, onUnauthorized) {
  return apiFetch(`/api/movements?limit=${limit}`, {}, onUnauthorized);
}

export async function listClients(onUnauthorized) {
  return apiFetch("/api/clients", {}, onUnauthorized);
}

export async function getClient(id, onUnauthorized) {
  return apiFetch(`/api/clients/${id}`, {}, onUnauthorized);
}

export async function createClient(data, onUnauthorized) {
  return apiFetch(
    "/api/clients",
    { method: "POST", body: JSON.stringify(data) },
    onUnauthorized
  );
}

export async function updateClient(id, data, onUnauthorized) {
  return apiFetch(
    `/api/clients/${id}`,
    { method: "PUT", body: JSON.stringify(data) },
    onUnauthorized
  );
}

export async function deleteClient(id, confirmationPassword, onUnauthorized) {
  return apiFetch(
    `/api/clients/${id}`,
    { method: "DELETE", headers: { "X-Confirm-Password": confirmationPassword } },
    onUnauthorized
  );
}

export async function listMembershipPlans(onUnauthorized) {
  return apiFetch("/api/membership-plans", {}, onUnauthorized);
}

export async function createMembershipPlan(data, onUnauthorized) {
  return apiFetch(
    "/api/membership-plans",
    { method: "POST", body: JSON.stringify(data) },
    onUnauthorized
  );
}

export async function updateMembershipPlan(id, data, onUnauthorized) {
  return apiFetch(
    `/api/membership-plans/${id}`,
    { method: "PUT", body: JSON.stringify(data) },
    onUnauthorized
  );
}

export async function deleteMembershipPlan(id, confirmationPassword, onUnauthorized) {
  return apiFetch(
    `/api/membership-plans/${id}`,
    { method: "DELETE", headers: { "X-Confirm-Password": confirmationPassword } },
    onUnauthorized
  );
}

export async function assignMembership(data, onUnauthorized) {
  return apiFetch(
    "/api/memberships",
    { method: "POST", body: JSON.stringify(data) },
    onUnauthorized
  );
}

export async function listProducts(onUnauthorized) {
  return apiFetch("/api/products", {}, onUnauthorized);
}

export async function createProduct(data, onUnauthorized) {
  return apiFetch(
    "/api/products",
    { method: "POST", body: JSON.stringify(data) },
    onUnauthorized
  );
}

export async function updateProduct(id, data, onUnauthorized) {
  return apiFetch(
    `/api/products/${id}`,
    { method: "PUT", body: JSON.stringify(data) },
    onUnauthorized
  );
}

export async function deleteProduct(id, confirmationPassword, onUnauthorized) {
  return apiFetch(
    `/api/products/${id}`,
    { method: "DELETE", headers: { "X-Confirm-Password": confirmationPassword } },
    onUnauthorized
  );
}

export async function sellProduct(data, onUnauthorized) {
  return apiFetch(
    "/api/movements/product-sale",
    { method: "POST", body: JSON.stringify(data) },
    onUnauthorized
  );
}

export async function listUsers(onUnauthorized) {
  return apiFetch("/api/users", {}, onUnauthorized);
}

export async function createUser(data, onUnauthorized) {
  return apiFetch(
    "/api/users",
    { method: "POST", body: JSON.stringify(data) },
    onUnauthorized
  );
}

export async function updateUser(id, data, onUnauthorized) {
  return apiFetch(
    `/api/users/${id}`,
    { method: "PUT", body: JSON.stringify(data) },
    onUnauthorized
  );
}

export async function deleteUser(id, confirmationPassword, onUnauthorized) {
  return apiFetch(
    `/api/users/${id}`,
    { method: "DELETE", headers: { "X-Confirm-Password": confirmationPassword } },
    onUnauthorized
  );
}
