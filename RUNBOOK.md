# CAP & Co. — Guía de operación (sin programar)

Para quien opera el sitio y el chat. Todo se hace desde el navegador.

## Dónde mirar
| Qué | Dónde |
|---|---|
| Leads, tareas, citas, embudo y alertas del día | CRM: https://capco-crm.vercel.app (admin.casa-ap.com cuando esté el DNS). Ver `crm/README.md` |
| Diagnóstico completo y bitácora | CRM → Ajustes (solo dueño) |
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
1. Abrir el CRM en **Hoy**. Si hay recuadro rojo de alertas, seguir la tabla de arriba (el detalle y qué hacer están en Ajustes).
2. **Por contactar** (arriba a la izquierda): leads nuevos sin atender. Si se pone rojo, hay alguien esperando más de 24 horas.
3. **Agenda**: la agenda trabaja en uno de dos modos (variable `AGENDA_MODO` en Vercel):
   - **`llamada`** (por defecto, mientras no haya local ni línea de WhatsApp activa): la persona deja día y franja (9–13 o 13–17) y en el CRM aparece "Llamar: …". Llamarle en esa franja, acordar la cita y usar **Acordar cita** para ponerle día y hora (queda **Confirmada**; escribir el **lugar**). Las llamadas que nadie atendió se marcan **Expirada** solas a los 7 días.
   - **`citas`**: la persona aparta día y hora. Confirmarla por WhatsApp y en el CRM ponerla en **Confirmada** con el **lugar**. Una cita que nadie confirma en un día hábil se libera sola (el CRM dice la fecha límite).
   Después de la cita: **Atendida** o **No asistió** (este regresa el lead a "por contactar"). Para mover una cita, **Reprogramar**.
   `CITA_CAPACIDAD` = citas al mismo tiempo (una por asesor; 1 por defecto). `LLAMADAS_POR_FRANJA` = llamadas que el equipo alcanza por franja (8 por defecto). `CITA_TOPE_HORA` = reservas hechas por hora en todo el sitio antes de frenar y alertar (20 por defecto).
   **Tarifa por cambio:** `TARIFA_CAMBIO_MXN` en Vercel (proyecto del CRM): lo que paga la casa de la red por cada cambio, igual en todas. El usuario no paga nada y el chat nunca la menciona; solo sirve para el cobro y el dinero por campaña en el CRM. (Las variables `COMISION_FIJA_MXN` y `COMISION_PCT_AHORRO` ya no se usan.) **Configurarla antes del lanzamiento.**
4. **Leads**: mover la etapa conforme avanza el caso:
   Cita solicitada → Cita confirmada → Atendido → **Cambio concretado** (anotar casa de destino) → **Tarifa cobrada a la casa** (anotar el monto). Si no avanza: **Descartado** con el motivo.
   Todo se guarda solo al escribir. En notas no poner datos de la deuda ni de otras personas.
5. Cada vez que se pague publicidad: **Registrar gasto** en "Por campaña" con el mismo nombre de campaña que lleva el link (utm_campaign).
6. Una vez por semana (solo el dueño): "Descargar leads (CSV)" para el reporte.

## Usuarios
El panel viejo del sitio (`/admin/leads`) se retiró el 27-sep: `/admin` lleva al CRM. Los usuarios viven en el CRM (tabla `crm_usuario`) y se crean con `crm/scripts/crear-usuario.mjs` (ver `crm/README.md`). Las variables `ADMIN_USER`, `ADMIN_PASSWORD` y `ADMIN_USUARIOS` del proyecto `cap-co` ya no se usan y se pueden borrar en Vercel.

## Links de campaña
Cada publicación o anuncio debe llevar su etiqueta para que el CRM sepa de dónde vino la gente, por ejemplo:
`https://casa-ap.com/?utm_source=facebook&utm_campaign=afectados-monte-de-piedad`
`https://casa-ap.com/?utm_source=tiktok&utm_campaign=video-refrendo`

TikTok solo deja un link en la biografía: cada video dice en pantalla su link corto, `casa-ap.com/v/<codigo>` (por ejemplo `casa-ap.com/v/refrendo`), que entra como campaña `refrendo` de TikTok. En el CRM, **Tráfico → Dinero por campaña**, la columna **Margen** es la tarifa cobrada a la casa menos publicidad e IA.

## Días inhábiles
La agenda salta los días de descanso oficiales que están en `DIAS_INHABILES` (`lib/agenda/horarios.js`). La lista llega al 1 de enero de 2028: **cada diciembre** hay que agregar los del año siguiente (y cualquier cierre propio).

## Horario
El chat funciona las 24 horas. Los mensajes a personas prometen respuesta de **lunes a viernes de 9:00 a 17:00**.
