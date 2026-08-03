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

export const EXPENSE_CATEGORY_LABELS = {
  STOCK_PURCHASE: "Compra de stock",
  SERVICES: "Servicios",
  RENT: "Alquiler",
  CLEANING: "Limpieza",
  MAINTENANCE: "Mantenimiento",
  WITHDRAWAL: "Retiro",
  OTHER: "Otro",
};

export const PAYMENT_METHOD_LABELS = {
  EFECTIVO: "Efectivo",
  YAPE: "Yape",
  MIXTO: "Mixto",
};

export function formatPaymentMethod(movement) {
  const method = movement.paymentMethod;
  if (!method) return "Sin método";

  const label = PAYMENT_METHOD_LABELS[method] ?? method;

  if (method === "MIXTO") {
    const parts = [];
    if (movement.yapeAmount != null) {
      parts.push(`Yape ${formatCurrency(movement.yapeAmount)}`);
    }
    if (movement.cashAmount != null) {
      parts.push(`Efectivo ${formatCurrency(movement.cashAmount)}`);
    }
    if (parts.length > 0) {
      return `${label} · ${parts.join(" · ")}`;
    }
  }

  return label;
}

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
