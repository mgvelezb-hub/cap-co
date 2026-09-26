import { renderMarkdown } from "./markdown";

export default function ChatMessage({ role, content, pendiente, adjunto }) {
  const esUsuario = role === "user";
  return (
    <div className={`flex ${esUsuario ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 font-sans text-[15px] leading-relaxed ${
          esUsuario
            ? "rounded-br-md bg-esmeralda text-sobre-verde"
            : "rounded-bl-md border border-esmeralda/10 bg-papel-alto text-esmeralda"
        }`}
      >
        {adjunto && (
          <div className="mb-1 font-sans text-xs uppercase tracking-[0.14em] text-sobre-verde/70">Foto de boleta adjunta</div>
        )}
        {pendiente && content === "" ? <Puntos /> : renderMarkdown(content)}
      </div>
    </div>
  );
}

function Puntos() {
  return (
    <span className="chat-puntos inline-flex items-center gap-1 py-1" aria-label="Escribiendo">
      <span />
      <span />
      <span />
    </span>
  );
}
