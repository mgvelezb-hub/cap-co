// Variante del logo para el hero: cada trazo se dibuja con pathLength=1
// (stroke-dasharray/dashoffset normalizado). El rombo NO vive aquí — se
// superpone como gema 3D real (Gem3D.js, Three.js) en la posición exacta que
// dejaría este trazo: centro en (0,-72) del viewBox, es decir 50% / 21%
// del cuadro renderizado. Uso puntual (primera impresión); Logo.js sigue
// siendo la versión estática para header/footer, con su rombo plano.
export default function AnimatedLogo({ className = "", color = "#14402F" }) {
  const seg = (d, dur, delay) => (
    <path d={d} pathLength={1} className="segment" style={{ "--dur": `${dur}ms`, "--delay": `${delay}ms` }} />
  );
  return (
    <svg viewBox="-125 -135 250 300" className={`animated-logo ${className}`} aria-label="CAP & Co.">
      <g fill="none" stroke={color} strokeWidth="18" strokeLinecap="butt">
        {seg("M -105 150 L -105 -20 A 105 105 0 0 1 105 -20 L 105 150", 1300, 0)}
        {seg("M -105 -20 L 105 -20", 500, 1150)}
        {seg("M -74.2 150 L 0 -20", 600, 1400)}
        {seg("M 74.2 150 L 0 -20", 600, 1550)}
        {seg("M -33 60 L 33 60", 450, 2100)}
      </g>
    </svg>
  );
}
