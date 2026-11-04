# TEST_PLAN

## Estado actual (2026-11-04)
`node tools/check-all.mjs` ejecuta todo. **101 pruebas unitarias, 101 pasan**, en 9 paquetes (core, ui, splitflow, priceright, cuanto-me-sobra, caja-clara, expiryhub, warranty-keeper, huella-al-dia). Tipos estrictos limpios.
**E2E (Playwright + Chromium):** SplitFlow, Control Center, calculadoras, Caja Clara, ExpiryHub + Warranty Keeper, Huella al Día, sitio/monetización (portada con 7 enlaces, consentimiento, manifest/iconos/service worker de las 7 apps, privacidad). Cubren flujo principal, errores, persistencia, datos corruptos, CSV, sin desborde en 390 px, modo oscuro, JSON-LD y consola limpia.
Estado: **Probado**. Nada está «Verificado» en producción (no hay despliegue).

## Limitaciones honestas
- Las pruebas son mías; falta revisión independiente (la auditará Claude Code).
- Las fórmulas de materiales dependen de rendimientos configurables del fabricante; no se verificaron contra productos reales.
- `settle` no garantiza el mínimo absoluto de transferencias (NP-difícil).

## Pendiente
- Pruebas de componentes y E2E (Playwright, disponible en el entorno) cuando haya UI.
- Pruebas de accesibilidad, rendimiento y de integración con Supabase/Stripe/ads (con credenciales de prueba).
- CI.
