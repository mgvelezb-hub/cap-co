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

## Todos los días (2 minutos)
1. Abrir el panel. Si hay recuadro rojo de alertas, seguir la tabla de arriba.
2. En "Últimos leads", cambiar la **etapa** de cada lead contactado (cita confirmada, atendido o descartado) y anotar lo importante en **notas**.
3. Una vez por semana: "Descargar en Excel (CSV)" para el reporte.

## Horario
El chat funciona las 24 horas. Los mensajes a personas prometen respuesta de **lunes a viernes de 9:00 a 17:00**.
