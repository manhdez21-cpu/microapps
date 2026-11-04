/** Fecha local de hoy como AAAA-MM-DD (no UTC: un recordatorio debe cambiar de día a la medianoche local). */
export function todayLocal(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function dayLabel(daysLeft: number): string {
  if (daysLeft === 0) return "vence hoy";
  if (daysLeft === 1) return "vence mañana";
  if (daysLeft === -1) return "venció ayer";
  return daysLeft > 0 ? `vence en ${daysLeft} días` : `venció hace ${-daysLeft} días`;
}
