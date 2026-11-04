/** Registra el service worker de la app (sw.js junto a index.html). Sin efecto en file:// */
if (typeof navigator !== "undefined" && "serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch(() => undefined);
}
export {};
