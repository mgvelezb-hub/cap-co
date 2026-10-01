// Símbolo "El Dintel" — versión estática del logo aprobado (Rev. "ultimo
// logo", LOGO/ultimo logo/CAP&CO-logo.svg): rombo en oro facetado, anillo
// dorado con diamante bajo la A y patines fusionados en la base. Misma
// geometría que AnimatedLogo.js pero sin animación; para header/footer.
// props.color controla monograma y patines (por defecto esmeralda; el
// footer lo usa en claro sobre verde). Las piezas doradas no cambian.
// Los ids de gradientes se repiten entre instancias (header y footer) —
// inofensivo: los defs son idénticos y el navegador resuelve al primero.
// decorativo: junto a un texto visible con el nombre (header, footer), el lector lo salta.
export default function Logo({ className = "", color = "#14402F", decorativo = false }) {
  const a11y = decorativo ? { "aria-hidden": true } : { role: "img", "aria-label": "CAP & Co." };
  return (
    <svg viewBox="-125 -135 250 300" className={className} {...a11y}>
      <defs>
        <clipPath id="lg-base">
          <rect x="-150" y="-150" width="300" height="300" />
        </clipPath>
        <radialGradient id="lg-aroTubo" gradientUnits="userSpaceOnUse" cx="0" cy="122.32" r="27.68">
          <stop offset="0.7908" stopColor="#80550F" />
          <stop offset="0.8117" stopColor="#A8742A" />
          <stop offset="0.8577" stopColor="#DBAA5B" />
          <stop offset="0.8954" stopColor="#BD9140" />
          <stop offset="0.9414" stopColor="#966C24" />
          <stop offset="1" stopColor="#684509" />
        </radialGradient>
        <linearGradient id="lg-aroLuz" x1="0.146" y1="0.854" x2="0.854" y2="0.146">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.42" />
          <stop offset="0.24" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="0.76" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.18" />
        </linearGradient>
        <linearGradient id="lg-aroSombra" x1="0.146" y1="0.146" x2="0.854" y2="0.854">
          <stop offset="0" stopColor="#3A2405" stopOpacity="0.42" />
          <stop offset="0.45" stopColor="#3A2405" stopOpacity="0" />
          <stop offset="0.80" stopColor="#3A2405" stopOpacity="0.05" />
          <stop offset="1" stopColor="#3A2405" stopOpacity="0.14" />
        </linearGradient>
        <path
          id="lg-aroForma"
          fillRule="evenodd"
          d="M -27.68 122.32 A 27.68 27.68 0 1 0 27.68 122.32 A 27.68 27.68 0 1 0 -27.68 122.32 Z
             M -21.89 122.32 A 21.89 21.89 0 1 0 21.89 122.32 A 21.89 21.89 0 1 0 -21.89 122.32 Z"
        />
        <linearGradient id="lg-oroA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#EFDCAB" /><stop offset="1" stopColor="#C69E54" /></linearGradient>
        <linearGradient id="lg-oroB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#DDC48D" /><stop offset="1" stopColor="#B08A3E" /></linearGradient>
        <linearGradient id="lg-oroC" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#CBAE72" /><stop offset="1" stopColor="#9E7A35" /></linearGradient>
        <linearGradient id="lg-oroD" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#AF9050" /><stop offset="1" stopColor="#7F5D2B" /></linearGradient>
        <linearGradient id="lg-c1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#CBAB74" /><stop offset="1" stopColor="#B8975D" /></linearGradient>
        <linearGradient id="lg-c2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#EDDEC5" /><stop offset="1" stopColor="#D9C7A2" /></linearGradient>
        <linearGradient id="lg-c3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#C29753" /><stop offset="1" stopColor="#B08642" /></linearGradient>
        <linearGradient id="lg-c4" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#E9DABE" /><stop offset="1" stopColor="#CEBF9D" /></linearGradient>
        <linearGradient id="lg-c5" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#D9C29B" /><stop offset="1" stopColor="#937048" /></linearGradient>
        <linearGradient id="lg-p1" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#BC9C72" /><stop offset="1" stopColor="#A18153" /></linearGradient>
        <linearGradient id="lg-p2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9C7238" /><stop offset="1" stopColor="#875F28" /></linearGradient>
        <linearGradient id="lg-p3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#AA814E" /><stop offset="1" stopColor="#966D36" /></linearGradient>
      </defs>

      {/* ANILLO con diamante (el monograma verde pasa por delante) */}
      <g>
        <use href="#lg-aroForma" fill="url(#lg-aroTubo)" />
        <use href="#lg-aroForma" fill="url(#lg-aroSombra)" />
        <use href="#lg-aroForma" fill="url(#lg-aroLuz)" />
      </g>
      <g stroke="none">
        <path d="M -10.11 76 L -15.9 84.19 L -5.88 84.19 Z" fill="url(#lg-c1)" />
        <path d="M -10.11 76 L 0 76 L -5.88 84.19 Z" fill="url(#lg-c2)" />
        <path d="M 0 76 L -5.88 84.19 L 5.88 84.19 Z" fill="url(#lg-c3)" />
        <path d="M 0 76 L 10.11 76 L 5.88 84.19 Z" fill="url(#lg-c4)" />
        <path d="M 10.11 76 L 5.88 84.19 L 15.9 84.19 Z" fill="url(#lg-c5)" />
        <path d="M -15.9 84.19 L -5.88 84.19 L 0 101.2 Z" fill="url(#lg-p1)" />
        <path d="M -5.88 84.19 L 5.88 84.19 L 0 101.2 Z" fill="url(#lg-p2)" />
        <path d="M 5.88 84.19 L 15.9 84.19 L 0 101.2 Z" fill="url(#lg-p3)" />
      </g>
      <g fill="none" stroke="#FFFFFF" strokeWidth="0.75" strokeLinecap="round">
        <path d="M -10.11 76 L 10.11 76" />
        <path d="M -15.9 84.19 L 15.9 84.19" />
        <path d="M -10.11 76 L -5.88 84.19" />
        <path d="M 0 76 L -5.88 84.19" />
        <path d="M 0 76 L 5.88 84.19" />
        <path d="M 10.11 76 L 5.88 84.19" />
        <path d="M -5.88 84.19 L 0 101.2" />
        <path d="M 5.88 84.19 L 0 101.2" />
      </g>

      {/* MONOGRAMA extendido a y=160 y recortado en 150 + patines fusionados */}
      <g clipPath="url(#lg-base)">
        <g fill="none" stroke={color} strokeWidth="18" strokeLinecap="butt">
          <path d="M -105 160 L -105 -20 A 105 105 0 0 1 105 -20 L 105 160" />
          <path d="M -105 -20 L 105 -20" />
          <path d="M -78.56 160 L 0 -20" />
          <path d="M 78.56 160 L 0 -20" />
          <path d="M -33 60 L 33 60" />
        </g>
        <g fill={color}>
          <path d="M -114 139 C -114 146.5 -118 150 -123.4 150 L -54.98 150 C -58.5 150 -59.6 146.5 -59.6 139
                   L -79.22 139 C -81.2 141.3 -85.8 143.2 -88.9 145 C -92 143.2 -96 141.3 -96 139 Z" />
          <path d="M 114 139 C 114 146.5 118 150 123.4 150 L 54.98 150 C 58.5 150 59.6 146.5 59.6 139
                   L 79.22 139 C 81.2 141.3 85.8 143.2 88.9 145 C 92 143.2 96 141.3 96 139 Z" />
        </g>
      </g>

      {/* ROMBO dorado facetado */}
      <g stroke="none">
        <path d="M 0 -92 L 0 -72 L -16 -72 Z" fill="url(#lg-oroA)" />
        <path d="M 0 -92 L 16 -72 L 0 -72 Z" fill="url(#lg-oroB)" />
        <path d="M 0 -72 L 16 -72 L 0 -52 Z" fill="url(#lg-oroC)" />
        <path d="M 0 -72 L 0 -52 L -16 -72 Z" fill="url(#lg-oroD)" />
      </g>
    </svg>
  );
}
