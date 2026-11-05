# Publicar cada app en Google Play (paso a paso)

Antes: dominio `chispatools.com` activo (hecho) y cuenta de Play Console (USD 25, pago único; pide identidad y verificar un teléfono Android).
Kit por app en `docs/play/<app>/`: `ficha.md` (textos), `icono-512.png`, `imagen-destacada-1024x500.png`, `captura-1…4.png` (1080×1920).

## 1. Paquete con PWABuilder (por cada app)
1. pwabuilder.com → pega `https://chispatools.com/<app>/` → **Package for stores → Android**.
2. Package ID sugerido: `com.chispatools.<app sin guiones>` (está en `ficha.md`). Nombre y versión 1.
3. Signing key: **Create new**. Descarga el zip: trae `.aab` (para Play), `.apk` (descarga directa), la llave `.keystore` y su contraseña.
4. **Guarda la llave y la contraseña en un lugar seguro. Sin ellas no se puede actualizar la app.** No las subas a GitHub ni las pases por el chat.
5. Pásame la **huella SHA-256** de la llave (no es secreta): la pongo en `https://chispatools.com/.well-known/assetlinks.json` para que Play verifique el dominio. Un solo archivo sirve para las 7 apps.

## 2. Ficha en Play Console
1. **Crear aplicación**: idioma español, app (no juego), gratis.
2. Ficha de Play Store: copia título, descripción breve y completa de `ficha.md`; sube icono, imagen destacada y capturas. Categoría: **Herramientas**.
3. Política de privacidad: `https://chispatools.com/privacidad.html`.
4. **Clasificación de contenido**: cuestionario sin violencia, sexo, apuestas ni drogas; la app no es un juego. Resultado esperado: apta para todos.
5. **Seguridad de los datos** (responde con lo real y revisa el formulario vigente):
   - No hay cuentas ni registro.
   - Los datos que escribe la persona se quedan en su dispositivo y no se envían a servidores del titular.
   - Con consentimiento, se recoge uso anónimo (Google Analytics: apertura de la app, uso de la herramienta, instalaciones y clics en compartir) y, cuando se activen, anuncios de Google AdSense (pueden usar identificadores).
   - Datos cifrados en tránsito: sí (HTTPS). No se venden datos.
6. **Anuncios**: marca «contiene anuncios» solo cuando AdSense esté activo en la app. Antes confirma con AdSense que se permite en una app empaquetada.
7. Público objetivo: adultos (18+); no está dirigida a niños.

## 3. Pruebas y publicación
1. **Pruebas → Prueba cerrada**: crea la pista, sube el `.aab`, añade una lista con 12 o más correos de Gmail.
2. Cada tester acepta la invitación (enlace) e instala la app, y debe mantenerla **14 días seguidos**.
3. Pasado ese tiempo: **Producción → Solicitar acceso**, responde el cuestionario y publica. Google revisa (días).
4. Las otras 6 apps se pueden subir en paralelo mientras corre el plazo de la primera.

## Riesgos
- Play rechaza apps que son «solo una web». Estas son herramientas completas, con datos propios, pero no hay garantía.
- Si rechazan una app, Google explica el motivo y se corrige y reenvía.
- AdSense no se permite en apps nativas; AdMob exige un contenedor nativo (no implementado).
