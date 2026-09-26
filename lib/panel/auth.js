// Utilidades para las rutas del panel (ya autenticadas por middleware.js).

export function usuarioPanel(request) {
  return {
    usuario: request.headers.get("x-panel-usuario") || "desconocido",
    rol: request.headers.get("x-panel-rol") === "dueno" ? "dueno" : "operador",
  };
}

/**
 * Freno contra CSRF: el navegador reenvía la Basic auth en peticiones de otros sitios, así que
 * los cambios solo se aceptan en JSON y desde el mismo origen.
 * @returns {Response | null} una respuesta de rechazo, o null si pasa
 */
export function rechazarSiOtroOrigen(request) {
  if (!(request.headers.get("content-type") || "").includes("application/json")) {
    return Response.json({ error: "Tipo de contenido inválido." }, { status: 415 });
  }
  const sitio = request.headers.get("sec-fetch-site");
  if (sitio && sitio !== "same-origin") return Response.json({ error: "Origen no permitido." }, { status: 403 });
  const origen = request.headers.get("origin");
  if (origen) {
    let host = null;
    try {
      host = new URL(origen).host; // "null" (sandbox, file://) no es una URL
    } catch {}
    if (host !== request.headers.get("host")) return Response.json({ error: "Origen no permitido." }, { status: 403 });
  }
  return null;
}
