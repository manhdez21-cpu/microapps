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
- Monetización: anuncios (AdSense web / AdMob móvil) + Premium (hipótesis a validar: USD 2.99/mes, 19.99/año).
- Stack a evaluar (no decidido): Next.js/PWA, Expo/React Native, TypeScript, Supabase, GitHub, hosting gratuito.

## Estado (2026-11-04, fin de sesión 1)
- Fases 1–2 hechas en primera pasada; Fase 3 parcial. Núcleo `@microapps/core` implementado y probado (42/42). Ver `PROGRESS.md`.
- Cuentas/credenciales: ninguna. Ningún servicio de pago contratado. Gasto actual: USD 0.
- Bloqueo: npm bloqueado (403) en la sesión en la nube. Equipo de Manuel: Windows `laptop-mlcjbk6g`, sin carpeta conectada.

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
