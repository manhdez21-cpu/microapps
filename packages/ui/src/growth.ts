/** Crecimiento orgánico sin costo: enlaces entre las apps y botón para compartir. Se añade solo al final de <main> de cada app. */
export interface AppLink { slug: string; name: string; hint: string }
export const APPS: AppLink[] = [
  { slug: "splitflow", name: "SplitFlow · Dividir Cuentas", hint: "Divide gastos y ve quién paga a quién." },
  { slug: "caja-clara", name: "Caja Clara", hint: "Cierra la caja del día y mira si cuadra." },
  { slug: "priceright", name: "PriceRight · Precio Justo", hint: "Pon precio a tu trabajo con margen real." },
  { slug: "cuanto-me-sobra", name: "¿Cuánto me sobra?", hint: "Cerámica y pintura: cuánto comprar." },
  { slug: "expiryhub", name: "ExpiryHub · Vencimientos", hint: "SOAT, seguros y licencias a tiempo." },
  { slug: "warranty-keeper", name: "Warranty Keeper · Garantías", hint: "Garantías con factura y fecha de fin." },
  { slug: "huella-al-dia", name: "Huella al Día", hint: "Carnet de vacunas de tu mascota." },
];
export const othersThan = (slug: string): AppLink[] => APPS.filter((a) => a.slug !== slug);
export const shareText = (title: string, url: string): string => `Mira esta herramienta gratis: ${title} ${url}`;
export const whatsappUrl = (text: string): string => `https://wa.me/?text=${encodeURIComponent(text)}`;

function init(): void {
  const m = /\/apps\/([a-z0-9-]+)\//.exec(location.pathname);
  const main = document.querySelector("main");
  if (!m || !main || main.querySelector(".more-tools")) return;
  const sec = document.createElement("section");
  sec.className = "more-tools"; sec.setAttribute("aria-labelledby", "mt-h"); sec.setAttribute("data-testid", "more-tools");
  const h2 = document.createElement("h2"); h2.id = "mt-h"; h2.textContent = "Más herramientas gratis";
  const ul = document.createElement("ul");
  for (const a of othersThan(m[1]!)) {
    const li = document.createElement("li"), link = document.createElement("a");
    link.href = `../${a.slug}/index.html`; link.setAttribute("data-track", "cross_link");
    const s = document.createElement("strong"); s.textContent = a.name;
    const sp = document.createElement("span"); sp.textContent = a.hint;
    link.append(s, sp); li.appendChild(link); ul.appendChild(li);
  }
  const row = document.createElement("div"); row.className = "share-row";
  const text = shareText(document.title.split(":")[0]!.trim(), location.href.split("#")[0]!);
  const btn = document.createElement("button"); btn.type = "button"; btn.textContent = "Compartir esta herramienta"; btn.setAttribute("data-track", "share_click"); btn.setAttribute("data-testid", "share-app");
  btn.onclick = async () => {
    if (navigator.share) { try { await navigator.share({ title: document.title, text, url: location.href }); } catch { /* cancelado */ } }
    else window.open(whatsappUrl(text), "_blank", "noopener");
  };
  row.appendChild(btn);
  sec.append(h2, ul, row);
  (main.querySelector(".prose") ?? main).after(sec);
}
if (typeof document !== "undefined") init();
