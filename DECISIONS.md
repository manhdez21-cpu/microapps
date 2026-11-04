# DECISIONS

Formato: fecha · decisión · motivo · alternativas · estado.

## D-001 · 2026-11-04 · Web/PWA primero, móvil nativo después
- Motivo: sin barrera de tienda (Google Play exige 12 testers × 14 días en cuentas personales nuevas), SEO gratuito, costo mínimo.
- Alternativas: Expo desde el día 1; Flutter.
- Estado: adoptada. Móvil con Expo/React Native solo cuando una app valide tracción.

## D-002 · 2026-11-04 · Monorepo pnpm + TypeScript estricto
- Motivo: reutilizar lógica y componentes entre apps y dashboard; un solo CI.
- Alternativas: repos separados; npm workspaces.
- Estado: adoptada. pnpm 10 y Node 22 disponibles.

## D-003 · 2026-11-04 · Núcleo de cálculo como paquete puro (`@microapps/core`)
- Motivo: la precisión financiera es crítica; funciones puras sin UI son testeables y reutilizables en web y móvil.
- Reglas: dinero en **unidades menores enteras** (centavos), nunca floats; redondeo explícito; sin dependencias.
- Estado: implementada y probada (ver TEST_PLAN.md).

## D-004 · 2026-11-04 · Local-first y Supabase opcional
- Motivo: costo cero y privacidad; sincronización (Premium) vía Supabase con RLS cuando haya cuenta.
- Alternativas: Firebase (más acoplado a Google, modelo de costos menos predecible).
- Estado: propuesta; **no se crea cuenta** hasta autorización de Manuel. Next.js como framework web.

## D-005 · 2026-11-04 · SplitFlow: transferencias por algoritmo voraz
- Motivo: minimizar el número de transferencias exacto es NP-difícil; el voraz garantiza ≤ n−1 pagos y es verificable.
- Estado: implementada y probada.

## D-006 · 2026-11-04 · Orden de lanzamiento tentativo
- SplitFlow → Caja Clara → calculadoras SEO (PriceRight / ¿Cuánto me sobra?) → ExpiryHub (+ Warranty Keeper integrado) → Huella al Día.
- Motivo: matriz de MARKET_RESEARCH.md (estimaciones) y facilidad. Revisable con datos reales.

## D-007 · 2026-11-04 · Núcleo sin dependencias; pruebas con `node:test`
- Motivo: `registry.npmjs.org` devuelve 403 de política en la sesión en la nube; no se pudo instalar vitest. Node 22 ejecuta TypeScript directamente y trae `node:test`.
- Efecto: imports con extensión `.ts`; `test/expect.ts` replica la sintaxis de vitest/jest para migrar fácil; typecheck con `tsc` global solo sobre `src`.
- Revisar: al tener npm (equipo de Manuel), migrar a vitest si conviene y tipar las pruebas con `@types/node`.
- Estado: adoptada.

## D-008 · 2026-11-04 · Desarrollo con dependencias, en el equipo de Manuel
- Motivo: sin npm en la nube no se puede construir Next.js/Expo aquí. El equipo Windows de Manuel tiene Node 24 embebido en Claude Desktop y herramientas de desarrollo (VS Code, conda).
- Requiere: que Manuel conecte una carpeta de proyecto a la sesión (Claude Desktop → "+" → "Añadir carpeta").
- Estado: pendiente de acción de Manuel.

## D-009 · 2026-11-04 · Apps estáticas en TypeScript sin dependencias (supera la parte "Next.js" de D-001/D-004 por ahora)
- Motivo: `registry.npmjs.org` está bloqueado (403) tanto en la nube como en la máquina virtual del equipo de Manuel; no hay frameworks. `tsc` global compila a JS de navegador (`rewriteRelativeImportExtensions`), sin bundler.
- Efecto: cada app es HTML + CSS + módulos ES en `apps/<app>/`; `tools/build.mjs` genera `dist/`; alojable gratis en cualquier hosting estático; SEO con HTML real (metadatos, JSON-LD, contenido).
- Costo: sin React/Next ni SSR; UI con un helper `h()` y render manual. Aceptable para microapps pequeñas.
- Revisar: si se consigue acceso a npm, migrar a Next.js/Expo solo si una app lo justifica (la lógica en `core` es portable).
- Estado: adoptada.

## D-010 · 2026-11-04 · Origen de datos del Control Center
- Solo muestra datos reales (pruebas ejecutadas por `tools/gen-status.mjs`, gasto de COST_TRACKER, estado del registro) o "pendiente". Sin ceros ni datos de ejemplo.
- Acceso privado real requiere autenticación del hosting: pendiente; mientras tanto `noindex`.

## D-011 · 2026-11-04 · Copia de trabajo
- Se desarrolla en la nube (Playwright + Chromium disponibles) y se sincroniza a `C:\Users\MALAU\OneDrive\Desktop\MicroApps` con un tarball. Git vive en ambas copias; la nube es la referencia.

## D-012 · 2026-11-04 · Despliegue gratis en GitHub Pages
- Workflow `.github/workflows/pages.yml` (sin secretos) compila con `tsc` y publica `dist/` sin el Control Center. Rutas relativas: funciona en subcarpeta o dominio propio.
- Para AdSense hace falta dominio propio (decisión de Manuel, único gasto casi obligatorio).

## D-013 · 2026-11-04 · Anuncios con consentimiento previo y configuración vacía por defecto
- `packages/ui/src/monetize.ts`: sin `site-config.js` válido no hace nada; con él pregunta antes de cargar Google; rechazo = nada se carga. Ids de AdSense son públicos.
- Limitación: no es un CMP certificado por Google (exigido para UE/Reino Unido/Suiza).
- Premium: solo enlace; sin verificación de pago hasta tener Stripe + Supabase.

## D-014 · 2026-11-04 · Factores de emisión de Huella al Día (REEMPLAZADA por D-017)
- Gasolina/diésel/gas natural de la EIA de EE. UU. (tabla del 2024-09-18), convertidos a L y m³; electricidad sin valor por defecto (depende del país). Todos editables.

## D-015 · 2026-11-04 · iPhone por web, Android primero
- Sin App Store por ahora: iOS se instala desde Safari (instrucciones en `install.ts` e `instalar.html`). Android: PWA y, después, Play vía PWABuilder/TWA con `playUrl` en `site-config.js`.

## D-016 · 2026-11-04 · Control Center con cifras por aplicación
- `tools/gen-status.mjs` calcula por app (medido, no inventado): pruebas unitarias, pasos E2E definidos, líneas de código, peso compilado, SEO on-page (descripción ≤160, JSON-LD, FAQ), PWA. Las métricas de usuarios/ingresos por app quedan como «Sin datos / Pendiente».
- `check-all` vuelve a compilar tras generar `status.json` para que `dist/` tenga datos frescos.

## D-017 · 2026-11-04 · Corrección de alcance: Huella al Día y ExpiryHub
- Releyendo PROMPT_MAESTRO.md se vio que Huella al Día es una app de MASCOTAS (carnet, vacunas, desparasitación, peso, baños, consultas, medicamentos, gastos, recordatorios, ficha para compartir) y ExpiryHub es de DOCUMENTOS Y OBLIGACIONES (SOAT, seguros, licencias, contratos, suscripciones, permisos), no de alimentos. Se habían construido mal (calculadora de carbono y vencimiento de comida); se reconstruyeron. Se eliminó la calculadora de carbono (D-014).
- Huella: límite de 5 mascotas en la versión gratuita (`MAX_PETS`, gancho para Premium, no cobrado aún). Sin dosis de medicamentos: la app solo registra lo que recetó el veterinario. La ficha lleva el aviso «No es un documento veterinario».
- ExpiryHub: perfiles, avisos configurables por categoría, renovación con historial, calendario mensual, exportación `.ics` y CSV, adjuntos en IndexedDB (en el dispositivo, nunca subidos).
- Warranty Keeper: añade marca, modelo, factura adjunta, búsqueda sin tildes y filtros por estado.
- Caja Clara: añade reportes por día, semana (lunes a domingo) y mes, y conciliación por día; una moneda a la vez.
- OCR de facturas/documentos: NO implementado (requiere un servicio externo o una librería no disponible: npm está bloqueado). Queda como «No implementado» en el panel.

## D-018 · 2026-11-04 · Una identidad visual por app y fuentes propias
- Cada app tiene su propia tipografía, paleta y motivo: Huella (carnet con patrón de huellas, Outfit), ExpiryHub (hoja de calendario que cambia de color por estado, IBM Plex Serif/Red Hat Mono), Warranty Keeper (ticket con talón perforado y sello, IBM Plex Mono), Caja Clara (caja registradora con panel LCD, Big Shoulders/DM Mono), SplitFlow (cuenta de restaurante, Young Serif), PriceRight (etiqueta de precio, Bricolage Grotesque), ¿Cuánto me sobra? (plano técnico, Tektur).
- Fuentes alojadas en `packages/ui/src/fonts` (OFL, licencias en `OFL-licenses.txt`): sin pedir nada a Google en cada visita (privacidad y velocidad). Cada app redefine tokens de color claro/oscuro.

## D-019 · 2026-11-04 · Herramientas completas: editar, respaldar, compartir
- Todas las apps permiten editar registros guardados (gastos, cierres, documentos, garantías, mascotas y registros).
- Respaldo/restauración en JSON local (`packages/ui/src/backup.ts`), validado por app y claves permitidas; incluye adjuntos (IndexedDB) en ExpiryHub y Warranty. Reemplaza los datos del dispositivo al restaurar. Sin nube ni cuentas.
- SplitFlow: registrar pagos entre personas, categorías, totales por persona/categoría y resumen para WhatsApp. PriceRight: escenarios de margen y cotizaciones guardadas que no revelan costos. Caja Clara: gráfica de ventas, fiados por cliente. ExpiryHub/Warranty/Huella: costos, repetición, serie, devolución, gasto por mes.
- Sigue NO implementado: OCR, notificaciones push, sincronización entre dispositivos.

## D-020 · 2026-11-04 · Gratis, solo publicidad y crecimiento orgánico
- Decisión del propietario: todas las apps 100 % gratuitas; sin Premium, suscripciones, compras ni funciones de pago. Se retiró `premiumUrl` y el enlace «Quitar anuncios con Premium»; Stripe, Supabase y RevenueCat salen del plan.
- Anuncios: AdSense web/PWA con consentimiento, máximo 2 por página (1 en app instalada), diferidos hasta que la persona use la app, sin formatos invasivos. Un solo aviso cubre anuncios y estadísticas; «Preferencias de anuncios» al pie.
- AdMob: no implementado. Requiere app nativa (Capacitor/Kotlin) y npm está bloqueado; AdSense no se permite en apps nativas/WebView. iOS = PWA con anuncios web; Android = PWA/TWA con AdSense web, a confirmar con AdSense.
- Medición: GA4 solo con consentimiento y sin enviar texto del usuario; eventos `app_open`, `first_use`, `install_click`, `share_click`, `cross_link`. Cifras al panel con `tools/fetch-metrics.mjs` (cuenta de servicio, variables de entorno). Sin credenciales el panel dice «Sin datos».
- SEO de despliegue en `tools/gen-seo.mjs`, configuración desde variables públicas del repositorio (no secretos).
