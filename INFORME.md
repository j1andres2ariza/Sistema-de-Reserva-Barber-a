# Revisión técnica del proyecto

## Resultado

Se conserva el diseño y el panel original, con conexión independiente a un proyecto propio de Supabase. Se eliminaron el etiquetador de componentes, el puente de sesiones del editor, las herramientas de pruebas ligadas al editor, los metadatos remotos y la configuración del backend anterior.

## Fallos corregidos

- El botón de reservas abría un chat para que el visitante enviara manualmente el aviso. Ahora llama al servidor y deja dos avisos automáticos en una cola persistente.
- La inserción pública solicitaba leer después la fila completa, pero la política de lectura solo permitía administradores. El servidor devuelve una referencia mínima después de guardar, sin abrir la lectura de los datos privados al público.
- Solo se impedía repetir la misma hora de inicio. Se valida el intervalo completo del servicio dentro de una transacción, con serialización por barbero y fecha.
- La duración dependía del navegador. Ahora procede del catálogo del servidor.
- No se comprobaban completamente la apertura del barbero, las horas pasadas y los días desactivados en el servidor. Se validan en hora de Colombia.
- Los reintentos de una solicitud incierta podían volver a intentar crear una reserva. Ahora reutilizan una clave y devuelven la misma referencia.
- Los canales de tiempo real compartían nombres entre distintos componentes y podían bloquear la página. Cada suscripción tiene un identificador propio.
- El panel usaba un correo administrativo fijo. Ahora admite el correo del usuario administrador de tu proyecto.
- Los nuevos barberos no recibían horarios al crearlos; ahora se generan sus siete días editables.
- La comisión del barbero no se trasladaba desde la consulta al estado de la interfaz; se conserva ese valor.
- La subida de fotos no comprobaba el error al guardar su URL; ahora lo propaga.

## Persistencia

**Versión 1.1.0:** se incorpora una demostración local completa. El servidor de desarrollo arranca SQLite si faltan las credenciales de Supabase. Las reservas, cambios administrativos y fotos persisten en la carpeta `.data` del equipo. No se guardan esos datos en localStorage. El panel muestra un acceso de demostración y dos avisos simulados por reserva; no intenta enviar mensajes reales. El servidor local escucha únicamente en la interfaz local del equipo y no se habilita en producción.

En producción, Las reservas, los avisos, los horarios, los barberos, las ventas, los productos, los movimientos y los gastos usan PostgreSQL en Supabase. Las fotos subidas usan Storage. El navegador solo conserva la sesión de autenticación; no actúa como base de datos del negocio.

Una reserva y sus dos avisos se crean en una sola transacción. Los avisos tienen estados y reintentos independientes. La disponibilidad pública solo expone barbero, fecha, hora y duración. Las lecturas de datos de clientes y los registros administrativos están protegidos por políticas de acceso.

El servidor limita las reservas por teléfono y por identificador derivado de la IP. CORS restringe el uso desde dominios configurados; no sustituye una protección adicional contra ataques automatizados de gran escala.

## Dependencias

Se actualizó el compilador Vite y el ejecutor de pruebas y se corrigió la dependencia del enrutador. `npm audit --omit=dev` no reportó vulnerabilidades en las dependencias de producción durante esta revisión. La cadena de herramientas de CSS heredada conserva 8 alertas de desarrollo (5 altas y 3 moderadas), sin críticas. No se migró el diseño a otra versión mayor de Tailwind. Esto no equivale a una auditoría de seguridad integral.

## Activación pendiente

No se dispone de credenciales de un proyecto propio, un dominio de hosting o una cuenta Cloud API configurada. No se desplegaron funciones ni se enviaron mensajes reales. Deben completarse `INSTALACION.md` y `WHATSAPP.md` y realizar la prueba de producción allí indicada.

El acceso de demostración no sustituye la autenticación de producción. Las pruebas locales no se importan automáticamente a la base remota.

El ZIP no contiene una exportación de los datos de producción anteriores. Tampoco incluye `dist/` con una conexión de ejemplo: se genera después de configurar la URL y la clave pública propias.

WhatsApp devuelve aceptación de envío, no entrega ni lectura. La versión incluida no consume webhooks de entrega. Los reintentos ante una caída entre la aceptación de Meta y el registro de la respuesta pueden repetir un aviso excepcionalmente.

## Verificaciones ejecutadas

- Compilación de producción correcta con valores de prueba, sin incluir esa compilación en la entrega.
- TypeScript sin errores.
- ESLint sin errores, con 7 avisos heredados de Fast Refresh en componentes de interfaz.
- 5 pruebas unitarias de teléfonos, consentimiento, horarios y fecha de Colombia.
- 29 comprobaciones de PostgreSQL mediante PGlite: migraciones, transacción de reserva y avisos, restricciones, privacidad, reintentos y restauración de datos. También pasan usando el instalador SQL completo.
- 4 pruebas del envío de WhatsApp con respuestas simuladas: plantillas, aceptación, fallo y límite de reintentos. Funciones de servidor comprobadas con Deno.
- 3 pruebas en Chromium del formulario, reintento de la misma solicitud y acceso al administrador. El backend de esas pruebas está simulado; no envía mensajes ni escribe en un proyecto real.

Para repetir las verificaciones:

```bash
npm ci
npm run typecheck
npm test
npm run test:db
npm run test:local
npm run lint
npx playwright install chromium
npm run test:e2e
npm run test:demo
```

La configuración de Playwright arranca su propio servidor con una conexión ficticia, independientemente de las variables de producción. Cierra primero cualquier servidor local que ocupe el puerto 8080.

Con Deno instalado, desde `supabase/functions`:

```bash
deno check create-booking/index.ts whatsapp-worker/index.ts
deno test _shared/whatsapp.test.ts
```

Estas verificaciones locales no sustituyen la prueba final de dominio, base de datos, extensiones, plantillas y entrega de WhatsApp en tus propias cuentas.

## Verificaciones adicionales de la versión 1.1.0

El servidor de demostración tiene cuatro pruebas de integración: persistencia de reservas y avisos al reabrir SQLite; reglas de fecha, horario y cruces; persistencia de ventas, inventario, gastos y nuevos horarios; y protección de las rutas administrativas y del origen de las peticiones. La prueba de navegador sin credenciales recorre la página completa, crea una reserva contra la API local real, entra al administrador, recarga la página y abre las secciones administrativas. Los mensajes de esa prueba son simulados.

La versión local usa node:sqlite, disponible sin bandera adicional desde Node.js 22.13.0. Referencia: https://nodejs.org/api/sqlite.html

La compilación de producción también se inspeccionó para confirmar que no incluye las rutas de la API local ni el acceso al panel de demostración.
