import { backupPanel, formatMoney, h, loadJson, replaceChildren, saveJson } from "../../../packages/ui/src/index.ts";
import { compute, type Form } from "./calc.ts";
import { addQuote, makeQuote, parseQuotes, quoteText, removeQuote, scenarios, type Quote } from "./quotes.ts";

const CURRENCIES = ["COP", "USD", "EUR", "MXN", "ARS", "PEN", "CLP", "BRL"];
const form: Form = { currency: "COP", materials: "", hours: "", rate: "", transport: "", overhead: "", commissionPct: "", goal: "margin", goalPct: "30", taxPct: "" };
const root = document.getElementById("app")!;
const QKEY = "priceright.quotes.v1";
let quotes: Quote[] = loadJson(QKEY, parseQuotes, []);
const meta = { client: "", job: "", days: "15", note: "", seller: "" };
let shared = "", qmsg: { kind: "ok" | "error"; text: string } | null = null;
const out = h("div", { "aria-live": "polite", "data-testid": "output" });

function text(id: keyof Form, label: string, hint?: string): HTMLElement {
  return h(
    "div",
    { class: "field" },
    h("label", { for: id }, label),
    h("input", {
      id, type: "text", inputmode: "decimal", autocomplete: "off", value: form[id],
      "aria-describedby": hint ? `${id}-hint` : null,
      onInput: (e: Event) => { (form[id] as string) = (e.target as HTMLInputElement).value; update(); },
    }),
    hint ? h("p", { class: "hint", id: `${id}-hint` }, hint) : null,
  );
}

function update(): void {
  const o = compute(form);
  const money = (m: number) => formatMoney(m, form.currency);
  if (!o.ok) {
    replaceChildren(out, h("p", { class: "hint", "data-testid": "hint" }, o.error));
    return;
  }
  const r = o.result;
  const pct = (b: number) => `${(b / 100).toFixed(2).replace(".", ",")} %`;
  replaceChildren(
    out,
    h(
      "section",
      { class: "result", "aria-labelledby": "res-title" },
      h("h2", { id: "res-title" }, "Precio que debes cobrar"),
      h("p", { class: "big", "data-testid": "final-price" }, money(r.grossPrice)),
      r.tax > 0 ? h("p", { class: "label" }, `Incluye impuesto de ${money(r.tax)}.`) : h("p", { class: "label" }, "Sin impuesto (no escribiste ningún porcentaje)."),
      h(
        "dl",
        {},
        h("dt", {}, "Costo total"), h("dd", {}, money(r.totalCost)),
        h("dt", {}, "Precio sin impuesto"), h("dd", { "data-testid": "net-price" }, money(r.netPrice)),
        r.commission > 0 ? h("dt", {}, "Comisión") : null, r.commission > 0 ? h("dd", {}, money(r.commission)) : null,
        h("dt", {}, "Tu ganancia"), h("dd", { "data-testid": "profit" }, money(r.profit)),
        h("dt", {}, "Margen real"), h("dd", {}, pct(r.actualMarginBps)),
        h("dt", {}, "Recargo equivalente"), h("dd", {}, pct(r.actualMarkupBps)),
      ),
      h("h3", {}, "Cómo se calculó"),
      h("ul", { class: "formulas" }, ...o.formulas.map((f) => h("li", {}, f))),
    ),
    scenarioTable(),
  );
}

function scenarioTable(): HTMLElement | null {
  const sc = scenarios(form);
  if (sc.length === 0) return null;
  const money = (m: number) => formatMoney(m, form.currency);
  return h("section", { class: "panel", "data-testid": "scenarios" }, h("h2", {}, "Compara márgenes"),
    h("p", { class: "hint" }, "Con tus mismos costos: cuánto cobrarías y cuánto ganarías según el margen."),
    h("table", { class: "scen" }, h("thead", {}, h("tr", {}, ...["Margen", "Precio final", "Ganancia"].map((x) => h("th", { scope: "col" }, x)))),
      h("tbody", {}, ...sc.map((x) => h("tr", { class: form.goal === "margin" && Number(form.goalPct.replace(",", ".")) === x.marginPct ? "current" : "" }, h("td", {}, `${x.marginPct} %`), h("td", {}, money(x.gross)), h("td", {}, money(x.profit)))))));
}

function quoteSection(): HTMLElement {
  const money = (q: Quote) => (m: number) => formatMoney(m, q.form.currency);
  const input = (id: keyof typeof meta, label: string, extra: Record<string, unknown> = {}) => h("div", { class: "field" }, h("label", { for: `q-${id}` }, label), h("input", { id: `q-${id}`, type: "text", autocomplete: "off", value: meta[id], onInput: (e: Event) => { meta[id] = (e.target as HTMLInputElement).value; }, ...extra }));
  return h("section", { class: "panel", "data-testid": "quotes" },
    h("h2", {}, "Cotización para tu cliente"),
    h("p", { class: "hint" }, "Guarda el precio calculado y genera un texto para enviar. El cliente ve el valor total, no tus costos ni tu margen."),
    qmsg && h("p", { class: `note ${qmsg.kind}`, role: qmsg.kind === "error" ? "alert" : "status" }, qmsg.text),
    h("div", { class: "row" }, input("job", "Trabajo", { maxlength: "80", placeholder: "Pintura de sala" }), input("client", "Cliente (opcional)", { maxlength: "60" })),
    h("div", { class: "row" }, input("days", "Válida por (días)", { inputmode: "numeric" }), input("seller", "Tu nombre o negocio (opcional)", { maxlength: "60" })),
    input("note", "Nota (opcional)", { maxlength: "200", placeholder: "Pago 50 % de anticipo" }),
    h("button", { type: "button", class: "primary", onClick: () => {
      try { const q = makeQuote(form, { client: meta.client, job: meta.job, days: Number(meta.days), note: meta.note }, `q${Date.now()}`, new Date().toISOString()); quotes = addQuote(quotes, q); if (!saveJson(QKEY, quotes)) throw new Error("No se pudo guardar en este navegador."); qmsg = { kind: "ok", text: "Cotización guardada." }; shared = q.id; }
      catch (e) { qmsg = { kind: "error", text: (e as Error).message }; }
      renderQuotes();
    } }, "Guardar cotización"),
    quotes.length === 0 ? null : h("ul", { class: "quote-list", "data-testid": "quote-list" }, ...quotes.map((q) => h("li", {},
      h("div", { class: "main" }, h("strong", {}, q.job), h("span", { class: "sub" }, `${q.client || "Sin cliente"} · ${q.createdAt.slice(0, 10)}`)),
      h("span", { class: "amt" }, money(q)(q.gross)),
      h("div", { class: "actions" },
        h("button", { type: "button", class: "small", onClick: () => { Object.assign(form, q.form); meta.job = q.job; meta.client = q.client; meta.note = q.note; meta.days = String(q.days); render(); } }, "Usar como base"),
        h("button", { type: "button", class: "small", onClick: () => { shared = shared === q.id ? "" : q.id; renderQuotes(); } }, "Compartir"),
        h("button", { type: "button", class: "ghost small", "aria-label": `Quitar la cotización ${q.job}`, onClick: () => { quotes = removeQuote(quotes, q.id); saveJson(QKEY, quotes); renderQuotes(); } }, "Quitar")),
      shared === q.id ? shareBox(q) : null))));
}
function shareBox(q: Quote): HTMLElement {
  const text = quoteText(q, (m) => formatMoney(m, q.form.currency), meta.seller.trim());
  return h("div", { class: "share", "data-testid": "quote-share" }, h("pre", {}, text), h("div", { class: "actions" },
    h("button", { type: "button", class: "primary small", onClick: async (e: Event) => { const b = e.target as HTMLButtonElement; try { await navigator.clipboard.writeText(text); b.textContent = "Copiado"; } catch { b.textContent = "Selecciona y copia"; } } }, "Copiar"),
    h("a", { class: "button small", href: `https://wa.me/?text=${encodeURIComponent(text)}`, target: "_blank", rel: "noopener" }, "WhatsApp"),
    h("button", { type: "button", class: "small", onClick: () => { const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" })); const a = h("a", { href: url, download: `cotizacion-${q.job.replace(/[^\w-]+/g, "_")}.txt` }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); } }, "Descargar .txt")));
}
const quoteHost = h("div", {});
function renderQuotes(): void { replaceChildren(quoteHost, quoteSection()); }

const currency = h(
  "select",
  { id: "currency", onChange: (e: Event) => { form.currency = (e.target as HTMLSelectElement).value; update(); } },
  ...CURRENCIES.map((c) => h("option", { value: c, selected: c === form.currency }, c)),
);

const goal = h(
  "fieldset",
  {},
  h("legend", {}, "¿Qué quieres fijar?"),
  h(
    "div",
    { class: "row" },
    ...(["margin", "markup"] as const).map((g) =>
      h(
        "label",
        { class: "check", style: "display:flex;gap:.5rem;align-items:center;font-weight:500" },
        h("input", { type: "radio", name: "goal", value: g, checked: form.goal === g, onChange: () => { form.goal = g; update(); } }),
        g === "margin" ? "Un margen sobre el precio" : "Un recargo sobre el costo",
      ),
    ),
  ),
);

function render(): void {
replaceChildren(
  root,
  h(
    "form",
    { class: "panel", onSubmit: (e: Event) => e.preventDefault() },
    h("h2", {}, "Tus costos"),
    h("div", { class: "field" }, h("label", { for: "currency" }, "Moneda"), currency),
    h("div", { class: "row" }, text("materials", "Materiales"), text("transport", "Transporte")),
    h("div", { class: "row" }, text("hours", "Horas de trabajo", "Con un decimal, por ejemplo 1,5."), text("rate", "Tarifa por hora")),
    text("overhead", "Costos indirectos o fijos", "La parte de arriendo, herramientas o servicios que le toca a este trabajo."),
    h("h2", {}, "Tu ganancia"),
    goal,
    h("div", { class: "row three" }, text("goalPct", "Porcentaje (%)"), text("commissionPct", "Comisión (%)", "Opcional"), text("taxPct", "Impuesto (%)", "Opcional. Depende de tu país.")),
  ),
  out,
  quoteHost,
  backupPanel({ app: "priceright", keys: [QKEY] }),
);
  (currency as HTMLSelectElement).value = form.currency;
  goal.querySelectorAll<HTMLInputElement>("input[type=radio]").forEach((r) => { r.checked = r.value === form.goal; });
  update();
  renderQuotes();
}
render();
