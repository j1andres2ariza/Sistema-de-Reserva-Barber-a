# Abre el proyecto completo

## En Windows

1. Descomprime el ZIP en una carpeta nueva.
2. Instala Node.js **22.13 o superior** si todavía no lo tienes.
3. Haz doble clic en **INICIAR-WINDOWS.bat**. La primera vez instalará las dependencias; después abrirá el sitio automáticamente.
4. Mantén la ventana de la terminal abierta mientras usas el sistema.

También puedes abrir una terminal en la carpeta que contiene `package.json` y ejecutar:

```powershell
npm ci
npm run dev
```

- Sitio: http://localhost:8080
- Panel: http://localhost:8080/admin

**No necesitas crear un archivo .env para probarlo localmente.** Si no hay una conexión propia de Supabase configurada, arranca automáticamente la demostración local.

## Qué puedes probar desde el primer inicio

- Ver la página completa con el diseño, las imágenes, los servicios y los barberos.
- Crear una reserva, comprobar la ocupación del horario y conservar la reserva después de recargar o reiniciar.
- Abrir `/admin` y pulsar **Entrar a la demostración**.
- Gestionar reservas, horarios y barberos; subir fotos; registrar ventas, productos, movimientos y gastos; revisar comisiones.
- Consultar los dos avisos simulados de cada reserva en la pestaña WhatsApp.

La demostración usa una base SQLite en `.data/barberia-demo.sqlite` y guarda las fotos en `.data/uploads`. **Los datos quedan en este equipo. Los mensajes de WhatsApp no se envían.** La interfaz muestra ese estado claramente. Usa datos de prueba.

Para cerrar, presiona Ctrl + C en la terminal. Para conservar una copia de las pruebas, cierra el servidor y copia toda la carpeta `.data` a un lugar seguro. Para restablecer la demostración, cierra el servidor y elimina únicamente esa carpeta. No se incluye ninguna base de pruebas existente en este ZIP.

Si aparece un error indicando que el puerto 8080 está ocupado, cierra la otra ventana donde hayas dejado `npm run dev` antes de iniciarlo otra vez.

## Publicar y recibir WhatsApp reales

La versión de producción usa **tu proyecto propio de Supabase** y **WhatsApp Cloud API**. Incluye el frontend, los esquemas SQL, las funciones del servidor, la cola de mensajes y las guías de configuración.

1. Sigue `INSTALACION.md`: crea las tablas, configura tu administrador y completa `.env` con tu URL y clave pública.
2. Sigue `WHATSAPP.md`: configura el emisor, el token y las dos plantillas, despliega las funciones y activa Cron.
3. Ejecuta `npm run build` y sube el contenido de `dist/` al hosting.

La demostración local se desactiva al configurar Supabase. Tampoco está habilitada en la compilación de producción. Las pruebas locales no se transfieren automáticamente a Supabase.

El ZIP incluye toda la implementación, pero las cuentas, credenciales y aprobaciones de tus proveedores se configuran en tus propias cuentas. El acceso sin contraseña del panel local solo existe para la demostración; el panel publicado usa Supabase Auth y el rol de administrador.
