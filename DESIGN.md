# DESIGN.md — CAP & Co.

## Color
Estrategia: **Committed** — el verde esmeralda carga la identidad (~40% de la superficie en bandas drench); granate quirúrgico solo-problema; neutros entintados hacia verde (nunca #fff/#000 puros en superficies grandes).

| Token | Valor | Uso |
|---|---|---|
| esmeralda | `#14402F` | Marca, texto, bandas drench, botones primarios |
| granate | `#A32638` | SOLO señalar el problema (cifras malas, alertas). Nunca CTAs |
| papel | `#F7F8F4` | Fondo base (blanco entintado a verde) |
| papel-alto | `#FDFDFB` | Superficies elevadas |
| tinta-suave | `rgba(20,64,47,.72)` | Texto secundario |
| linea | `rgba(20,64,47,.14)` | Bordes, rieles |

Sobre esmeralda: texto `#F4F6F1`, nunca blanco puro.

## Tipografía
Identidad ya registrada (ficha técnica IMPI): **Marcellus** (serif, titulares y marca) + **Inter** (sans, cuerpo/UI). Se conservan — identidad manda sobre cualquier moda.
- Display: `clamp(2.6rem, 6.5vw, 5.25rem)`, Marcellus, line-height 1.05
- H2: `clamp(1.9rem, 3.6vw, 3rem)`
- Cuerpo: 1.0625rem–1.125rem, Inter, max 68ch
- Escala con ratio ≥1.3; jerarquía por tamaño, no por peso (Marcellus solo tiene 400)

## Motivos visuales
- **El arco/dintel** del logo como geometría recurrente (divisores, marcos, fondo del hero)
- **El rombo granate** como bullet/acento puntual (la prenda)
- **La boleta** como objeto gráfico central (SVG estilizado, diseccionado con anotaciones)

## Motion
- Curva única: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo), 600–800ms
- Reveals al scroll con stagger (IntersectionObserver), solo `opacity` + `transform`
- Marquesina de verdades: translateX infinito, pausa en hover
- Rombo del hero: flotación lenta (8s)
- Sin bounce, sin elastic, sin animar propiedades de layout

## Prohibiciones del proyecto
- Barritas laterales de color como acento (border-left grueso)
- Tarjetas idénticas en grid con iconito
- Etiqueta mayúscula repetida sobre cada sección
- Gradientes en texto, glassmorphism, sombras teatrales
- Granate en botones o hovers de acción
