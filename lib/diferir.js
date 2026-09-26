// Corre trabajo después de responder: dentro de Next con after(); fuera de Next (scripts,
// pruebas), en línea. La importación es diferida porque next/server no carga fuera del runtime.
export async function diferir(fn) {
  try {
    const { after } = await import("next/server");
    after(fn);
  } catch {
    await fn();
  }
}
