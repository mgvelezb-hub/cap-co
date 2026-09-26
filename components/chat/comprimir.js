// Reduce la foto de la boleta en el navegador antes de enviarla: JPEG de máximo 1600 px
// por lado. Legible para el modelo, ligera para el celular y bajo el límite de Vercel.

const MAX_LADO = 1600;
const CALIDAD = 0.82;

async function decodificar(archivo) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(archivo, { imageOrientation: "from-image" });
    } catch {
      // algunos navegadores no aceptan la opción; se intenta con <img>
    }
  }
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** @returns {Promise<{media_type: string, data: string, vistaPrevia: string}>} */
export async function comprimirImagen(archivo) {
  if (!archivo || !archivo.type.startsWith("image/")) {
    throw new Error("Elige una foto (JPG o PNG).");
  }
  let fuente;
  try {
    fuente = await decodificar(archivo);
  } catch {
    throw new Error("No pudimos leer esa foto. Tómala de nuevo o guárdala como JPG.");
  }
  const ancho = fuente.width;
  const alto = fuente.height;
  const escala = Math.min(1, MAX_LADO / Math.max(ancho, alto));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(ancho * escala);
  canvas.height = Math.round(alto * escala);
  canvas.getContext("2d").drawImage(fuente, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", CALIDAD);

  const mini = document.createElement("canvas");
  const escalaMini = 96 / Math.max(canvas.width, canvas.height);
  mini.width = Math.round(canvas.width * escalaMini);
  mini.height = Math.round(canvas.height * escalaMini);
  mini.getContext("2d").drawImage(canvas, 0, 0, mini.width, mini.height);

  return {
    media_type: "image/jpeg",
    data: dataUrl.slice(dataUrl.indexOf(",") + 1),
    vistaPrevia: mini.toDataURL("image/jpeg", 0.7),
  };
}
