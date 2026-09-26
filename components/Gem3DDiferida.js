"use client";

import dynamic from "next/dynamic";

// El rombo 3D pesa ~240 kB (three.js): se carga aparte, después de pintar la página, para que el
// texto y el botón de WhatsApp aparezcan sin esperarlo. Mientras carga, el hueco queda vacío.
const Gem3D = dynamic(() => import("./Gem3D"), { ssr: false });

export default function Gem3DDiferida(props) {
  return <Gem3D {...props} />;
}
