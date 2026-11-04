# Plan de monetización (publicidad únicamente)

## Reglas
- Apps gratis. Sin Premium, planes ni pagos (D-020).
- Anuncios no invasivos: se cargan solo con consentimiento; esperan a que la persona use la app (o 12 s); máximo 2 por página (1 si la app está instalada); uno bajo la herramienta y otro al final del texto; carga diferida cuando están por verse; sin ventanas, pantallas completas ni anuncios pegados al borde; etiqueta «Publicidad» y altura reservada (sin saltos de diseño).
- «Preferencias de anuncios» al pie permite cambiar la decisión.

## Integraciones
| Servicio | Estado | Qué falta |
|---|---|---|
| AdSense (web/PWA) | Implementado y probado con simulación; pendiente de credenciales | Cuenta aprobada, `ADSENSE_CLIENT`, `ADSENSE_SLOT` |
| AdMob | No implementado | App nativa (Capacitor/Kotlin); npm bloqueado; ver D-020 |
| GA4 | Implementado y probado con simulación; pendiente de credenciales | `GA4_ID` |
| API de datos GA4 → panel | Implementado, probado con respuestas simuladas | Cuenta de servicio, `GA4_PROPERTY_ID` |

## Cómo optimizar con datos reales
1. Con tráfico real, comparar en GA4 vistas por app, regreso (`app_open` con `returning`) y uso (`first_use`).
2. En AdSense, revisar RPM por ubicación (`data-slot`: `tool` vs `end`) y quitar la que no rinda o moleste (rebote, menos `first_use`).
3. No subir la cantidad de anuncios sin evidencia de que no baja el regreso.
