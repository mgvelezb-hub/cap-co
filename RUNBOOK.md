# CAP & Co. — Guía de operación (sin programar)

Para quien opera el sitio y el chat. Todo se hace desde el navegador.

## Dónde mirar
| Qué | Dónde |
|---|---|
| Leads, embudo y alertas del día | https://casa-ap.com/admin/leads (usuario y contraseña del panel) |
| Diagnóstico completo | https://casa-ap.com/api/admin/salud (mismo usuario y contraseña) |
| ¿Está vivo el chat? (público) | https://casa-ap.com/api/salud → `ok`, `degradado` o `caido` |
| Saldo y límite de gasto de la IA | console.anthropic.com → Settings → Billing / Limits |

## Si llega una alerta por correo
| Alerta | Qué hacer |
|---|---|
| **Sin saldo de Anthropic** | Recargar en console.anthropic.com → Billing. El chat vuelve solo en segundos. Revisar que la recarga automática esté activa. |
| **La llave de Anthropic no funciona** | Avisar a Mau: hay que cambiar `ANTHROPIC_API_KEY` en Vercel. |
| **Tope diario de uso** | Es el freno de gasto propio (3,000 mensajes y 300 fotos por día). Si hay una campaña funcionando, pedir a Mau que suba `CHAT_TOPE_DIARIO`. Si parece abuso, no hacer nada: se reinicia a medianoche. |
| **El chat está fallando** | Probar el chat en casa-ap.com. Si no responde, avisar a Mau con la hora. |
| **Precio de metales** | No es urgente: el chat deja de dar cifras y explica la fórmula. Avisar a Mau en horario laboral. |

## Todos los días
1. Abrir el panel. Si hay recuadro rojo de alertas, seguir la tabla de arriba.
2. **Por contactar** (arriba a la izquierda): leads nuevos sin atender. Si se pone rojo, hay alguien esperando más de 24 horas.
3. **Agenda**: la agenda trabaja en uno de dos modos (variable `AGENDA_MODO` en Vercel):
   - **`llamada`** (por defecto, mientras no haya local ni línea de WhatsApp activa): la persona deja día y franja (9–13 o 13–17) y en el panel aparece "Llamar: …". Llamarle en esa franja, acordar la cita y usar **Acordar cita** para ponerle día y hora; luego **Confirmada** con el **lugar**. Las llamadas que nadie atendió se marcan **Expirada** solas a los 7 días.
   - **`citas`**: la persona aparta día y hora. Confirmarla por WhatsApp y en el panel ponerla en **Confirmada** con el **lugar**. Una cita que nadie confirma en 24 horas se libera sola (el panel avisa cuándo).
   Después de la cita: **Atendida** o **No asistió** (este regresa el lead a "por contactar"). Para mover una cita, **Reprogramar**.
   `CITA_CAPACIDAD` = citas al mismo tiempo (una por asesor; 1 por defecto). `CITA_TOPE_HORA` = reservas por hora de todo el sitio antes de frenar y alertar (20 por defecto).
4. **Leads**: mover la etapa conforme avanza el caso:
   Cita solicitada → Cita confirmada → Atendido → **Cambio concretado** (anotar casa de destino) → **Comisión cobrada** (anotar el monto). Si no avanza: **Descartado** con el motivo.
   Todo se guarda solo al escribir. En notas no poner datos de la deuda ni de otras personas.
5. Cada vez que se pague publicidad: **Registrar gasto** en "Por campaña" con el mismo nombre de campaña que lleva el link (utm_campaign).
6. Una vez por semana (solo el dueño): "Descargar leads (CSV)" para el reporte.

## Usuarios del panel
Cada persona tiene su usuario (el panel guarda en la bitácora quién cambió qué). Para dar de alta a alguien, Mau corre `node scripts/crear-usuario.mjs <usuario> <dueno|operador>` y agrega la línea en `ADMIN_USUARIOS` en Vercel. El rol **operador** no puede descargar el CSV. La contraseña se guarda con PBKDF2 (desde el 26-sep; las entradas hechas antes con SHA-256 ya no sirven: hay que volver a generarlas).

Freno de intentos: el panel responde 429 tras 10 contraseñas malas en 15 minutos desde una IP, pero ese contador vive en cada instancia. El freno fuerte es una regla en Vercel → cap-co → Firewall → Rate Limiting: ruta que empieza con `/admin` o `/api/admin`, 30 peticiones por minuto por IP, acción "Deny".

## Links de campaña
Cada publicación o anuncio debe llevar su etiqueta para que el panel sepa de dónde vino la gente, por ejemplo:
`https://casa-ap.com/?utm_source=facebook&utm_campaign=afectados-monte-de-piedad`
`https://casa-ap.com/?utm_source=tiktok&utm_campaign=video-refrendo`

TikTok solo deja un link en la biografía: cada video dice en pantalla su link corto, `casa-ap.com/v/<codigo>` (por ejemplo `casa-ap.com/v/refrendo`), que entra como campaña `refrendo` de TikTok. En el panel, la columna **Margen** de "Por campaña" es la comisión cobrada menos publicidad e IA.

## Días inhábiles
La agenda salta los días de descanso oficiales que están en `DIAS_INHABILES` (`lib/agenda/horarios.js`). La lista llega al 1 de enero de 2028: **cada diciembre** hay que agregar los del año siguiente (y cualquier cierre propio).

## Horario
El chat funciona las 24 horas. Los mensajes a personas prometen respuesta de **lunes a viernes de 9:00 a 17:00**.
