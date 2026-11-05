# PROGRESS

## Estado (2026-11-04, cierre de la fase de construcción)
**Hecho y probado (unitarias + E2E):** las 7 apps web (SplitFlow, Caja Clara, PriceRight, ¿Cuánto me sobra?, ExpiryHub, Warranty Keeper, Huella al Día), Control Center, portada, política de privacidad (plantilla), PWA instalable (manifest, iconos, service worker) en las 7, carga de anuncios con consentimiento (inactiva sin configuración), workflow de despliegue en GitHub Pages, 5 skills propias en `.claude/skills/microapps-*`, `tools/check-all.mjs`.
**Verificación:** `node tools/check-all.mjs` → 138/138 pruebas unitarias en 9 paquetes y 8 suites E2E (SplitFlow, Control Center, calculadoras, Caja Clara, trackers, Huella, sitio/monetización) sin fallos.
**Panel:** ficha por app con cifras reales y pendientes (D-016).
**Instalación:** botón «Instalar en tu celular» en las 7 apps (iOS: pasos manuales; Android: aviso nativo) y `site/instalar.html` con botón a Google Play si se configura `playUrl`.
**No verificado:** funcionamiento sin conexión del service worker (solo registro), Safari/Firefox, dispositivos reales, Lighthouse, accesibilidad automatizada.
**Pendiente de Manuel (ver GUIA_MANUEL.md):** repositorio GitHub y Pages, dominio, AdSense, correo de contacto en privacidad, Stripe/Supabase (Premium), cuentas de tiendas.
**Siguiente tarea (cuando haya URL/dominio):** canonical, sitemap, robots, ads.txt; verificación en producción; Search Console; ampliar contenido si AdSense lo pide.

## 2026-11-04 · Corrección de alcance e identidad visual
- Huella al Día reconstruida como carnet de mascotas y ExpiryHub como cartera de documentos y obligaciones (D-017). Warranty Keeper con marca, modelo, factura, búsqueda y filtros. Caja Clara con reportes día/semana/mes y conciliación.
- Cada una de las 7 apps tiene identidad visual propia y fuentes alojadas en el repo (D-018).
- `node tools/check-all.mjs`: 138/138 pruebas unitarias y 8 suites E2E en verde.
- No implementado: OCR de facturas/documentos. Pendiente de Manuel: ver `GUIA_MANUEL.md`.

## 2026-11-04 · «Full tools»
- Implementadas las herramientas faltantes (D-019): edición en las 7 apps, respaldo/restauración, pagos en SplitFlow, cotizaciones en PriceRight, costos y repetición en ExpiryHub/Warranty/Huella, reportes y fiados en Caja Clara.
- Verificación: 138/138 pruebas unitarias + 9 suites E2E (nueva `extras.e2e.mjs`) en verde con `node tools/check-all.mjs`.
- Errores reales hallados por las pruebas y corregidos: el nombre del cliente de un fiado se perdía en Caja Clara; SplitFlow no ofrecía restaurar con la app vacía.
- Pendiente de Manuel: ver `GUIA_MANUEL.md`.

## 2026-11-04 · Gratis, solo publicidad y crecimiento orgánico (D-020)
- Auditoría: AdSense existía pero inactivo (1 anuncio al final, enlace Premium); sin SEO de despliegue, sin analítica, panel sin cifras; AdMob no viable (app nativa, npm bloqueado).
- Hecho y probado: Premium eliminado; anuncios diferidos, 2 ubicaciones máx., 1 en app instalada; consentimiento único para anuncios y GA4 con «Preferencias de anuncios»; GA4 con eventos sin datos del usuario; `tools/gen-seo.mjs` (sitemap, robots, ads.txt, canonical, OG, site-config desde variables); 4 guías; enlaces entre apps y compartir; `tools/fetch-metrics.mjs` y panel con cifras reales cuando hay credenciales.
- Verificado con simulación (sin Google real): carga de AdSense/GA4, API de datos GA4. NO verificado: aprobación de AdSense, indexación, tráfico, ingresos (no existen).
- `node tools/check-all.mjs` en verde (unitarias, 10 pruebas de herramientas, 9 suites E2E).
- Pendiente de Manuel: ver `GUIA_MANUEL.md` §1–6 (GitHub/Pages, variables públicas, GA4, Search Console, AdSense, correo de contacto).

## 2026-11-04 (tarde) · Publicación
- Repositorio https://github.com/manhdez21-cpu/microapps; sitio en https://manhdez21-cpu.github.io/microapps/ (Pages con GitHub Actions; deploy en verde).
- GA4 configurado (G-PE91ZVWREB, en el workflow). Search Console verificado (etiqueta en la portada) y sitemap enviado.
- Pendiente de Manuel: correo de contacto en privacidad, dominio propio, AdSense (luego ADSENSE_CLIENT/ADSENSE_SLOT), confirmar datos en Tiempo real de GA4.
