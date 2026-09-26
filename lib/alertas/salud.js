// Diagnóstico del sistema, compartido por /api/salud (público, mínimo) y /api/admin/salud (detalle).

import { dbDisponible, query } from "../db/client.js";
import { ultimaFotografia } from "../precios/repo.js";
import { fotografiaVigente } from "../precios/calculo.js";
import { eventosRecientes, TIPOS_CAIDA } from "./eventos.js";
import { correoConfigurado } from "./notificar.js";

export async function diagnostico() {
  const caida = [];
  const degradado = [];
  let precio = null;
  let eventos = [];
  if (!process.env.ANTHROPIC_API_KEY) caida.push("sin_llave_anthropic");
  if (!dbDisponible()) {
    degradado.push("sin_base_de_datos");
  } else {
    try {
      await query("SELECT 1");
      const foto = await ultimaFotografia();
      precio = foto ? { capturado_at: foto.capturadoAt, edad_horas: Math.round((Date.now() - new Date(foto.capturadoAt)) / 36e5) } : null;
      if (!fotografiaVigente(foto)) degradado.push("precios_viejos");
      eventos = await eventosRecientes({ horas: 1, limite: 50 });
    } catch {
      degradado.push("base_de_datos_no_responde");
    }
  }
  for (const t of new Set(eventos.filter((e) => TIPOS_CAIDA.includes(e.tipo)).map((e) => e.tipo))) caida.push(t);
  const estado = caida.length > 0 ? "caido" : degradado.length > 0 ? "degradado" : "ok";
  return {
    estado,
    problemas: [...caida, ...degradado],
    precio,
    errores_ultima_hora: eventos.length,
    alertas_por_correo: correoConfigurado(),
    revisado_at: new Date().toISOString(),
  };
}
