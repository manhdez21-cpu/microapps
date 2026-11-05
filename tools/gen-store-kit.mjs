// Kit de Google Play por app: ficha (textos), icono 512, imagen destacada 1024x500 y capturas 1080x1920.
// Uso: node tools/gen-store-kit.mjs  (requiere dist/ construido; capturas con Playwright, imágenes con sharp)
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { launch, startServer } from "../tests/e2e/helpers.mjs";
const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_PATH ?? "/home/claude/.npm-global/lib/node_modules/sharp");
const root = new URL("..", import.meta.url).pathname;
const out = join(root, "docs/play");
const ymd = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const open = (p) => p.evaluate(() => document.querySelectorAll("details.add-wrap").forEach((d) => d.setAttribute("open", "")));

const APPS = [
  { id: "splitflow", name: "SplitFlow: Dividir Cuentas", color: "#3a3fc4", tag: "Divide gastos y ve quién paga a quién",
    short: "Divide gastos entre amigos y ve quién le paga a quién. Gratis, sin registro.",
    long: "SplitFlow te ayuda a repartir gastos en un viaje, una casa compartida o una salida con amigos.\n\n• Anota cada gasto: quién pagó, cuánto y entre quiénes se reparte.\n• Reparte en partes iguales, por porcentaje o por montos exactos.\n• Mira el saldo de cada persona y los pagos mínimos para quedar a mano.\n• Registra los pagos y la deuda se actualiza sola.\n• Totales por persona y por categoría.\n• Comparte el resumen por WhatsApp o descárgalo en CSV.\n• Respalda y restaura tus datos en un archivo.\n\nGratis y sin registro. Tus datos se guardan en tu dispositivo." },
  { id: "caja-clara", name: "Caja Clara: Cierre de caja", color: "#8a4a0f", tag: "Cierra la caja del día sin sufrir",
    short: "Cierra la caja del día y mira si cuadra. Para tiendas y negocios pequeños.",
    long: "Caja Clara es el cierre de caja diario para tiendas y negocios pequeños.\n\n• Anota ventas en efectivo, con tarjeta, por transferencia y fiadas.\n• Registra gastos pagados de la caja, retiros y cobros de fiado.\n• Compara el efectivo esperado con el contado y ve el faltante o sobrante, con la fórmula a la vista.\n• Reportes por día, semana y mes, con gráfica de ventas.\n• Fiados por cobrar, por cliente.\n• Edita cierres guardados, descarga CSV y respalda tus datos.\n\nGratis y sin registro. Tus datos se guardan en tu dispositivo. No sustituye la contabilidad de tu negocio." },
  { id: "priceright", name: "PriceRight: Precio Justo", color: "#15694a", tag: "Pon precio a tu trabajo sin regalarlo",
    short: "Calcula el precio de tu trabajo con margen real. Para independientes y negocios.",
    long: "PriceRight calcula cuánto cobrar por un trabajo o un producto.\n\n• Suma materiales, transporte, horas, costos indirectos y comisión.\n• Elige un margen sobre el precio o un recargo sobre el costo, y ve la fórmula paso a paso.\n• Agrega el impuesto si lo conoces.\n• Compara márgenes del 10 % al 50 % de un vistazo.\n• Guarda cotizaciones y compártelas con tu cliente sin mostrar tus costos.\n• Respalda y restaura tus datos.\n\nGratis y sin registro. Los resultados son orientativos." },
  { id: "cuanto-me-sobra", name: "¿Cuánto me sobra?", color: "#1f5fa8", tag: "Cuánta cerámica o pintura comprar",
    short: "Calcula cuántas cajas de cerámica o litros de pintura necesitas para tu obra.",
    long: "¿Cuánto me sobra? calcula los materiales de una remodelación para que no compres de menos ni de más.\n\n• Cerámica: cajas, adhesivo y boquilla, con porcentaje de desperdicio.\n• Pintura: litros y latas según el rendimiento.\n• Costo total y lista de materiales.\n• Compártelo por WhatsApp.\n\nGratis y sin registro. Los resultados son orientativos: confirma las cantidades con tu proveedor." },
  { id: "expiryhub", name: "ExpiryHub: Vencimientos", color: "#1e3a8a", tag: "SOAT, seguros y licencias a tiempo",
    short: "Controla qué vence y cuándo renovar: SOAT, seguros, licencias y contratos.",
    long: "ExpiryHub reúne en un solo lugar lo que vence: SOAT, seguro, licencia de conducción, impuestos y contratos.\n\n• Perfiles: tú, tu carro, tu casa o tu negocio.\n• Avisos con la anticipación que elijas.\n• Renueva y guarda el historial; la app sugiere la próxima fecha.\n• Calendario mensual y archivo .ics para el calendario del teléfono.\n• Costo de lo que renovarás en los próximos 12 meses.\n• Adjunta una foto o PDF del documento.\n\nGratis y sin registro. Tus datos y adjuntos se quedan en tu dispositivo." },
  { id: "warranty-keeper", name: "Warranty Keeper: Garantías", color: "#1d3f9c", tag: "Garantías con factura y fecha de fin",
    short: "Guarda tus compras con factura y sabe cuándo termina cada garantía.",
    long: "Warranty Keeper guarda las garantías de tus compras para que no pierdas un reclamo por no encontrar la factura.\n\n• Fecha de fin de la garantía, garantía extendida y días para devolver.\n• Marca, modelo, serie, precio y servicio técnico.\n• Factura adjunta en foto o PDF.\n• Búsqueda sin tildes y filtros: vigentes, por vencer y terminadas.\n• Valor total de lo que aún tiene garantía.\n• Respaldo y restauración en un archivo.\n\nGratis y sin registro. Tus datos y facturas se quedan en tu dispositivo. Las condiciones reales las fija el vendedor o la ley: revisa tu factura." },
  { id: "huella-al-dia", name: "Huella al Día: mascotas", color: "#0f766e", tag: "El carnet de tu mascota en el celular",
    short: "Carnet de tu perro o gato: vacunas, desparasitaciones y lo próximo que le toca.",
    long: "Huella al Día es el carnet de tu mascota en el celular.\n\n• Una ficha por mascota con sus datos.\n• Registra vacunas, desparasitaciones y visitas al veterinario.\n• Recordatorios que se renuevan solos según la repetición.\n• Gasto por mes y por tipo.\n• Respalda y restaura tus datos.\n\nGratis y sin registro. Tus datos se quedan en tu dispositivo. No da diagnósticos ni dosis y no reemplaza la atención veterinaria." },
];
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const flows = {
  splitflow: async (p) => { await p.getByLabel("Nombre del grupo").fill("Viaje a Cartagena"); await p.getByRole("button", { name: "Crear grupo" }).click();
    for (const n of ["Ana", "Beto", "Caro"]) { await p.getByLabel("Añadir persona").fill(n); await p.getByRole("button", { name: "Añadir", exact: true }).click(); }
    for (const [d, m, w, c] of [["Cena", "90000", "Ana", "Comida"], ["Hotel", "240000", "Beto", "Alojamiento"], ["Taxi", "36000", "Caro", "Transporte"]]) { await p.getByLabel("Descripción").fill(d); await p.getByLabel("Monto (COP)").fill(m); await p.locator("#exp-paid").selectOption({ label: w }); await p.locator("#exp-cat").selectOption(c).catch(() => {}); await p.getByRole("button", { name: "Añadir gasto" }).click(); } },
  "caja-clara": async (p) => { await p.getByLabel("Fondo inicial (efectivo con el que abres)").fill("50000");
    for (const [t, a, n] of [["cash_sale", "120000", ""], ["card_sale", "40000", ""], ["credit_sale", "30000", "Don Pedro"], ["expense_cash", "15000", "hielo"]]) { await p.getByLabel("Tipo").selectOption(t); await p.getByLabel("Monto").fill(a); if (n) await p.getByLabel("Nota (opcional)").fill(n); await p.getByRole("button", { name: "Añadir movimiento" }).click(); }
    await p.getByLabel("Efectivo contado en la caja").fill("150000"); },
  priceright: async (p) => { await p.getByLabel("Materiales").fill("80000"); await p.getByLabel("Horas de trabajo").fill("2,5"); await p.getByLabel("Tarifa por hora").fill("20000"); await p.getByLabel("Porcentaje (%)").fill("20"); await p.getByLabel("Impuesto (%)").fill("19"); },
  "cuanto-me-sobra": async (p) => { await p.getByLabel("Largo de la habitación (m)").fill("4"); await p.getByLabel("Ancho de la habitación (m)").fill("3"); await p.getByLabel("Largo de la pieza (cm)").fill("50"); await p.getByLabel("Ancho de la pieza (cm)").fill("50"); await p.getByLabel("Piezas por caja").fill("8"); },
  expiryhub: async (p) => { for (const [cat, t, d, prov, cost, rep] of [["soat", "SOAT Mazda 3", 12, "Seguros Bolívar", "90000", "12"], ["licencia", "Licencia de conducción", 150, "Tránsito", "", ""], ["soat", "Impuesto vehicular", -3, "Hacienda", "420000", "12"]]) { await open(p); await p.locator("#cat").selectOption(cat); await open(p); await p.locator("#title").fill(t); await p.locator("#expiry").fill(ymd(d)); await p.locator("#provider").fill(prov); await p.locator("#cost").fill(cost); await p.locator("#repeat").fill(rep); await p.getByRole("button", { name: "Añadir documento", exact: true }).last().click(); } },
  "warranty-keeper": async (p) => { await open(p); await p.locator("#name").fill("Televisor"); await p.locator("#brand").fill("LG"); await p.locator("#model").fill("55UQ8000"); await p.locator("#purchase").fill(ymd(-40)); await p.locator("#months").fill("12"); await p.locator("#serial").fill("SN-998210"); await p.locator("#price").fill("1800000"); await p.locator("#extra").fill("12"); await p.locator("#returnDays").fill("60"); await p.getByRole("button", { name: "Guardar garantía" }).click();
    await open(p); await p.locator("#name").fill("Nevera"); await p.locator("#brand").fill("Samsung"); await p.locator("#purchase").fill(ymd(-400)); await p.locator("#months").fill("12"); await p.locator("#price").fill("2600000"); await p.getByRole("button", { name: "Guardar garantía" }).click(); },
  "huella-al-dia": async (p) => { await p.locator("#pname").fill("Luna"); await p.getByRole("button", { name: "Guardar mascota" }).click();
    await p.getByRole("button", { name: "Desparasitación", exact: true }).click(); await p.locator("#rdate").fill(ymd(-80)); await p.locator("#rtitle").fill("Antiparasitario"); await p.locator("#rrepeat").fill("3"); await p.locator("#ramount").fill("30000"); await p.getByRole("button", { name: "Guardar en el historial" }).click(); },
};

const server = await startServer(join(root, "dist"), 8199);
const browser = await launch();
for (const a of APPS) {
  const dir = join(out, a.id); mkdirSync(dir, { recursive: true });
  copyFileSync(join(root, "apps", a.id, "icon-512.png"), join(dir, "icono-512.png"));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500"><rect width="1024" height="500" fill="${a.color}"/><circle cx="900" cy="80" r="220" fill="#fff" opacity=".07"/><circle cx="1000" cy="460" r="160" fill="#fff" opacity=".07"/><text x="64" y="240" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700" font-size="${a.name.length > 22 ? 56 : 68}" fill="#fff">${esc(a.name)}</text><text x="64" y="320" font-family="DejaVu Sans, Arial, sans-serif" font-size="34" fill="#fff" opacity=".9">${esc(a.tag)}</text><text x="64" y="440" font-family="DejaVu Sans, Arial, sans-serif" font-size="26" fill="#fff" opacity=".75">Gratis · sin registro · tus datos en tu celular</text></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(join(dir, "imagen-destacada-1024x500.png"));
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, locale: "es-CO" });
  const p = await ctx.newPage();
  await p.addInitScript(() => localStorage.setItem("microapps.adconsent.v1", "denied"));
  await p.goto(`http://127.0.0.1:8199/apps/${a.id}/index.html`);
  await p.waitForTimeout(300);
  await p.screenshot({ path: join(dir, "captura-1.png") });
  try { await flows[a.id](p); } catch (e) { console.log("flujo", a.id, e.message.split("\n")[0]); }
  await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: join(dir, "captura-2.png") });
  await p.evaluate(() => window.scrollTo(0, 640)); await p.screenshot({ path: join(dir, "captura-3.png") });
  await p.evaluate(() => window.scrollTo(0, 1500)); await p.screenshot({ path: join(dir, "captura-4.png") });
  await ctx.close();
  writeFileSync(join(dir, "ficha.md"), `# ${a.name}\n\n**Paquete sugerido:** com.chispatools.${a.id.replace(/-/g, "")}\n**URL de la app:** https://chispatools.com/${a.id}/\n**Categoría:** Herramientas\n\n## Título (máx. 30)\n${a.name}  (${a.name.length} caracteres)\n\n## Descripción breve (máx. 80)\n${a.short}  (${a.short.length} caracteres)\n\n## Descripción completa (máx. 4000)\n${a.long}\n\n## Gráficos\n- Icono: icono-512.png\n- Imagen destacada: imagen-destacada-1024x500.png\n- Capturas de teléfono (1080×1920): captura-1.png a captura-4.png\n`);
  if (a.name.length > 30 || a.short.length > 80) console.log("AVISO longitud", a.id, a.name.length, a.short.length);
}
await browser.close(); server.stop();
console.log("kit en", out);
