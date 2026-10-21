/**
 * Format currency values according to locale settings
 */
export function money(value: string | number, currency: string): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "COP" ? 0 : 2,
  }).format(Number(value));
}

/**
 * Map period type to readable label
 */
export function periodLabel(type: string): string {
  return (
    {
      daily: "Diario",
      weekly: "Semanal",
      monthly: "Mensual",
      custom: "Personalizado",
    }[type] ?? type
  );
}

/**
 * Create ISO date string (YYYY-MM-DD) from Date object
 */
export function toISODateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
