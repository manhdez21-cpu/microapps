// Configuración pública del despliegue. Vacía = sin anuncios, sin estadísticas y sin botón de Google Play.
// En producción la genera tools/gen-seo.mjs desde variables públicas del repositorio (ver GUIA_MANUEL.md). No contiene secretos.
window.MICROAPPS_CONFIG = window.MICROAPPS_CONFIG || { adsenseClient: "", adSlot: "", adSlotInline: "", ga4Id: "", googleClientId: "", contactWhatsapp: "", contactEmail: "", siteUrl: "", playUrl: "" };
