// Raya vertical con rombo del lockup "logo-nombre" (LOGO/ultimo logo/
// CAP&CO-logo-nombre.svg): dos tramos de línea dorada cortados al 0.636 de
// su recorrido por un rombo facetado en oro. Geometría copiada del PDF y
// llevada a un viewBox propio (origen en el arranque de la raya):
//   raya   y 0..154.86 y 210.5..365.36 · grosor 2.16
//   rombo  centro (0, 182.68) · 23.42 x 29.28 (4 caras, rampas oroA..D)
// En el lockup la raya mide 0.751 H del isotipo; el alto se controla por
// CSS respetando esa proporción.
export default function RayaRombo({ className = "" }) {
  return (
    <svg viewBox="-15 0 30 365.36" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="rr-oroA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#EFDCAB" /><stop offset="1" stopColor="#C69E54" />
        </linearGradient>
        <linearGradient id="rr-oroB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#DDC48D" /><stop offset="1" stopColor="#B08A3E" />
        </linearGradient>
        <linearGradient id="rr-oroC" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#CBAE72" /><stop offset="1" stopColor="#9E7A35" />
        </linearGradient>
        <linearGradient id="rr-oroD" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#AF9050" /><stop offset="1" stopColor="#7F5D2B" />
        </linearGradient>
      </defs>
      <g stroke="#C8A24B" strokeWidth="2.16">
        <path d="M 0 0 L 0 154.86" />
        <path d="M 0 210.5 L 0 365.36" />
      </g>
      <g stroke="none">
        <path d="M 0 168.04 L 0 182.68 L -11.71 182.68 Z" fill="url(#rr-oroA)" />
        <path d="M 0 168.04 L 11.71 182.68 L 0 182.68 Z" fill="url(#rr-oroB)" />
        <path d="M 0 182.68 L 11.71 182.68 L 0 197.32 Z" fill="url(#rr-oroC)" />
        <path d="M 0 182.68 L 0 197.32 L -11.71 182.68 Z" fill="url(#rr-oroD)" />
      </g>
    </svg>
  );
}
