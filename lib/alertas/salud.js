// Diagnóstico del sistema, compartido por /api/salud (público, mínimo) y Ajustes del CRM (detalle).

import { dbDisponible, query } from "../db/client.js";
import { ultimaFotografia } from "../precios/repo.js";
import { fotografiaVigente } from "../precios/calculo.js";
import { eventosRecientes, TIPOS_CAIDA } from "./eventos.js";
import { correoConfigurado } from "./notificar.js";

/** @param {{revisarLlave?: boolean}} opciones el CRM no revisa la llave: la que importa es la del sitio. */
export async function diagnostico({ revisarLlave = true } = {}) {
  const caida = [];
  const degradado = [];
  let precio = null;
  let eventos = [];
  if (revisarLlave && !process.env.ANTHROPIC_API_KEY) caida.push("sin_llave_anthropic");
  if (!dbDisponible()) {
    degradado.push("sin_base_de_datos");
  } else {
    try {
      await query("SELECT 1");
      const foto = await ultimaFotografia();
      precio = foto ? { capturado_at: foto.capturadoAt, edad_horas: Math.round((Date.now() - new Date(foto.capturadoAt)) / 36e5) } : null;
      if (!fotografiaVigente(foto)) degradado.push("precios_viejos");
      eventos = await eventosRecientes({ horas: 1, limite: 50 });
      // Consulta dedicada: una caída se ve aunque haya muchos avisos, y deja de verse 15 min después.
      const r = await query(
        `SELECT DISTINCT tipo FROM evento_sistema WHERE tipo = ANY($1) AND creado_at > now() - interval '15 minutes'`,
        [TIPOS_CAIDA],
      );
      for (const fila of r.rows) caida.push(fila.tipo);
    } catch {
      degradado.push("base_de_datos_no_responde");
    }
  }
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
