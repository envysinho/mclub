export function formatMonthValue(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

export function buildMonthOptions() {
  const currentMonth = formatMonthValue(new Date());
  return Array.from(new Set([currentMonth, "2026-08", "2026-09"])).map((value) => ({
    value,
    label: value === currentMonth ? `${value} · este mes` : value,
  }));
}
