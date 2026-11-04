# MEMORY — Microapps Factory (memoria propia del proyecto)

Última actualización: 2026-11-04

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
