# SECURITY

Estado: **políticas definidas; controles técnicos aún no implementados** salvo validación de entradas del núcleo. Compilar no demuestra seguridad.

## Reglas
1. Cero secretos en código, frontend o repo. `.env*` ignorados (excepto `.env.example`). Variables de entorno en el hosting.
2. Nunca pedir contraseñas/claves en el chat; Manuel las configura en el panel del proveedor.
3. Supabase (cuando exista): RLS en todas las tablas con datos de usuario; clave `service_role` solo en servidor.
4. Validación de entradas en cliente y servidor (el núcleo ya rechaza valores no enteros, negativos y NaN).
5. Sin pagos ni cuentas: no hay webhooks. Claves de Google (cuenta de servicio GA4) solo como variable de entorno/archivo local, nunca en el repo.
6. Archivos subidos (facturas, fotos): tipos y tamaño limitados, almacenamiento privado, URLs firmadas.
7. Datos de prueba sintéticos; nunca datos reales de usuarios.
8. Eliminación de cuenta y datos, exportación de datos del usuario.
9. Copias de seguridad y logs sin datos personales.
10. Skills y scripts de terceros (`.claude/skills/`) se revisan antes de ejecutarlos.

## Superficie de riesgo por app
- Caja Clara/SplitFlow: integridad financiera (enteros, bitácora inmutable planeada). No custodian dinero.
- ExpiryHub/Warranty: documentos personales sensibles → cifrado en tránsito/reposo, acceso privado.
- Huella al Día: sin diagnósticos veterinarios.

## Pendiente
Modelo de amenazas, escaneo de dependencias, revisión de privacidad y política de privacidad pública (necesaria para AdSense/tiendas).
