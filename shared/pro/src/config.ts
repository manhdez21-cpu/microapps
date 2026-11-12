/**
 * ÚNICO archivo de configuración de Pro: precio, precio ancla, textos por app, enlaces de pago y clave pública.
 * Aquí no va ningún secreto: la clave PRIVADA que firma las licencias vive solo en la variable de entorno PRO_PRIVATE_KEY (ver .env.example).
 */
export const PRO_APPS = ["splitflow", "caja-clara", "priceright", "huella-al-dia"] as const;
export type ProApp = (typeof PRO_APPS)[number];
export const isProApp = (x: unknown): x is ProApp => typeof x === "string" && (PRO_APPS as readonly string[]).includes(x);

/** Pago único por app, en USD enteros (D-023). */
export const PRO_PRICE_USD = 15;
/** Precio ancla (se muestra tachado como «precio regular»). 0 = no se muestra. Debe ser un precio real que se vaya a cobrar: ver D-025. */
export const PRO_ANCHOR_USD = 29;

/**
 * Claves públicas (ECDSA P-256, punto sin comprimir en base64url) que validan las licencias. Varias = rotación.
 * Vacío = nadie es Pro (falla cerrado). Se genera con `node tools/pro-license.mjs keygen`.
 */
export const PRO_PUBLIC_KEYS: readonly string[] = [];

export interface ProAppConfig {
  name: string;
  /** Mensaje propio de la app en el modal. */
  pitch: string;
  /** Qué incluye Pro (provisional hasta aprobar el reparto de docs/pro/AUDITORIA.md). */
  benefits: readonly string[];
  /** Enlace de pago de la pasarela (https). Vacío = el botón de compra no aparece. */
  checkoutUrl: string;
}

export const PRO_CONFIG: Record<ProApp, ProAppConfig> = {
  splitflow: {
    name: "SplitFlow",
    pitch: "Cierra las cuentas del viaje sin discusiones y con todo por escrito.",
    benefits: ["Grupos sin límite", "Totales por persona y por categoría", "Resumen listo para WhatsApp y exportación a CSV", "Sin anuncios"],
    checkoutUrl: "",
  },
  "caja-clara": {
    name: "Caja Clara",
    pitch: "Mira cómo va tu negocio en la semana y en el mes, no solo hoy.",
    benefits: ["Reportes por semana y por mes con gráfica de ventas", "Fiados por cliente", "Historial completo en CSV", "Sin anuncios"],
    checkoutUrl: "",
  },
  priceright: {
    name: "PriceRight",
    pitch: "Cotiza como profesional y no vuelvas a cobrar de menos.",
    benefits: ["Cotizaciones guardadas y listas para enviar", "Escenarios de margen lado a lado", "Sin anuncios"],
    checkoutUrl: "",
  },
  "huella-al-dia": {
    name: "Huella al Día",
    pitch: "Todo el historial de tus mascotas, listo para el veterinario.",
    benefits: ["Mascotas sin límite", "Ficha para compartir y exportación a CSV", "Gastos por mes y por tipo", "Sin anuncios"],
    checkoutUrl: "",
  },
};

export const priceLabel = (usd: number): string => `USD ${usd}`;
/** El ancla solo se muestra si es un entero mayor que el precio. */
export const anchorVisible = (price = PRO_PRICE_USD, anchor = PRO_ANCHOR_USD): boolean => Number.isInteger(anchor) && anchor > price;
/** Solo se aceptan enlaces https para el pago. */
export function checkoutHref(app: ProApp, config: Record<ProApp, ProAppConfig> = PRO_CONFIG): string | null {
  try { const u = new URL(config[app].checkoutUrl); return u.protocol === "https:" ? u.href : null; } catch { return null; }
}
