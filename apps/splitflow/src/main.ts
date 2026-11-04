import {
  currencyDigits,
  formatMoney,
  backupPanel,
  h,
  loadJson,
  parseAmount,
  parsePercentToBps,
  replaceChildren,
  saveJson,
} from "../../../packages/ui/src/index.ts";
import {
  addExpense,
  addPerson,
  byCategory,
  byPerson,
  CATEGORIES,
  recordPayment,
  summaryText,
  updateExpense,
  emptyState,
  newGroup,
  parseState,
  removeExpense,
  removePerson,
  summarize,
  toCsv,
  type Group,
  type SplitMode,
  type State,
} from "./state.ts";

const STORAGE_KEY = "splitflow:v1";
const CURRENCIES = ["COP", "USD", "EUR", "MXN", "ARS", "PEN", "CLP", "BRL"];

let state: State = loadJson<State>(STORAGE_KEY, parseState, emptyState());
let creatingGroup = false;
let message: { kind: "error" | "ok"; text: string } | null = null;
const armed = new Set<string>(); // botones de borrado en segundo paso

interface Draft {
  description: string;
  amount: string;
  paidBy: string;
  mode: SplitMode;
  participants: Set<string>;
  percents: Record<string, string>;
  exacts: Record<string, string>;
  category: string;
  editingId: string;
}
let shareOpen = false;
let draft: Draft = blankDraft();

function blankDraft(): Draft {
  return { description: "", amount: "", paidBy: "", mode: "equal", participants: new Set(), percents: {}, exacts: {}, category: "", editingId: "" };
}

const root = document.getElementById("app");
if (!root) throw new Error("Falta #app");

function active(): Group | null {
  return state.groups.find((g) => g.id === state.activeId) ?? null;
}

function commit(next: State): void {
  state = next;
  if (!saveJson(STORAGE_KEY, state)) {
    message = { kind: "error", text: "No se pudo guardar en este navegador. Exporta tus datos para no perderlos." };
  }
}

function setGroup(g: Group): void {
  commit({ ...state, groups: state.groups.map((x) => (x.id === g.id ? g : x)) });
}

function attempt(fn: () => void): void {
  try {
    message = null;
    fn();
  } catch (e) {
    message = { kind: "error", text: e instanceof Error ? e.message : "Algo salió mal." };
  }
  render();
}

/* ------------------------------ vistas ------------------------------ */

function render(): void {
  const g = active();
  replaceChildren(
    root!,
    h("header", { class: "top" }, h("h1", { class: "brand" }, h("img", { class: "logo", src: "./icon.svg", alt: "", width: "44", height: "44" }), h("span", {}, "SplitFlow", h("small", { class: "es" }, "Dividir Cuentas"))), g ? groupPicker(g) : null),
    message ? h("p", { class: `note ${message.kind}`, role: message.kind === "error" ? "alert" : "status" }, message.text) : null,
    !g || creatingGroup ? newGroupForm(state.groups.length > 0) : null,
    g && !creatingGroup ? groupView(g) : null,
    !g ? backupPanel({ app: "splitflow", keys: [STORAGE_KEY] }) : null,
    h("footer", { class: "foot" }, "Tus datos se guardan solo en este dispositivo."),
  );
}

function groupPicker(g: Group): HTMLElement {
  return h(
    "div",
    { class: "picker" },
    h(
      "label",
      { class: "sr-only", for: "group-select" },
      "Grupo activo",
    ),
    h(
      "select",
      {
        id: "group-select",
        onChange: (e: Event) => {
          commit({ ...state, activeId: (e.target as HTMLSelectElement).value });
          draft = blankDraft();
          render();
        },
      },
      ...state.groups.map((x) => h("option", { value: x.id, selected: x.id === g.id }, x.name)),
    ),
    h("button", { type: "button", class: "ghost", onClick: () => { creatingGroup = true; render(); } }, "Nuevo grupo"),
  );
}

function newGroupForm(canCancel: boolean): HTMLElement {
  const name = h("input", { id: "group-name", name: "group-name", type: "text", autocomplete: "off", required: true });
  const currency = h(
    "select",
    { id: "group-currency" },
    ...CURRENCIES.map((c) => h("option", { value: c }, c)),
  );
  return h(
    "form",
    {
      class: "panel",
      onSubmit: (e: Event) => {
        e.preventDefault();
        attempt(() => {
          const g = newGroup(name.value, currency.value);
          commit({ ...state, groups: [...state.groups, g], activeId: g.id });
          creatingGroup = false;
          draft = blankDraft();
        });
      },
    },
    h("h2", {}, state.groups.length === 0 ? "Crea tu primer grupo" : "Nuevo grupo"),
    state.groups.length === 0
      ? h("p", { class: "hint" }, "Un grupo es un viaje, una casa o una salida. Después añades a las personas y los gastos.")
      : null,
    h("div", { class: "row" },
      field("Nombre del grupo", name),
      field("Moneda", currency),
    ),
    h("div", { class: "actions" },
      h("button", { type: "submit", class: "primary" }, "Crear grupo"),
      canCancel ? h("button", { type: "button", class: "ghost", onClick: () => { creatingGroup = false; render(); } }, "Cancelar") : null,
    ),
  );
}

function field(label: string, control: HTMLElement, hint?: string): HTMLElement {
  const id = control.id;
  return h("div", { class: "field" }, h("label", { for: id }, label), control, hint ? h("p", { class: "hint", id: `${id}-hint` }, hint) : null);
}

function groupView(g: Group): HTMLElement {
  const digits = currencyDigits(g.currency);
  const money = (m: number) => formatMoney(m, g.currency);
  const name = (id: string) => g.people.find((p) => p.id === id)?.name ?? "?";
  const s = summarize(g);

  return h(
    "main",
    {},
    // Hero: la cuenta
    h(
      "section",
      { class: "bill", "aria-labelledby": "bill-title" },
      h("h2", { id: "bill-title" }, "Para quedar a mano"),
      g.people.length < 2
        ? h("p", { class: "empty" }, "Añade al menos dos personas para repartir gastos.")
        : g.expenses.length === 0
          ? h("p", { class: "empty" }, "Cuando registres un gasto, aquí verás quién le paga a quién.")
          : s.transfers.length === 0
            ? h("p", { class: "empty settled" }, "Todos están a mano.")
            : h(
                "ul",
                { class: "ledger", "data-testid": "transfers" },
                ...s.transfers.map((t) =>
                  h(
                    "li",
                    {},
                    h("span", { class: "who" }, `${name(t.from)} paga a ${name(t.to)}`),
                    h("span", { class: "leader", "aria-hidden": "true" }),
                    h("span", { class: "amt" }, money(t.amount)),
                    h("button", { type: "button", class: "small", "aria-label": `Registrar el pago de ${name(t.from)} a ${name(t.to)} por ${money(t.amount)}`, onClick: () => attempt(() => { setGroup(recordPayment(g, t.from, t.to, t.amount)); message = { kind: "ok", text: `Pago registrado: ${name(t.from)} → ${name(t.to)}.` }; }) }, "Registrar pago"),
                  ),
                ),
              ),
      g.expenses.length > 0
        ? h("p", { class: "total" }, `Total gastado: ${money(s.total)} en ${g.expenses.length} ${g.expenses.length === 1 ? "gasto" : "gastos"}`)
        : null,
    ),
    g.people.length >= 2 ? expenseForm(g, digits) : null,
    expenseList(g, money, name),
    balances(g, s.balances, money),
    totalsSection(g, money, name),
    peopleSection(g),
    groupActions(g, digits),
    backupPanel({ app: "splitflow", keys: [STORAGE_KEY] }),
  );
}

function expenseForm(g: Group, digits: number): HTMLElement {
  if (draft.participants.size === 0 && draft.description === "" && draft.amount === "") {
    draft.participants = new Set(g.people.map((p) => p.id));
  }
  if (draft.paidBy === "" || !g.people.some((p) => p.id === draft.paidBy)) draft.paidBy = g.people[0]!.id;

  const desc = h("input", { id: "exp-desc", type: "text", autocomplete: "off", value: draft.description, onInput: (e: Event) => { draft.description = (e.target as HTMLInputElement).value; } });
  const amount = h("input", { id: "exp-amount", type: "text", inputmode: "decimal", autocomplete: "off", value: draft.amount, onInput: (e: Event) => { draft.amount = (e.target as HTMLInputElement).value; refreshDetail(); } });
  const paidBy = h(
    "select",
    { id: "exp-paid", onChange: (e: Event) => { draft.paidBy = (e.target as HTMLSelectElement).value; } },
    ...g.people.map((p) => h("option", { value: p.id, selected: p.id === draft.paidBy }, p.name)),
  );

  const category = h("select", { id: "exp-cat", onChange: (e: Event) => { draft.category = (e.target as HTMLSelectElement).value; } }, h("option", { value: "" }, "Sin categoría"), ...CATEGORIES.map((c) => h("option", { value: c, selected: c === draft.category }, c)));
  const detail = h("div", { class: "detail", "aria-live": "polite" });
  const refreshDetail = (): void => replaceChildren(detail, ...detailNodes(g, digits));
  refreshDetail();

  const who = h(
    "fieldset",
    {},
    h("legend", {}, "Entre quiénes"),
    h(
      "div",
      { class: "checks" },
      ...g.people.map((p) =>
        h(
          "label",
          { class: "check" },
          h("input", {
            type: "checkbox",
            checked: draft.participants.has(p.id),
            onChange: (e: Event) => {
              if ((e.target as HTMLInputElement).checked) draft.participants.add(p.id);
              else draft.participants.delete(p.id);
              refreshDetail();
            },
          }),
          p.name,
        ),
      ),
    ),
  );

  const modes: [SplitMode, string][] = [
    ["equal", "En partes iguales"],
    ["percent", "Por porcentaje"],
    ["exact", "Montos exactos"],
  ];
  const how = h(
    "fieldset",
    {},
    h("legend", {}, "Cómo se reparte"),
    h(
      "div",
      { class: "checks" },
      ...modes.map(([value, label]) =>
        h(
          "label",
          { class: "check" },
          h("input", {
            type: "radio",
            name: "mode",
            value,
            checked: draft.mode === value,
            onChange: () => { draft.mode = value; refreshDetail(); },
          }),
          label,
        ),
      ),
    ),
  );

  return h(
    "section",
    { "aria-labelledby": "new-title" },
    h(
      "form",
      {
        class: "panel",
        onSubmit: (e: Event) => {
          e.preventDefault();
          attempt(() => {
            const amountMinor = parseAmount(draft.amount, digits);
            if (amountMinor === null) throw new RangeError("Escribe un monto válido, mayor que 0.");
            const participants = g.people.filter((p) => draft.participants.has(p.id)).map((p) => p.id);
            const percents: Record<string, number> = {};
            const exacts: Record<string, number> = {};
            for (const id of participants) {
              if (draft.mode === "percent") {
                const raw = draft.percents[id] ?? "";
                const bps = raw.trim() === "" ? 0 : parsePercentToBps(raw);
                if (bps === null) throw new RangeError("Revisa los porcentajes: usa números entre 0 y 100, con hasta 2 decimales.");
                percents[id] = bps;
              }
              if (draft.mode === "exact") {
                const raw = draft.exacts[id] ?? "";
                exacts[id] = raw.trim() === "" ? 0 : (parseAmount(raw, digits) ?? NaN);
                if (Number.isNaN(exacts[id])) throw new RangeError("Revisa los montos por persona.");
              }
            }
            const input = { description: draft.description, amount: amountMinor, paidBy: draft.paidBy, mode: draft.mode, participants, percents, exacts, category: draft.category };
            const editing = draft.editingId !== "";
            const next = editing ? updateExpense(g, draft.editingId, input) : addExpense(g, input);
            setGroup(next);
            const keepMode = draft.mode;
            draft = blankDraft();
            draft.mode = keepMode;
            message = { kind: "ok", text: editing ? "Gasto actualizado." : "Gasto añadido." };
          });
          document.getElementById("exp-desc")?.focus();
        },
      },
      h("h2", { id: "new-title" }, draft.editingId ? "Editar gasto" : "Nuevo gasto"),
      h("div", { class: "row" }, field("Descripción", desc), field(`Monto (${g.currency})`, amount)),
      h("div", { class: "row" }, field("Pagó", paidBy), field("Categoría", category)),
      who,
      how,
      detail,
      h("div", { class: "actions" }, h("button", { type: "submit", class: "primary" }, draft.editingId ? "Guardar cambios" : "Añadir gasto"), draft.editingId ? h("button", { type: "button", class: "ghost", onClick: () => { draft = blankDraft(); render(); } }, "Cancelar edición") : null),
    ),
  );
}

function detailNodes(g: Group, digits: number): Node[] {
  const chosen = g.people.filter((p) => draft.participants.has(p.id));
  const total = parseAmount(draft.amount, digits);
  if (draft.mode === "equal") {
    if (total === null || chosen.length === 0) return [h("p", { class: "hint" }, "Se divide en partes iguales entre las personas marcadas.")];
    const share = formatMoney(Math.floor(total / chosen.length), g.currency);
    return [h("p", { class: "hint" }, `Cada persona paga cerca de ${share}. Si sobran centavos, se reparten de uno en uno.`)];
  }
  const isPct = draft.mode === "percent";
  const store = isPct ? draft.percents : draft.exacts;
  const status = h("p", { class: "hint", "data-testid": "split-status" });
  const paint = (): void => {
    const cur = chosen.reduce((acc, p) => {
      const raw = store[p.id] ?? "";
      if (raw.trim() === "") return acc;
      const v = isPct ? parsePercentToBps(raw) : parseAmount(raw, digits);
      return acc + (v ?? 0);
    }, 0);
    if (isPct) status.textContent = cur === 10000 ? "Suma 100 %." : `Suma ${(cur / 100).toFixed(2)} %. Debe sumar 100 %.`;
    else {
      const t = parseAmount(draft.amount, digits);
      const diff = (t ?? 0) - cur;
      status.textContent = t === null ? "Escribe primero el monto total." : diff === 0 ? "Los montos suman el total." : diff > 0 ? `Faltan ${formatMoney(diff, g.currency)}.` : `Sobran ${formatMoney(-diff, g.currency)}.`;
    }
  };
  const rows = chosen.map((p) => {
    const id = `part-${p.id}`;
    return h(
      "div",
      { class: "field inline" },
      h("label", { for: id }, isPct ? `% de ${p.name}` : `${p.name} (${g.currency})`),
      h("input", {
        id,
        type: "text",
        inputmode: "decimal",
        autocomplete: "off",
        value: store[p.id] ?? "",
        onInput: (e: Event) => { store[p.id] = (e.target as HTMLInputElement).value; paint(); },
      }),
    );
  });
  paint();
  return [...rows, status];
}

function startEdit(g: Group, id: string): void {
  const e = g.expenses.find((x) => x.id === id);
  if (!e) return;
  const digits = currencyDigits(g.currency);
  const ids = Object.keys(e.shares);
  const equalish = e.mode === "equal";
  draft = { description: e.description, amount: String(e.amount / 10 ** digits).replace(".", ","), paidBy: e.paidBy, mode: equalish ? "equal" : "exact", participants: new Set(ids), percents: {}, exacts: equalish ? {} : Object.fromEntries(ids.map((i) => [i, String((e.shares[i] ?? 0) / 10 ** digits).replace(".", ",")])), category: e.category ?? "", editingId: id };
  message = null;
  render();
  document.getElementById("new-title")?.scrollIntoView({ block: "start" });
}

function expenseList(g: Group, money: (m: number) => string, name: (id: string) => string): HTMLElement {
  return h(
    "section",
    { "aria-labelledby": "exp-title" },
    h("h2", { id: "exp-title" }, "Gastos"),
    g.expenses.length === 0
      ? h("p", { class: "empty" }, "Aún no hay gastos.")
      : h(
          "ul",
          { class: "rows", "data-testid": "expenses" },
          ...g.expenses.map((e) => {
            const key = `exp:${e.id}`;
            return h(
              "li",
              {},
              h("div", { class: "main" }, h("strong", {}, e.kind === "payment" ? `Pago a ${name(Object.keys(e.shares)[0] ?? "")}` : e.description), h("span", { class: "sub" }, `${e.kind === "payment" ? "Pagó" : "Pagó"} ${name(e.paidBy)}, ${e.date}${e.category ? ` · ${e.category}` : ""}`)),
              h("span", { class: "amt" }, money(e.amount)),
              e.kind === "payment" ? null : h("button", { type: "button", class: "ghost", "aria-label": `Editar ${e.description}`, onClick: () => startEdit(g, e.id) }, "Editar"),
              h(
                "button",
                {
                  type: "button",
                  class: armed.has(key) ? "danger" : "ghost",
                  "aria-label": `${armed.has(key) ? "Confirmar borrado de" : "Borrar"} ${e.description}`,
                  onClick: () => {
                    if (!armed.has(key)) {
                      armed.add(key);
                      setTimeout(() => { armed.delete(key); render(); }, 4000);
                      render();
                    } else {
                      armed.delete(key);
                      attempt(() => setGroup(removeExpense(g, e.id)));
                    }
                  },
                },
                armed.has(key) ? "Confirmar" : "Borrar",
              ),
            );
          }),
        ),
  );
}

function totalsSection(g: Group, money: (m: number) => string, name: (id: string) => string): HTMLElement | null {
  if (g.expenses.filter((e) => e.kind !== "payment").length === 0) return null;
  const per = byPerson(g), cats = byCategory(g);
  const text = summaryText(g, money);
  return h("section", { "aria-labelledby": "tot-title", "data-testid": "totals" },
    h("h2", { id: "tot-title" }, "Resumen"),
    h("table", { class: "recon", "aria-label": "Lo que puso y lo que le tocó a cada persona" }, h("thead", {}, h("tr", {}, ...["Persona", "Puso", "Le tocó"].map((x) => h("th", { scope: "col" }, x)))),
      h("tbody", {}, ...per.map((p) => h("tr", {}, h("td", {}, name(p.id)), h("td", {}, money(p.paid)), h("td", {}, money(p.consumed)))))),
    cats.length > 1 || (cats[0] && cats[0].category !== "Sin categoría") ? h("ul", { class: "rows", "data-testid": "by-category" }, ...cats.map((c) => h("li", {}, h("div", { class: "main" }, c.category), h("span", { class: "amt" }, money(c.total))))) : null,
    h("div", { class: "actions" }, h("button", { type: "button", onClick: () => { shareOpen = !shareOpen; render(); } }, shareOpen ? "Ocultar resumen" : "Compartir resumen")),
    shareOpen ? h("div", { class: "share", "data-testid": "share" }, h("pre", {}, text), h("div", { class: "actions" },
      h("button", { type: "button", class: "primary", onClick: async (e: Event) => { const b = e.target as HTMLButtonElement; try { await navigator.clipboard.writeText(text); b.textContent = "Copiado"; } catch { b.textContent = "Selecciona y copia el texto"; } } }, "Copiar"),
      h("a", { class: "button", href: `https://wa.me/?text=${encodeURIComponent(text)}`, target: "_blank", rel: "noopener" }, "Enviar por WhatsApp"))) : null);
}

function balances(g: Group, b: Record<string, number>, money: (m: number) => string): HTMLElement {
  return h(
    "section",
    { "aria-labelledby": "bal-title" },
    h("h2", { id: "bal-title" }, "Saldos"),
    g.people.length === 0
      ? h("p", { class: "empty" }, "Sin personas todavía.")
      : h(
          "ul",
          { class: "rows", "data-testid": "balances" },
          ...g.people.map((p) => {
            const v = b[p.id] ?? 0;
            return h(
              "li",
              {},
              h("div", { class: "main" }, h("strong", {}, p.name)),
              h("span", { class: `amt ${v > 0 ? "plus" : v < 0 ? "minus" : ""}` }, v > 0 ? `Le deben ${money(v)}` : v < 0 ? `Debe ${money(-v)}` : "A mano"),
            );
          }),
        ),
  );
}

function peopleSection(g: Group): HTMLElement {
  const input = h("input", { id: "person-name", type: "text", autocomplete: "off" });
  return h(
    "section",
    { "aria-labelledby": "ppl-title" },
    h("h2", { id: "ppl-title" }, "Personas"),
    g.people.length > 0
      ? h(
          "ul",
          { class: "rows" },
          ...g.people.map((p) =>
            h(
              "li",
              {},
              h("div", { class: "main" }, h("strong", {}, p.name)),
              h("button", { type: "button", class: "ghost", "aria-label": `Quitar a ${p.name}`, onClick: () => attempt(() => setGroup(removePerson(g, p.id))) }, "Quitar"),
            ),
          ),
        )
      : null,
    h(
      "form",
      {
        class: "inline-form",
        onSubmit: (e: Event) => {
          e.preventDefault();
          attempt(() => {
            setGroup(addPerson(g, input.value));
            draft.participants = new Set();
          });
          document.getElementById("person-name")?.focus();
        },
      },
      field("Añadir persona", input),
      h("button", { type: "submit", class: "primary" }, "Añadir"),
    ),
  );
}

function groupActions(g: Group, digits: number): HTMLElement {
  const key = `grp:${g.id}`;
  return h(
    "section",
    { class: "tools", "aria-label": "Herramientas del grupo" },
    h(
      "button",
      {
        type: "button",
        class: "ghost",
        onClick: () => {
          const blob = new Blob([toCsv(g, digits)], { type: "text/csv;charset=utf-8" });
          const a = h("a", { href: URL.createObjectURL(blob), download: `${g.name.replace(/[^\w-]+/g, "_")}.csv` });
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        },
      },
      "Exportar CSV",
    ),
    h(
      "button",
      {
        type: "button",
        class: armed.has(key) ? "danger" : "ghost",
        onClick: () => {
          if (!armed.has(key)) {
            armed.add(key);
            setTimeout(() => { armed.delete(key); render(); }, 4000);
            render();
            return;
          }
          armed.delete(key);
          const groups = state.groups.filter((x) => x.id !== g.id);
          commit({ ...state, groups, activeId: groups[0]?.id ?? null });
          draft = blankDraft();
          render();
        },
      },
      armed.has(key) ? "Confirmar: eliminar grupo y sus datos" : "Eliminar grupo",
    ),
  );
}

render();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch(() => undefined);
}
