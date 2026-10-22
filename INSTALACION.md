# Instalación en tu hosting

**Para abrir y probar el proyecto sin configurar cuentas, consulta primero `LEEME-PRIMERO.md`.** Los siguientes pasos activan la versión de producción con tus propias cuentas.

El proyecto conserva el diseño y el panel administrativo original. La web puede alojarse en un hosting estático o compartido; la base de datos y las funciones de WhatsApp se ejecutan en TU cuenta de Supabase. No requiere PHP ni la base de datos MySQL de cPanel.

## 1. Crear tu base de datos

1. Crea un proyecto propio en https://supabase.com/dashboard y guarda su referencia.
2. En SQL Editor ejecuta **una sola vez** `supabase/setup/01-schema.sql`. Crea las tablas, los permisos, las funciones y los barberos iniciales. Esta opción es para una base nueva.
3. No ejecutes además las migraciones individuales sobre esa misma base. Como alternativa al SQL completo, puedes usar Supabase CLI: `supabase link --project-ref TU_REFERENCIA` y `supabase db push`.
4. En Settings > API / API Keys copia la URL y la clave pública publishable (o anon).

Si conservas una base existente con todas las migraciones anteriores, aplica únicamente `supabase/migrations/20261022000000_independent_booking_notifications.sql`. Hazlo sobre una cuenta y proyecto a los que tengas acceso propio.

**Datos anteriores:** este ZIP contiene el código y el esquema, no una copia de las reservas, ventas, inventario ni usuarios del servidor anterior. Para conservarlos en una base nueva, exporta e importa esos datos y las fotos subidas desde el proyecto anterior antes del cambio de conexión. La base nueva solo recibe los barberos, horarios y servicios iniciales. No borres el backend anterior hasta verificar la transferencia de los datos que necesites.

## 2. Configurar el frontend

Instala Node.js 22.13 o superior. Dentro de la carpeta del proyecto:

```bash
npm ci
```

Copia `.env.example` como `.env` y completa:

```env
VITE_SUPABASE_URL=https://TU_REFERENCIA.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=CLAVE_PUBLICA_DE_TU_PROYECTO
```

El archivo se llama **.env**, con punto inicial. En Windows activa la visualización de extensiones para evitar `.env.txt`. En PowerShell puedes copiarlo con `Copy-Item .env.example .env`.

No pongas tokens de WhatsApp, contraseñas ni la clave `service_role` en variables `VITE_`: estas variables se incorporan al código público.

## 3. Crear tu administrador

1. En Supabase > Authentication > Users > Add user crea tu correo y una contraseña propia; activa la confirmación automática del correo.
2. Abre `supabase/setup/03-admin.sql`, reemplaza el correo de ejemplo por ese mismo correo y ejecútalo en SQL Editor.
3. En Authentication > URL Configuration configura Site URL con tu dominio HTTPS y añade el dominio a Redirect URLs.
4. Podrás entrar desde `https://tudominio.com/admin` con ese correo y contraseña. Si la pierdes, puedes restablecerla en el panel de Supabase. No hay una contraseña universal incluida.

## 4. Activar WhatsApp y el servidor

Lee `WHATSAPP.md` para crear el emisor y las dos plantillas. Instala Supabase CLI siguiendo https://supabase.com/docs/guides/cli/getting-started y ejecuta:

```bash
supabase login
supabase link --project-ref TU_REFERENCIA
```

Copia `supabase/.env.example` a `supabase/.env` y completa todos los valores. `ALLOWED_ORIGINS` lleva dominios exactos, separados por comas y sin barra final: incluye tanto `https://tudominio.com` como `https://www.tudominio.com` si usas ambos. Para probar localmente incluye `http://localhost:8080`.

Genera **dos secretos diferentes** ejecutando dos veces:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Uno es `RATE_LIMIT_SALT` y otro `WHATSAPP_WORKER_SECRET`. Después:

```bash
supabase secrets set --env-file supabase/.env
supabase functions deploy create-booking
supabase functions deploy whatsapp-worker
```

Las variables `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` las suministra Supabase a las funciones desplegadas. No se copian al frontend. `supabase/config.toml` permite la reserva sin login y protege el worker mediante su secreto privado.

En SQL Editor abre `supabase/setup/02-notification-cron.sql`, sustituye la URL y el secreto por los tuyos, y ejecútalo una vez. Activa las extensiones pg_cron, pg_net y Vault si el panel lo solicita. Este paso procesa avisos pendientes cada minuto aunque el cliente cierre la página; no depende de tu computador. El envío inmediato se intenta también después de guardar cada reserva.

Si cambias el secreto después, actualiza también el secreto correspondiente en Vault. Para modificar los trabajos, usa Integrations > Cron. No vuelvas a crear los mismos secretos y trabajos con nombres duplicados.

## 5. Compilar y subir

```bash
npm run dev
npm run build
```

`npm run build` comprueba la configuración y crea `dist/`. La comprobación detecta valores faltantes y claves privadas, pero no verifica por sí sola que el proyecto remoto esté activo.

- **cPanel / Hostinger / Apache:** sube TODO el contenido interior de `dist/` a `public_html`, incluida `.htaccess`. El `index.html` debe quedar directamente en esa carpeta. Activa HTTPS.
- **Netlify:** comando `npm run build`, directorio `dist`; configura las dos variables públicas en su panel. Se incluye `public/_redirects`.
- **Vercel:** comando `npm run build`, salida `dist`; configura las dos variables públicas. Se incluye `vercel.json`.
- **Nginx:** usa `try_files $uri $uri/ /index.html;` para que `/admin` funcione al recargar.

No subas el ZIP completo, `.env`, `supabase/.env`, el código del servidor ni `node_modules` a `public_html`. Para hosting compartido no necesitas Node.js ejecutándose en el servidor: compilas localmente y subes `dist/`.

Si cambias la URL o la clave pública, vuelve a compilar y subir `dist/`. El código generado incorpora esos valores durante la compilación.

## 6. Comprobar antes de abrir al público

1. Abre el sitio por su dominio final y crea una reserva con un número de WhatsApp que controles y que haya autorizado el aviso.
2. Anota la referencia. Comprueba la fila en Table Editor > bookings y las dos filas correspondientes en whatsapp_notifications.
3. Verifica que la cita aparece en `/admin`, que el horario queda ocupado y que no se puede reservar un servicio que se cruce con ella.
4. Recarga la página y entra desde otro navegador o dispositivo: la reserva debe continuar en la base de datos.
5. Verifica que llegan ambos mensajes. En `/admin` > WhatsApp podrás revisar el procesamiento. “Aceptado por WhatsApp” solo confirma aceptación de la solicitud por la API.
6. Si un aviso queda pendiente, revisa los secretos, las plantillas y que Cron esté habilitado. Si falla cinco veces, corrige la causa y usa Reintentar en el panel.

Las reservas siguen guardadas si falla el proveedor de mensajes. La activación real depende de completar estos pasos en tus cuentas; no hay credenciales privadas en el ZIP y no se ha conectado a un servidor de producción desde esta entrega.
