const FRASES = [
  "El refrendo solo paga intereses",
  "Tu boleta es un contrato: entiéndelo antes de firmar",
  "3 puntos más de tasa: $1,800 más en 6 meses por cada $10,000",
  "Analizar tu boleta no tiene costo",
  "El costo real está en el CAT, no en el anuncio",
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
