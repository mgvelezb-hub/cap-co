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
3. **Agenda**: por cada cita nueva, escribir por WhatsApp a la persona, confirmar el lugar, y en el panel poner la cita en **Confirmada** y escribir el **lugar**. Después de la cita: **Atendida** o **No asistió**.
4. **Leads**: mover la etapa conforme avanza el caso:
   Cita solicitada → Cita confirmada → Atendido → **Cambio concretado** (anotar casa de destino) → **Comisión cobrada** (anotar el monto). Si no avanza: **Descartado** con el motivo.
   Todo se guarda solo al escribir. En notas no poner datos de la deuda ni de otras personas.
5. Cada vez que se pague publicidad: **Registrar gasto** en "Por campaña" con el mismo nombre de campaña que lleva el link (utm_campaign).
6. Una vez por semana (solo el dueño): "Descargar leads (CSV)" para el reporte.

## Usuarios del panel
Cada persona tiene su usuario (el panel guarda en la bitácora quién cambió qué). Para dar de alta a alguien, Mau corre `node scripts/crear-usuario.mjs <usuario> <dueno|operador>` y agrega la línea en `ADMIN_USUARIOS` en Vercel. El rol **operador** no puede descargar el CSV.

## Links de campaña
Cada publicación o anuncio debe llevar su etiqueta para que el panel sepa de dónde vino la gente, por ejemplo:
`https://casa-ap.com/?utm_source=facebook&utm_campaign=afectados-monte-de-piedad`
`https://casa-ap.com/?utm_source=tiktok&utm_campaign=video-refrendo`

## Horario
El chat funciona las 24 horas. Los mensajes a personas prometen respuesta de **lunes a viernes de 9:00 a 17:00**.
