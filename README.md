# Barbería Edwin Zambrano — proyecto completo

Sitio de reservas y administración con React y Vite. Incluye un servidor local con SQLite para probar desde el primer inicio, y el backend de producción con Supabase y WhatsApp Cloud API.

**Empieza por `LEEME-PRIMERO.md`.** En Windows puedes hacer doble clic en `INICIAR-WINDOWS.bat`.

```bash
npm ci
npm run dev
```

No es necesario configurar credenciales para explorar la demostración local. Arranca en http://localhost:8080 y el panel está en http://localhost:8080/admin. Pulsa **Entrar a la demostración** para acceder al administrador.

La demostración guarda las reservas y los cambios en `.data/barberia-demo.sqlite`, en este equipo. Los avisos de WhatsApp se simulan y no salen a Internet. La interfaz muestra el modo activo.

## Funciones incluidas

Reservas por servicio y barbero, control de cruces de horario, calendario en hora de Colombia, horarios por barbero, gestión de fotos y personal, caja, ventas, inventario, gastos, comisiones, panel de avisos, cola de reintentos y permisos del administrador.

## Estructura

- `src/`: sitio, formulario y panel.
- `shared/catalog.json`: catálogo visible de servicios y precios; compartido con la demostración.
- `server/`: API y base SQLite de la demostración local.
- `supabase/migrations/`: esquema y funciones de producción.
- `supabase/functions/`: creación de reservas y procesamiento de WhatsApp.
- `supabase/setup/`: instalación SQL, creación del administrador y Cron.
- `public/`: recursos y configuración para hosting.
- `INSTALACION.md`: conexión y publicación con tu Supabase.
- `WHATSAPP.md`: credenciales, plantillas, mensajes y reintentos.
- `INFORME.md`: cambios, pruebas y límites de la verificación.

## Producción

Completa `.env` con la URL y clave pública de tu Supabase; sigue `INSTALACION.md` y `WHATSAPP.md`. Después ejecuta `npm run build` y sube `dist/`. La compilación exige configuración de base de datos y no habilita el servidor de demostración.

No se incluyen credenciales privadas ni datos del servidor anterior. La sesión publicada usa Supabase Auth y las operaciones del negocio se guardan en PostgreSQL. El modo local usa SQLite en el servidor del computador, no el almacenamiento del navegador.
