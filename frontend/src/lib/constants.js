export const MEMBERSHIP_STATUS_LABELS = {
  ACTIVE: "Activa",
  EXPIRED: "Vencida",
  CANCELLED: "Cancelada",
};

export const MOVEMENT_TYPE_LABELS = {
  MEMBERSHIP_SALE: "Venta de membresía",
  MEMBERSHIP_RENEWAL: "Renovación",
  PRODUCT_SALE: "Venta de producto",
};

export const STOCK_MOVEMENT_TYPE_LABELS = {
  PURCHASE: "Entrada",
  SALE: "Venta",
  ADJUSTMENT: "Ajuste",
};

export function formatCurrency(amount) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(amount ?? 0);
}

export function formatDate(dateString) {
  if (!dateString) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

export function fullName(entity) {
  return `${entity.firstName} ${entity.lastName}`.trim();
}
