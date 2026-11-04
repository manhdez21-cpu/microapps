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
