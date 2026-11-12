/** UpgradeProModal: diálogo accesible (<dialog> nativo: foco atrapado, Esc cierra) con precio ancla y mensaje propio por app. */
import { anchorVisible, checkoutHref, priceLabel, PRO_ANCHOR_USD, PRO_CONFIG, PRO_PRICE_USD, type ProApp } from "./config.ts";
import { activateLicense, ERROR_TEXT, type ProDeps } from "./state.ts";
import { purchaseHidden } from "./store-flag.ts";

export interface UpgradeOptions {
  /** Función que la persona intentó usar; se nombra en el modal. */
  feature?: string;
  /** Forzar con/sin compra (por defecto lo decide el flag de Google Play). */
  hidePurchase?: boolean;
  onActivated?: () => void;
  deps?: ProDeps;
}
const MODAL_ID = "pro-modal";

function ensureStyles(): void {
  if (document.querySelector("link[data-pro-css]")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet"; link.href = new URL("../pro.css", import.meta.url).href; link.setAttribute("data-pro-css", "");
  document.head.appendChild(link);
}
function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text) e.textContent = text;
  return e;
}

export function openUpgradeProModal(app: ProApp, opts: UpgradeOptions = {}): HTMLDialogElement {
  ensureStyles();
  document.getElementById(MODAL_ID)?.remove();
  const cfg = PRO_CONFIG[app];
  const noBuy = opts.hidePurchase ?? purchaseHidden();
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  const d = el("dialog", { id: MODAL_ID, class: "pro-modal", "data-testid": "pro-modal", "data-app": app, "aria-labelledby": "pro-title", "aria-describedby": "pro-pitch" });
  const close = el("button", { type: "button", class: "ghost pro-close", "aria-label": "Cerrar" }, "×");
  close.onclick = () => d.close();
  const title = el("h2", { id: "pro-title" }, `${cfg.name} Pro`);
  const pitch = el("p", { id: "pro-pitch", class: "pro-pitch" }, opts.feature ? `«${opts.feature}» es parte de ${cfg.name} Pro. ${cfg.pitch}` : cfg.pitch);
  const list = el("ul", { class: "pro-benefits" });
  for (const b of cfg.benefits) list.appendChild(el("li", {}, b));
  d.append(close, title, pitch, list);

  if (!noBuy) {
    const price = el("p", { class: "pro-price", "data-testid": "pro-price" });
    if (anchorVisible()) {
      const s = el("s", { "data-testid": "pro-anchor" }, priceLabel(PRO_ANCHOR_USD));
      price.append(el("span", { class: "sr-only" }, "Precio regular: "), s, " ", el("span", { class: "sr-only" }, "Precio de lanzamiento: "));
    }
    price.append(el("strong", {}, priceLabel(PRO_PRICE_USD)));
    d.append(price, el("p", { class: "hint" }, "Pago único. Sin suscripción. La licencia se guarda en este dispositivo y funciona sin conexión."));
    const href = checkoutHref(app);
    if (href) d.append(el("a", { class: "pro-buy", href, target: "_blank", rel: "noopener", "data-testid": "pro-buy" }, `Comprar ${cfg.name} Pro`));
    else d.append(el("p", { class: "note", "data-testid": "pro-soon" }, "La compra estará disponible muy pronto."));
  }

  const form = el("form", { class: "pro-activate", novalidate: "" });
  const label = el("label", { for: "pro-token" }, "¿Ya tienes una licencia? Pégala aquí");
  const input = el("textarea", { id: "pro-token", rows: "3", autocomplete: "off", autocapitalize: "off", spellcheck: "false", "aria-describedby": "pro-status", "data-testid": "pro-token" });
  const submit = el("button", { type: "submit", class: noBuy ? "primary" : "" }, "Activar licencia");
  const status = el("p", { id: "pro-status", class: "pro-status", role: "status", "aria-live": "polite", "data-testid": "pro-status" });
  form.append(label, input, submit, status);
  form.onsubmit = async (e) => {
    e.preventDefault();
    input.removeAttribute("aria-invalid");
    if (!input.value.trim()) { status.textContent = "Pega primero tu licencia."; status.dataset.kind = "error"; input.setAttribute("aria-invalid", "true"); input.focus(); return; }
    submit.disabled = true; status.dataset.kind = ""; status.textContent = "Comprobando…";
    const res = await activateLicense(app, input.value, opts.deps);
    submit.disabled = false;
    if (!res.ok) { status.textContent = ERROR_TEXT[res.error]; status.dataset.kind = "error"; input.setAttribute("aria-invalid", "true"); input.focus(); return; }
    status.dataset.kind = "ok";
    status.textContent = res.stored ? `Listo: ${cfg.name} Pro está activo en este dispositivo.` : `${cfg.name} Pro está activo, pero este navegador no dejó guardar la licencia: tendrás que pegarla de nuevo la próxima vez.`;
    input.value = ""; form.hidden = true;
    const done = el("button", { type: "button", class: "primary", "data-testid": "pro-done" }, "Continuar");
    done.onclick = () => d.close();
    d.append(status, done);
    done.focus();
    opts.onActivated?.();
  };
  d.append(form);
  d.addEventListener("close", () => { d.remove(); if (opener?.isConnected) opener.focus(); });
  d.addEventListener("click", (e) => { if (e.target === d) d.close(); }); // toque fuera del cuadro
  document.body.appendChild(d);
  d.showModal();
  return d;
}

if (typeof document !== "undefined") ensureStyles();
