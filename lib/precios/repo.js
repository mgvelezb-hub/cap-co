// Fotografías de precios en la tabla precio_metal.

import { query, dbDisponible } from "../db/client.js";

// Solo para scripts/eval-chat.mjs: permite probar el chat sin base de datos.
let fotografiaDePrueba = null;
export function usarFotografiaDePrueba(foto) {
  fotografiaDePrueba = foto;
}

export async function guardarFotografia({ sesion, usd, fx, fuente }) {
  const { rows } = await query(
    `INSERT INTO precio_metal (sesion, oro_usd_oz, plata_usd_oz, platino_usd_oz, paladio_usd_oz, usd_mxn, fx_fecha, fuente)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, capturado_at`,
    [sesion, usd.oro, usd.plata, usd.platino, usd.paladio, fx.usdMxn, fx.fecha, fuente],
  );
  return rows[0];
}

export async function ultimaFotografia() {
  if (fotografiaDePrueba) return fotografiaDePrueba;
  if (!dbDisponible()) return null;
  const { rows } = await query(
    `SELECT id, capturado_at, sesion, oro_usd_oz, plata_usd_oz, platino_usd_oz, paladio_usd_oz, usd_mxn, fx_fecha, fuente
       FROM precio_metal ORDER BY capturado_at DESC LIMIT 1`,
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: Number(r.id),
    capturadoAt: r.capturado_at,
    sesion: r.sesion,
    oroUsdOz: Number(r.oro_usd_oz),
    plataUsdOz: Number(r.plata_usd_oz),
    platinoUsdOz: Number(r.platino_usd_oz),
    paladioUsdOz: Number(r.paladio_usd_oz),
    usdMxn: Number(r.usd_mxn),
    fxFecha: r.fx_fecha,
    fuente: r.fuente,
  };
}
