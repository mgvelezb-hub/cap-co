// Render mínimo de markdown para las burbujas: **negritas**, listas con "- " o "1. ", tablas
// con "|" (comparativos de casas de empeño) y saltos de línea. Nada más (sin HTML crudo, sin
// links: el único link es el CTA).

import { Fragment } from "react";
import { SEPARADOR_TABLA, celdas, esFilaTabla } from "./tabla.js";

function inline(texto, keyBase) {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) {
      return <strong key={`${keyBase}-${i}`}>{p.slice(2, -2)}</strong>;
    }
    return <Fragment key={`${keyBase}-${i}`}>{p}</Fragment>;
  });
}

function Tabla({ filas, keyBase }) {
  const [cabeza, ...cuerpo] = filas;
  return (
    <div className="my-2 -mx-1 overflow-x-auto">
      <table className="w-full border-collapse text-[13px] leading-snug">
        <thead>
          <tr>
            {cabeza.map((c, i) => (
              <th key={i} className={`border-b border-esmeralda/20 px-1.5 py-1 font-semibold ${i ? "text-right" : "text-left"}`}>
                {inline(c, `${keyBase}-h-${i}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cuerpo.map((fila, r) => (
            <tr key={r} className="border-b border-esmeralda/10 last:border-0">
              {fila.map((c, i) => (
                <td key={i} className={`px-1.5 py-1 align-top ${i ? "text-right tabular-nums" : "text-left"}`}>
                  {inline(c, `${keyBase}-${r}-${i}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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

  let tabla = [];
  const cerrarTabla = () => {
    if (tabla.length === 0) return;
    bloques.push(<Tabla key={`t-${bloques.length}`} filas={tabla} keyBase={`t-${bloques.length}`} />);
    tabla = [];
  };

  lineas.forEach((linea, i) => {
    // Tabla: una fila de encabezado seguida de la línea separadora "|---|---|".
    const esFila = esFilaTabla(linea);
    if (esFila && tabla.length === 0 && SEPARADOR_TABLA.test(lineas[i + 1] || "")) {
      cerrarLista();
      tabla.push(celdas(linea));
      return;
    }
    if (tabla.length > 0) {
      if (SEPARADOR_TABLA.test(linea)) return;
      if (esFila) {
        tabla.push(celdas(linea));
        return;
      }
      cerrarTabla();
    }
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
  cerrarTabla();
  return bloques;
}
