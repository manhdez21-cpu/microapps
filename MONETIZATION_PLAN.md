# MONETIZATION_PLAN

Estado: **plan; nada integrado ni verificado**. Ninguna app se marca como monetizada hasta verificar integración y aprobación.

## Principios
- Anuncios no invasivos; nunca durante formularios, cierres de caja, cálculos críticos ni pagos.
- Sin prácticas engañosas ni clics accidentales.
- Premium = sin anuncios + valor real (capacidad, historial, exportaciones, sync).
- IDs de prueba de anuncios en desarrollo.
- Consentimiento publicitario antes de cargar scripts (regulación aplicable según país del usuario).

## Plan por canal
| Canal | Uso | Estado | Requiere de Manuel |
|---|---|---|---|
| AdSense | Web/PWA y páginas SEO | Pendiente de aprobación | Cuenta AdSense, dominio propio, política de privacidad publicada |
| AdMob | Android/iOS | No iniciado | Cuenta AdMob y app publicada en tienda |
| Stripe | Pagos web Premium | Pendiente de credenciales | Cuenta Stripe (verificación de identidad a su nombre) |
| RevenueCat / facturación nativa | Móvil | No iniciado | Cuentas de tiendas |

Antes de integrar: leer las políticas vigentes de cada proveedor (cambian) y registrarlas en `DECISIONS.md`.

## Premium (hipótesis)
USD 2.99/mes · USD 19.99/año, con precios regionales a probar. Requisitos técnicos: validación del pago en servidor, restauración de compras, renovaciones/cancelaciones, estado Premium sincronizado, usuario Premium sin anuncios.

## Implementación prevista (cuando haya cuentas)
1. Capa `ads` con interfaz común y proveedor intercambiable; en Premium devuelve nulo.
2. Capa `entitlements` (free | premium) alimentada por webhooks firmados de Stripe/RevenueCat.
3. Registro de ingresos por app para el dashboard (real, nunca mezclado con estimado).
