/**
 * Flag para ocultar la compra en la versión de Google Play (TWA): allí no se muestra precio ni enlace de pago.
 * Se activa con cualquiera de estas señales:
 *  1. `proHidePurchase: true` en MICROAPPS_CONFIG (variable pública PRO_HIDE_PURCHASE=1 al compilar).
 *  2. La app se abrió desde el paquete de Android (referrer `android-app://`).
 *  3. La URL de inicio del paquete lleva `?tienda=play` (se configura al generar el .aab).
 * Las señales 2 y 3 se recuerdan durante la sesión (sessionStorage), porque se pierden al navegar.
 */
export const STORE_FLAG_KEY = "chispatools.pro.tienda";
export interface StoreSignals { configFlag?: unknown; referrer?: string; search?: string; remembered?: string | null }

export function detectStore(s: StoreSignals): boolean {
  if (s.configFlag === true) return true;
  if (s.remembered === "play") return true;
  if ((s.referrer ?? "").startsWith("android-app://")) return true;
  try { return new URLSearchParams(s.search ?? "").get("tienda") === "play"; } catch { return false; }
}

export function purchaseHidden(): boolean {
  if (typeof window === "undefined") return false;
  let remembered: string | null = null;
  try { remembered = sessionStorage.getItem(STORE_FLAG_KEY); } catch { /* sin almacenamiento de sesión */ }
  const hidden = detectStore({ configFlag: (window as any).MICROAPPS_CONFIG?.proHidePurchase, referrer: document.referrer, search: location.search, remembered });
  if (hidden && remembered !== "play") { try { sessionStorage.setItem(STORE_FLAG_KEY, "play"); } catch { /* se volverá a detectar */ } }
  return hidden;
}
