// Render mínimo de markdown para las burbujas: **negritas**, listas con "- " o "1. " y
// saltos de línea. Nada más (sin HTML crudo, sin links: el único link es el CTA).

import { Fragment } from "react";

function inline(texto, keyBase) {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) {
      return <strong key={`${keyBase}-${i}`}>{p.slice(2, -2)}</strong>;
    }
    return <Fragment key={`${keyBase}-${i}`}>{p}</Fragment>;
  });
}

export function renderMarkdown(texto) {
  const lineas = texto.split("\n");
  const bloques = [];
  let lista = [];
  let tipoLista = "ul";

  const cerrarLista = () => {
    if (lista.length === 0) return;
    const Tag = tipoLista;
    bloques.push(
      <Tag
        key={`${tipoLista}-${bloques.length}`}
        className={`my-1 space-y-0.5 pl-5 ${tipoLista === "ol" ? "list-decimal" : "list-disc"}`}
      >
        {lista.map((item, i) => (
          <li key={i}>{inline(item, `li-${bloques.length}-${i}`)}</li>
        ))}
      </Tag>,
    );
    lista = [];
  };

  lineas.forEach((linea, i) => {
    const vineta = linea.match(/^\s*[-•]\s+(.*)$/);
    const numerada = linea.match(/^\s*\d{1,2}[.)]\s+(.*)$/);
    const item = vineta || numerada;
    if (item) {
      const tipo = vineta ? "ul" : "ol";
      if (lista.length > 0 && tipo !== tipoLista) cerrarLista();
      tipoLista = tipo;
      lista.push(item[1]);
      return;
    }
    cerrarLista();
    if (linea.trim() === "") {
      bloques.push(<div key={`sp-${i}`} className="h-2" />);
      return;
    }
    bloques.push(<p key={`p-${i}`}>{inline(linea, `p-${i}`)}</p>);
  });
  cerrarLista();
  return bloques;
}
