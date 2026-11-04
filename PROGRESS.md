# PROGRESS

## Sesión 2026-11-04 (continuación): carpeta conectada
**Hecho**
- Repo sincronizado a `C:\Users\MALAU\OneDrive\Desktop\MicroApps` (42/42 pruebas pasan allí también).
- Toolchain sin npm: `tsc` → JS de navegador; `tools/build.mjs` → `dist/` (D-009).
- `@microapps/ui`: helper DOM, formato/lectura de montos sin floats, almacenamiento local, estilos base.
- **SplitFlow** web (local-first, PWA con service worker): grupos, personas, gastos (iguales/%/exactos), pagos mínimos, CSV.
- **Control Center**: 5 secciones; solo datos reales o "pendiente".
- **PriceRight** y **¿Cuánto me sobra?**: páginas SEO con fórmulas visibles, JSON-LD, FAQ.

**Verificado**
- 76/76 pruebas unitarias (5 paquetes), typecheck web limpio.
- E2E con Playwright: SplitFlow 13 pasos, Control Center 7, calculadoras 12; sin errores de consola; sin desborde horizontal en móvil; modo oscuro revisado con captura.

**No implementado**: Caja Clara (UI), ExpiryHub, Warranty Keeper, Huella al Día, base de datos/auth, anuncios, Premium, dominios/SEO real (sitemap, canonical), CI, accesibilidad automatizada (solo revisión manual), agentes/skills propias.

**Bloqueos**
- npm bloqueado en nube y en el VM del equipo (403).
- Sin cuentas: GitHub remoto, hosting, dominio, Supabase, AdSense, Stripe, tiendas.
- La carpeta está en OneDrive: evitar `node_modules` allí; el sync usa tarball.

**Siguiente tarea**
1. Caja Clara (UI + historial local + exportación) y pruebas E2E.
2. Pruebas de accesibilidad (axe no disponible: revisar a mano roles/contraste) y Lighthouse si hay forma.
3. Skills propias (investigación, SEO, monetización, QA, publicación) con skill-creator.
4. Segunda pasada de investigación: reseñas de competidores y políticas AdSense/AdMob/Stripe.
5. Con cuentas de Manuel: repo remoto, hosting, dominio, AdSense.
