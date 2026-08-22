// Render mínimo de markdown para las burbujas: **negritas**, listas con "- " y
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

  const cerrarLista = () => {
    if (lista.length === 0) return;
    bloques.push(
      <ul key={`ul-${bloques.length}`} className="my-1 list-disc space-y-0.5 pl-5">
        {lista.map((item, i) => (
          <li key={i}>{inline(item, `li-${bloques.length}-${i}`)}</li>
        ))}
      </ul>,
    );
    lista = [];
  };

  lineas.forEach((linea, i) => {
    const item = linea.match(/^\s*[-•]\s+(.*)$/);
    if (item) {
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
