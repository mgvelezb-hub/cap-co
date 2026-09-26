const FRASES = [
  "El refrendo solo paga intereses",
  "Tu boleta es un contrato: entiéndelo antes de firmar",
  "Una tasa 3% más alta puede duplicar tu pago",
  "Analizar tu boleta no tiene costo",
  "El costo real nunca es el número grande de la publicidad",
  "Preguntar no cuesta nada; no preguntar, sí",
];

export default function Ticker() {
  const fila = [...FRASES, ...FRASES];
  return (
    <div className="overflow-hidden border-y border-esmeralda/10 bg-esmeralda py-4" aria-hidden="true">
      <div className="ticker-track">
        {fila.map((f, i) => (
          <span key={i} className="flex items-center whitespace-nowrap font-serif text-lg text-sobre-verde/90">
            <span className="px-6">{f}</span>
            <svg viewBox="0 0 16 20" className="h-3 w-auto shrink-0 opacity-70">
              <path d="M 8 0 L 16 10 L 8 20 L 0 10 Z" fill="#A32638" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}
