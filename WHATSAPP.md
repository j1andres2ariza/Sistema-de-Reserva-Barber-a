# Avisos automáticos para administrador y cliente

Esta guía activa los mensajes reales en producción. Sin credenciales, `npm run dev` abre la demostración local: la cola muestra dos avisos simulados por reserva, sin contactar a Meta.

Se usa WhatsApp Cloud API de Meta desde el servidor. Al guardar una reserva se crean dos trabajos persistentes: uno para `ADMIN_WHATSAPP_TO` y otro para el teléfono indicado por el cliente. No se abren ventanas ni se le pide al cliente que envíe el mensaje manualmente.

## Datos necesarios

- Una aplicación de Meta con WhatsApp Business Platform configurada y un número emisor habilitado.
- Un token de acceso de producción con permiso `whatsapp_business_messaging`; no uses un token temporal para dejar el sitio funcionando.
- El `Phone Number ID` del **emisor**, que es un identificador de Meta y no el número de teléfono.
- Una versión Graph API admitida en tu aplicación, configurada en `WHATSAPP_API_VERSION`. El ejemplo es `v23.0`; comprueba su disponibilidad al activar la cuenta y actualízala antes de su vencimiento.
- Dos plantillas aprobadas, con el idioma y los parámetros que se indican abajo. En modo de prueba solo funcionan los destinatarios permitidos por Meta.

El destinatario del administrador se dejó como ejemplo en **573015070012**, tomado del contacto que ya tenía el sitio. Cámbialo por tu WhatsApp si corresponde. Debe ser un número receptor distinto del emisor de Cloud API. Para Colombia: `57` seguido del celular, sin espacios ni `+`.

El administrador debe autorizar los avisos de nuevas reservas al configurar su número. El cliente debe marcar la autorización en el formulario; el servidor guarda la fecha de esa autorización. Estos mensajes solo se usan para la cita.

## Plantillas

En WhatsApp Manager crea las siguientes plantillas con **parámetros de posición**, solo cuerpo de texto, sin encabezados variables ni botones. Selecciona español (Colombia), código **es_CO**. Si eliges otro idioma aprobado, cambia también `WHATSAPP_TEMPLATE_LANGUAGE`.

Nombre sugerido para el cliente: `reserva_confirmada`

```text
Hola {{1}}, tu reserva en Barbería Edwin Zambrano está confirmada. Servicio: {{2}}. Barbero: {{3}}. Fecha: {{4}}. Hora: {{5}} (Colombia). Valor: {{6}}. Referencia: {{7}}. WhatsApp registrado: {{8}}. Te esperamos. Para cambios, comunícate con la barbería.
```

Nombre sugerido para el administrador: `nueva_reserva_admin`

```text
Se registró una nueva reserva en Barbería Edwin Zambrano. Cliente: {{1}}. Servicio: {{2}}. Barbero: {{3}}. Fecha: {{4}}. Hora: {{5}} (Colombia). Valor: {{6}}. Referencia: {{7}}. WhatsApp del cliente: {{8}}. Consulta tu agenda para ver la cita.
```

En ambas plantillas se envían exactamente estos ocho parámetros:

| Posición | Contenido | Ejemplo |
|---|---|---|
| 1 | Nombre del cliente | Cliente Prueba |
| 2 | Servicio | Recorte de cabello |
| 3 | Barbero | Edwin Zambrano |
| 4 | Fecha | 23/10/2026 |
| 5 | Hora de Colombia | 10:00 |
| 6 | Valor en COP | $23.000 |
| 7 | Referencia de reserva | UUID completo |
| 8 | Teléfono del cliente | 573015550000 |

Completa ejemplos para los ocho parámetros al solicitar aprobación. Configura en los secretos los nombres exactos de las plantillas finalmente aprobadas. Meta revisa el contenido y la categoría; la configuración del código no sustituye esa aprobación.

## Reintentos y estados

- `pending`: aviso pendiente o esperando reintento.
- `processing`: un worker lo está procesando; tiene una reserva temporal para que dos workers no lo tomen al mismo tiempo.
- `accepted`: la API devolvió un identificador de mensaje; **no significa entregado ni leído**.
- `failed`: se agotaron cinco intentos. El administrador puede reintentarlo tras corregir la causa.

Cada destinatario tiene su propio estado: un error del cliente no vuelve a enviar automáticamente el aviso ya aceptado del administrador. Los reintentos se espacian en 1, 2, 4 y 8 minutos. La cola se revisa cada minuto. Si faltan credenciales, los avisos permanecen pendientes hasta completar la configuración.

La reserva no se elimina ni se marca fallida si WhatsApp falla. La solicitud de reserva tiene una clave para que un reintento con los mismos datos no cree otra cita.

En una caída excepcional después de que Meta acepte el mensaje y antes de guardar esa respuesta en la base de datos, el worker puede repetir el aviso. El envío es de al menos una vez; no se promete una entrega exactamente una vez. No se implementan confirmaciones de entrega mediante webhooks en esta versión.

## Cambios de servicios

Los servicios y precios visibles están en `shared/catalog.json` (se exportan desde `src/data/barbershop.ts`); el servidor valida con la tabla `public.services`. Si cambias un servicio, su duración o precio, actualiza ambas fuentes y vuelve a compilar. El cliente nunca determina la duración guardada ni el precio enviado por WhatsApp.

Documentación de referencia:

- https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
- https://supabase.com/docs/guides/functions/secrets
- https://supabase.com/docs/guides/functions/schedule-functions
