# MEMORY — Microapps Factory (memoria propia del proyecto)

Última actualización: 2026-11-12

## Propietario y preferencias
- Propietario: Manuel (Cali, Colombia; zona horaria America/Bogota). Idioma: español, trato de "tú".
- Respuestas breves y precisas. Prioridad: mínimo costo, resultados verificables, ahorro de tokens.
- Usa Claude Pro. No asumir que cubre APIs, hosting, dominios ni cuentas de tiendas.
- El trabajo será auditado después por Claude Code.

## Proyecto
- Nombre: MICROAPPS FACTORY (provisional). Prompt completo: `PROMPT_MAESTRO.md`.
- Portafolio inicial (7): Warranty Keeper, Caja Clara, Huella al Día, ¿Cuánto me sobra?, SplitFlow, PriceRight, ExpiryHub.
- Dashboard central: Microapps Control Center.
- Monetización DEFINITIVA (2026-11-04): apps 100 % gratis, solo publicidad (AdSense web/PWA; AdMob no implementado). Sin Premium. Crecimiento orgánico: SEO, guías, enlaces entre apps, compartir. Ver D-020.
- Stack a evaluar (no decidido): Next.js/PWA, Expo/React Native, TypeScript, Supabase, GitHub, hosting gratuito.

## Estado (2026-11-04, fin de construcción)
- Las 7 apps + Control Center + portada hechas y probadas (101 unitarias, 8 suites E2E). PWA, anuncios con consentimiento (inactivos), workflow de GitHub Pages.
- Lo que falta depende de Manuel: GitHub/Pages, dominio, AdSense, Stripe/Supabase, tiendas → `GUIA_MANUEL.md`.
- Siguiente (con URL/dominio): canonical, sitemap, robots, ads.txt, verificación en producción.
- Gasto actual: USD 0.

## Decisiones
- 2026-11-04: Skills externas del repo oficial anthropics/skills en `.claude/skills/` (ver `SKILLS.md`).
- Web/PWA primero; local-first; dinero en enteros; núcleo sin dependencias (ver `DECISIONS.md` D-001…D-008).
- Orden de lanzamiento tentativo: SplitFlow → Caja Clara → calculadoras SEO → ExpiryHub(+Warranty) → Huella al Día.

## Pendientes
- Manuel: conectar carpeta de proyecto en Claude Desktop (para npm/Next.js).
- Construir UI de SplitFlow, Control Center mínimo, segunda pasada de investigación, skills propias.
- Cuentas necesarias más adelante (agrupadas): GitHub, hosting, dominio, Supabase, AdSense, Stripe, tiendas.

## Notas de entorno
- Esta sesión: espacio Linux en la nube (/home/claude/Microapps). Sin acceso aún a archivos del equipo de Manuel.
- Red de la nube: GitHub accesible; registry.npmjs.org bloqueado por política (403). No reintentar ni rodear.
- Node 22.23, pnpm 10, tsc 7 global, Git 2.43.

- 2026-11-05: Manuel decidió modelo mixto: 2 apps con más tráfico a pago único USD 15 por pasarela; resto gratis con anuncios. Se decide tras ~4 semanas con datos del panel (https://panel.chispatools.com, actualización diaria). Idea de barbería/manicura aplazada (lógica y 9 pruebas guardadas aparte, fuera del repo). Foco ahora: tráfico con las 7 apps (estados WhatsApp, indexación, guías diarias).

## Pro (desde 2026-11-12) — EN STANDBY
- **2026-11-12: Manuel pone Pro en standby (D-028).** El código de `shared/pro/` se queda tal cual, sin enganchar en ninguna app; se retoma más adelante. Foco: apps gratis, tráfico y esperar los 14 días de testers de Google Play para publicar.
- Premium SOLO en 4 apps: SplitFlow, Caja Clara, PriceRight, Huella al Día. Pago único USD 15 por app (D-023). Las otras 3 siguen gratis con anuncios.
- Núcleo en `shared/pro/` (config única: `shared/pro/src/config.ts`). Auditoría y reparto propuesto: `docs/pro/AUDITORIA.md`. Las funciones Pro AÚN NO están enganchadas en las apps.
- Entorno: Playwright en `/opt/node-tools/node_modules/playwright` → `PLAYWRIGHT_PATH=/opt/node-tools/node_modules/playwright node tools/check-all.mjs`.
- Reglas de Manuel: no romper lo gratis; sin dependencias; validadores propios; tras cada tarea check-all verde, commit y `git push origin HEAD:main`.

### D-024 · 2026-11-12 · Licencia Pro firmada, sin servidor
Formato `CT1.<datos>.<firma>` (base64url), ECDSA P-256 + SHA-256 con WebCrypto (sin dependencias). El cliente solo tiene la clave pública (`PRO_PUBLIC_KEYS`, admite rotación); la privada vive solo en la variable `PRO_PRIVATE_KEY` (`.env.example`) y firma con `tools/pro-license.mjs`. Una licencia por app, guardada en `localStorage["chispatools.pro.v1"]`, verificada en cada arranque (`initPro`). Falla cerrado: sin clave pública o sin WebCrypto nadie es Pro. Límites aceptados: no atada a dispositivo, no revocable, saltable por alguien técnico.

### D-025 · 2026-11-12 · Precio ancla
`PRO_ANCHOR_USD = 29` tachado junto a USD 15. PROVISIONAL: debe ser un precio real (el «precio regular» que se cobrará tras el lanzamiento); si Manuel no lo confirma, poner 0 y no se muestra. Los textos de beneficios por app también son provisionales hasta aprobar el reparto.

### D-026 · 2026-11-12 · Compra oculta en Google Play (TWA)
`purchaseHidden()` oculta precio y enlace de pago (deja solo «activar licencia») si: `proHidePurchase` en MICROAPPS_CONFIG (variable pública `PRO_HIDE_PURCHASE=1`), referrer `android-app://`, o URL de inicio con `?tienda=play` (recordado en sessionStorage). Al generar cada .aab hay que poner la URL de inicio con `?tienda=play`. No verificado en un TWA real.

### D-027 · 2026-11-12 · Ubicación y pruebas del módulo
`shared/pro/` (pedido por Manuel) fuera de `packages/`: se añadió a `tsconfig.web.json`, `tools/build.mjs` y `tools/gen-status.mjs`. La E2E (`tests/e2e/pro.e2e.mjs`) carga el módulo dentro de las apps compiladas e inyecta una clave de prueba interceptando `config.js`; no hay ganchos de prueba en producción.

### Pendiente Pro
- Manuel: aprobar reparto gratis/Pro, confirmar precio ancla, elegir pasarela (enlace de pago https por app).
- Técnico: generar el par de claves real y decidir quién emite la licencia tras el pago (manual o función en servidor); enganchar funciones (Tarea 2); términos/privacidad de la compra.

### D-028 · 2026-11-12 · Pro en standby
Decisión de Manuel: no se hace la versión Premium por ahora. Se conserva `shared/pro/` y sus pruebas (siguen en check-all) sin conectarlo a ninguna app; nada visible cambia para el usuario. Se sigue el plan inicial: 7 apps gratis con anuncios, tráfico orgánico (guías, WhatsApp, indexación) y publicación en Google Play cuando los testers cumplan los 14 días.
