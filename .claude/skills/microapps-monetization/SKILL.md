---
name: microapps-monetization
description: Trabajar con anuncios y Premium de Microapps (AdSense con consentimiento, site-config.js, hipótesis de precios) sin activar nada sin credenciales.
---
# Monetización
- Anuncios: `packages/ui/src/monetize.ts`. Solo actúa si `site-config.js` tiene `adsenseClient` (ca-pub-…) y `adSlot` válidos; antes de cargar Google pide consentimiento; si lo rechazan, nada se carga.
- Los ids de AdSense son públicos, no secretos. Nunca guardar claves de Stripe/Supabase en el repo: variables de entorno del hosting.
- Premium (hipótesis USD 2,99/mes, 19,99/año): aún sin pasarela. `premiumUrl` solo muestra un enlace.
- No gastar en adquisición; no prometer ingresos; no inventar eCPM. Ingresos reales solo desde AdSense/Stripe cuando existan.
- Políticas: no pedir clics, no colocar anuncios engañosos junto a botones; revisar políticas vigentes antes de pedir aprobación.
