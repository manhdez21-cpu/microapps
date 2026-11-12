/** Puerta de las funciones Pro: `if (!requirePro({ feature: "Exportar CSV" })) return;` */
import type { ProApp } from "./config.ts";
import { openUpgradeProModal, type UpgradeOptions } from "./modal.ts";
import { currentApp, isPro } from "./state.ts";

export interface RequireOptions extends UpgradeOptions { app?: ProApp }

/**
 * Verdadero si la app es Pro. Si no, abre el modal de mejora y devuelve falso (la función no se ejecuta).
 * Sin `app` usa la que fijó initPro. `open` se puede sustituir en pruebas.
 */
export function requirePro(opts: RequireOptions = {}, open: (app: ProApp, o: UpgradeOptions) => unknown = openUpgradeProModal): boolean {
  const app = opts.app ?? currentApp();
  if (app === null) throw new Error("requirePro: llama antes a initPro(app) o pasa { app }.");
  if (isPro(app)) return true;
  open(app, opts);
  return false;
}
