// Símbolo "El Dintel" — reconstrucción vectorial exacta del logo aprobado.
// P = jamba izquierda + cabeza del arco cerrada por el dintel; C = cabeza del arco; A = flat-top.
// props.color controla el trazo (por defecto esmeralda); el rombo siempre granate salvo que se indique.
export default function Logo({ className = "", color = "#14402F", rombo = "#A32638" }) {
  return (
    <svg viewBox="-125 -135 250 300" className={className} aria-label="CAP & Co.">
      <g fill="none" stroke={color} strokeWidth="18" strokeLinecap="butt">
        <path d="M -105 150 L -105 -20 A 105 105 0 0 1 105 -20 L 105 150" />
        <path d="M -105 -20 L 105 -20" />
        <path d="M -74.2 150 L 0 -20" />
        <path d="M 74.2 150 L 0 -20" />
        <path d="M -33 60 L 33 60" />
      </g>
      <path d="M 0 -92 L 16 -72 L 0 -52 L -16 -72 Z" fill={rombo} />
    </svg>
  );
}
