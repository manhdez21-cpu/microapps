# PROGRESS

## Estado (2026-11-04, cierre de la fase de construcción)
**Hecho y probado (unitarias + E2E):** las 7 apps web (SplitFlow, Caja Clara, PriceRight, ¿Cuánto me sobra?, ExpiryHub, Warranty Keeper, Huella al Día), Control Center, portada, política de privacidad (plantilla), PWA instalable (manifest, iconos, service worker) en las 7, carga de anuncios con consentimiento (inactiva sin configuración), workflow de despliegue en GitHub Pages, 5 skills propias en `.claude/skills/microapps-*`, `tools/check-all.mjs`.
**Verificación:** `node tools/check-all.mjs` → 101/101 pruebas unitarias en 9 paquetes y 8 suites E2E (SplitFlow, Control Center, calculadoras, Caja Clara, trackers, Huella, sitio/monetización) sin fallos.
**Panel:** ficha por app con cifras reales y pendientes (D-016).
**Instalación:** botón «Instalar en tu celular» en las 7 apps (iOS: pasos manuales; Android: aviso nativo) y `site/instalar.html` con botón a Google Play si se configura `playUrl`.
**No verificado:** funcionamiento sin conexión del service worker (solo registro), Safari/Firefox, dispositivos reales, Lighthouse, accesibilidad automatizada.
**Pendiente de Manuel (ver GUIA_MANUEL.md):** repositorio GitHub y Pages, dominio, AdSense, correo de contacto en privacidad, Stripe/Supabase (Premium), cuentas de tiendas.
**Siguiente tarea (cuando haya URL/dominio):** canonical, sitemap, robots, ads.txt; verificación en producción; Search Console; ampliar contenido si AdSense lo pide.
