# TEST_PLAN

## Estado actual (2026-11-04)
**76 pruebas unitarias, 76 pasan** (`node --test`) en 5 paquetes: core (42), ui (7), splitflow (12), priceright (7), cuanto-me-sobra (8). `tsc` estricto limpio (core y web).
**E2E (Playwright + Chromium, nube)**: SplitFlow 13 pasos, Control Center 7, calculadoras 12. Cubren flujos principales, persistencia, errores, CSV, desborde horizontal en móvil (390 px), modo oscuro y consola sin errores.
Estado: **Probado**. Nada está "Verificado" en producción (no hay despliegue).

## Limitaciones honestas
- Las pruebas son mías; falta revisión independiente (la auditará Claude Code).
- Las fórmulas de materiales dependen de rendimientos configurables del fabricante; no se verificaron contra productos reales.
- `settle` no garantiza el mínimo absoluto de transferencias (NP-difícil).

## Pendiente
- Pruebas de componentes y E2E (Playwright, disponible en el entorno) cuando haya UI.
- Pruebas de accesibilidad, rendimiento y de integración con Supabase/Stripe/ads (con credenciales de prueba).
- CI.
