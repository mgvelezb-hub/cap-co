// Variante del logo para el hero: cada trazo se dibuja con pathLength=1
// (stroke-dasharray/dashoffset normalizado). El rombo superior NO vive aquí
// — se superpone como gema 3D real (Gem3D.js, Three.js) en la posición
// exacta que dejaría este trazo: centro en (0,-72) del viewBox, es decir
// 50% / 21% del cuadro renderizado.
//
// Anillo+diamante (bajo la A) y patines (bases de arco y A) son piezas
// nuevas de la Rev. "ultimo logo" — no existían en la versión vieja. Cada
// una dibuja primero su contorno igual que el monograma y recién al
// terminar se rellena con los degradados aprobados (mismos valores que
// LOGO/ultimo logo/CAP&CO-logo.svg, con ids prefijados "al-" para no
// chocar si este componente se monta más de una vez en la página).
//
// Logo.js sigue siendo la versión estática para header/footer, todavía
// con el diseño viejo (rombo granate plano, sin anillo ni patines).
export default function AnimatedLogo({ className = "", color = "#14402F" }) {
  const seg = (d, dur, delay) => (
    <path d={d} pathLength={1} className="segment" style={{ "--dur": `${dur}ms`, "--delay": `${delay}ms` }} />
  );
  const fillIn = (children, dur, delay) => (
    <g className="fill-in" style={{ "--dur": `${dur}ms`, "--delay": `${delay}ms` }}>
      {children}
    </g>
  );

  // Cada patín se parte en dos por la punta de la muesca (x=±88.9): la mitad
  // de la jamba acompaña al arco y la mitad de la pata acompaña a la A, así
  // ningún pie aparece antes de que exista el trazo que lo pisa. Unidas, las
  // dos mitades reconstruyen exactamente el patín fusionado del PDF.
  const patinJambaIzq =
    "M -114 139 C -114 146.5 -118 150 -123.4 150 L -88.9 150 L -88.9 145 C -92 143.2 -96 141.3 -96 139 Z";
  const patinPataIzq =
    "M -88.9 150 L -54.98 150 C -58.5 150 -59.6 146.5 -59.6 139 L -79.22 139 C -81.2 141.3 -85.8 143.2 -88.9 145 Z";
  const patinJambaDer =
    "M 114 139 C 114 146.5 118 150 123.4 150 L 88.9 150 L 88.9 145 C 92 143.2 96 141.3 96 139 Z";
  const patinPataDer =
    "M 88.9 150 L 54.98 150 C 58.5 150 59.6 146.5 59.6 139 L 79.22 139 C 81.2 141.3 85.8 143.2 88.9 145 Z";
  return (
    <svg viewBox="-125 -135 250 300" className={`animated-logo ${className}`} aria-label="CAP & Co.">
      <defs>
        <clipPath id="al-base">
          <rect x="-150" y="-150" width="300" height="300" />
        </clipPath>
        <radialGradient id="al-aroTubo" gradientUnits="userSpaceOnUse" cx="0" cy="122.32" r="27.68">
          <stop offset="0.7908" stopColor="#80550F" />
          <stop offset="0.8117" stopColor="#A8742A" />
          <stop offset="0.8577" stopColor="#DBAA5B" />
          <stop offset="0.8954" stopColor="#BD9140" />
          <stop offset="0.9414" stopColor="#966C24" />
          <stop offset="1" stopColor="#684509" />
        </radialGradient>
        <linearGradient id="al-aroLuz" x1="0.146" y1="0.854" x2="0.854" y2="0.146">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.42" />
          <stop offset="0.24" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="0.76" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.18" />
        </linearGradient>
        <linearGradient id="al-aroSombra" x1="0.146" y1="0.146" x2="0.854" y2="0.854">
          <stop offset="0" stopColor="#3A2405" stopOpacity="0.42" />
          <stop offset="0.45" stopColor="#3A2405" stopOpacity="0" />
          <stop offset="0.80" stopColor="#3A2405" stopOpacity="0.05" />
          <stop offset="1" stopColor="#3A2405" stopOpacity="0.14" />
        </linearGradient>
        <path
          id="al-aroForma"
          fillRule="evenodd"
          d="M -27.68 122.32 A 27.68 27.68 0 1 0 27.68 122.32 A 27.68 27.68 0 1 0 -27.68 122.32 Z
             M -21.89 122.32 A 21.89 21.89 0 1 0 21.89 122.32 A 21.89 21.89 0 1 0 -21.89 122.32 Z"
        />
        <linearGradient id="al-c1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#CBAB74" /><stop offset="1" stopColor="#B8975D" /></linearGradient>
        <linearGradient id="al-c2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#EDDEC5" /><stop offset="1" stopColor="#D9C7A2" /></linearGradient>
        <linearGradient id="al-c3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#C29753" /><stop offset="1" stopColor="#B08642" /></linearGradient>
        <linearGradient id="al-c4" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#E9DABE" /><stop offset="1" stopColor="#CEBF9D" /></linearGradient>
        <linearGradient id="al-c5" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#D9C29B" /><stop offset="1" stopColor="#937048" /></linearGradient>
        <linearGradient id="al-p1" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#BC9C72" /><stop offset="1" stopColor="#A18153" /></linearGradient>
        <linearGradient id="al-p2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9C7238" /><stop offset="1" stopColor="#875F28" /></linearGradient>
        <linearGradient id="al-p3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#AA814E" /><stop offset="1" stopColor="#966D36" /></linearGradient>
      </defs>

      {/* Monograma extendido a y=160 y recortado en 150, para que el corte
          diagonal del remate de las patas no asome bajo los patines. */}
      <g clipPath="url(#al-base)">
        <g fill="none" stroke={color} strokeWidth="18" strokeLinecap="butt">
          {seg("M -105 160 L -105 -20 A 105 105 0 0 1 105 -20 L 105 160", 1300, 0)}
          {seg("M -105 -20 L 105 -20", 500, 1150)}
          {seg("M -78.56 160 L 0 -20", 600, 1400)}
          {seg("M 78.56 160 L 0 -20", 600, 1550)}
          {seg("M -33 60 L 33 60", 450, 2100)}
        </g>

        {/* Cada mitad aparece con el trazo al que pertenece: la jamba
            izquierda del arco arranca a dibujarse en t=0 desde la base, la
            derecha aterriza en la base cerca del final del arco (~1250ms),
            y las patas de la A arrancan desde abajo en 1400/1550. */}
        {fillIn(<path d={patinJambaIzq} fill={color} />, 150, 0)}
        {fillIn(<path d={patinJambaDer} fill={color} />, 150, 1150)}
        {fillIn(<path d={patinPataIzq} fill={color} />, 150, 1400)}
        {fillIn(<path d={patinPataDer} fill={color} />, 150, 1550)}
      </g>

      {/* Anillo con diamante bajo la A: la pieza completa (aro + diamante)
          aparece de una, con un solo fundido suave — sin trazado de
          contorno previo. Arranca al terminar el travesaño de la A (2550). */}
      {fillIn(
        <>
          <g>
            <use href="#al-aroForma" fill="url(#al-aroTubo)" />
            <use href="#al-aroForma" fill="url(#al-aroSombra)" />
            <use href="#al-aroForma" fill="url(#al-aroLuz)" />
          </g>
          <g stroke="none">
            <path d="M -10.11 76 L -15.9 84.19 L -5.88 84.19 Z" fill="url(#al-c1)" />
            <path d="M -10.11 76 L 0 76 L -5.88 84.19 Z" fill="url(#al-c2)" />
            <path d="M 0 76 L -5.88 84.19 L 5.88 84.19 Z" fill="url(#al-c3)" />
            <path d="M 0 76 L 10.11 76 L 5.88 84.19 Z" fill="url(#al-c4)" />
            <path d="M 10.11 76 L 5.88 84.19 L 15.9 84.19 Z" fill="url(#al-c5)" />
            <path d="M -15.9 84.19 L -5.88 84.19 L 0 101.2 Z" fill="url(#al-p1)" />
            <path d="M -5.88 84.19 L 5.88 84.19 L 0 101.2 Z" fill="url(#al-p2)" />
            <path d="M 5.88 84.19 L 15.9 84.19 L 0 101.2 Z" fill="url(#al-p3)" />
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
        </>,
        600,
        2550
      )}
    </svg>
  );
}
