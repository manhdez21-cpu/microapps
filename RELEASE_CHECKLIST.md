# RELEASE_CHECKLIST

Plantilla por app. Ninguna app ha pasado esta lista todavía.

## Antes de publicar (web/PWA)
- [ ] Pruebas unitarias, integración y E2E pasan
- [ ] Typecheck y lint limpios; dependencias auditadas
- [ ] Cálculos verificados con casos conocidos
- [ ] Accesibilidad básica (contraste, teclado, etiquetas) y móvil probados
- [ ] Rendimiento (Lighthouse) revisado
- [ ] Sin secretos en repo; variables de entorno configuradas
- [ ] Política de privacidad y términos publicados
- [ ] Consentimiento de anuncios y estadísticas funcionando; 2 anuncios máx. por página
- [ ] Eliminación de cuenta/datos funcionando
- [ ] SEO: metadatos, sitemap, datos estructurados, hreflang si aplica
- [ ] Analítica y registro de errores activos
- [ ] **Autorización explícita de Manuel para producción**

## Android (Google Play)
- [ ] Cuenta de desarrollador (autorización de Manuel, costo)
- [ ] Prueba cerrada con ≥ 12 testers durante 14 días consecutivos (cuentas personales nuevas)
- [ ] Ficha ASO, capturas, clasificación de contenido, formulario de seguridad de datos
- [ ] Facturación Google Play/RevenueCat probada con cuentas de prueba

## iOS (App Store)
- [ ] Cuenta Apple Developer (autorización, costo)
- [ ] Experiencia nativa evaluada (no solo un envoltorio web)
- [ ] Compras dentro de la app y restauración probadas

## Monetización
- [ ] IDs de prueba reemplazados por reales solo tras aprobación
- [ ] Ingresos medibles por app en el dashboard
