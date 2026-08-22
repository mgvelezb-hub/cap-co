// Límite de requests por IP, en memoria. Cada instancia serverless tiene su propio
// contador, así que es un freno suave, no un muro. Suficiente para fase 1.

const VENTANA_MS = 10 * 60 * 1000;
const MAX_POR_VENTANA = 30;
const registros = new Map();

export function permitir(ip, ahora = Date.now()) {
  const previo = registros.get(ip);
  if (!previo || ahora - previo.inicio > VENTANA_MS) {
    registros.set(ip, { inicio: ahora, cuenta: 1 });
    limpiar(ahora);
    return true;
  }
  if (previo.cuenta >= MAX_POR_VENTANA) {
    return false;
  }
  previo.cuenta += 1;
  return true;
}

function limpiar(ahora) {
  if (registros.size < 1000) return;
  for (const [ip, r] of registros) {
    if (ahora - r.inicio > VENTANA_MS) registros.delete(ip);
  }
}

export function ipDeRequest(request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "desconocida";
}
