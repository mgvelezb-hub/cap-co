# Página web CAP & Co. — Diseño (v1 informativa)
**Aprobado:** 8 de julio de 2026, noche.

## Objetivo
Página informativa de una sola vista (long-scroll) que educa sobre el mundo del empeño y construye credibilidad, empujando siempre la cotización real hacia WhatsApp (canal primario, aún sin número — placeholder). Sin chatbot, sin cotizador de piezas en esta versión — quedan para fases posteriores.

## Alcance explícitamente fuera de v1
- Chatbot web (scripted o con IA)
- Cotizador de piezas / precio spot de oro (KITCO)
- Multi-idioma
- CMS o edición de contenido sin tocar código

## Stack técnico
- **Next.js** (App Router), JavaScript (sin TypeScript — equipo junior, menor curva)
- **Tailwind CSS** para estilos, con tokens de marca en el theme (colores + tipografías)
- **Fuentes:** Marcellus (serif, titulares/marca) + Inter (sans, cuerpo) vía `next/font/google` — evita depender de archivos .ttf locales, que ya no existen en el proyecto
- **Logo:** reconstruido como componente SVG inline (`<Logo />`), replicando el trazo "El Dintel" ya aprobado (arco r105, grosor 18, rombo granate). SVG en vez de PNG: escala nítido, permite recolorear (ej. versión blanca sobre fondo verde) sin regenerar archivos
- Ubicación del proyecto: `~/Desktop/PROYECTO-CAP&CO/PAGINA WEB/`
- Sin backend, sin base de datos — sitio estático

## Sistema de marca aplicado (fuente: `logos/CAP&CO-ficha-tecnica.pdf`)
- Verde esmeralda `#14402F` — texto, marca, fondos oscuros, botones primarios
- Rojo granate `#A32638` — **uso restringido**: solo para señalar "el problema" (tasas abusivas, costos ocultos). Nunca en botones de acción ni CTAs — regla explícita de doc 02 §2
- Blanco `#FFFFFF` — fondo base, espacio negativo generoso ("aquí no hay letras chiquitas")
- Marcellus para titulares y nombre de marca; Inter para cuerpo, nav, botones

## Estructura de la página (secciones, en orden)

1. **Header** — logo CAP & Co. + nav ancla (Problema, Cómo funciona, Educación, Nosotros) + botón "Cotiza por WhatsApp" (href `#` placeholder, un solo punto en código — `lib/constants.js` — para poner el número real después)

2. **Hero** — titular: "Tu boleta, sin letras chiquitas." Subtítulo: "Te explicamos exactamente qué firmaste, cuánto vas a pagar y qué opciones tienes — con datos reales, no promesas." + CTA primario a WhatsApp

3. **Problema / Solución** — copy exacto de doc 02 §4:
   - Problema: "millones empeñan sin entender tasas, refrendos ni costos totales; la industria vive de esa opacidad"
   - Solución: "asesoría gratuita que traduce tu boleta a lenguaje humano, compara opciones reales del mercado y te acompaña si decides moverte a una mejor"

4. **Cómo funciona** — 3-4 pasos basados en doc 01 §1 (educar/asesorar → cotizar boleta → comparar opciones reales → acompañar si conviene moverse)

5. **Educación** — acordeón o tarjetas con: qué es una tasa, qué es el refrendo, cómo leer tu boleta, cuánto vas a pagar realmente

6. **Misión y Visión** — copy exacto de doc 02:
   - Misión: "Hacer que cualquier persona entienda exactamente qué firmó al empeñar, cuánto va a pagar y qué opciones tiene — con datos reales y evaluación justa, sin letras chiquitas."
   - Visión: "Ser la referencia de confianza en México para tomar decisiones prendarias informadas: donde la gente llega confundida y sale sabiendo qué le conviene."
   - Valores: claridad radical, datos no opiniones, evaluación justa, discreción

7. **Footer** — CTA final WhatsApp, link a aviso de privacidad (placeholder — obligatorio antes de operar el chatbot real, doc 01 §9), copyright

## Restricciones de confidencialidad y legales (de docs 01/02)
- El copy **nunca** nombra instituciones ni casas de empeño; habla de "nuestra red de casas con convenio". El servicio es gratis para el usuario.
- Ningún texto afirma independencia/neutralidad de forma explícita y categórica ("somos 100% independientes") — bandera abierta de PROFECO por posible publicidad engañosa
- Sin símbolos patrios literales (ya cubierto por el logo aprobado)
- Aviso de privacidad: placeholder visible desde v1, contenido real pendiente de asesoría legal

## Cómo se entrega
Sin capturas ni mockups en el chat (preferencia del usuario, ahorro de tokens). Se levanta servidor local (`npm run dev`) y se comparte la URL (`localhost:3000`) para revisar en Chrome directamente. Cada actualización se avisa por texto, sin imágenes inline.

## Siguiente paso
Invocar writing-plans para desglosar la construcción en pasos ejecutables (scaffold Next.js → theme/tokens → componente Logo → secciones → contenido → QA visual en navegador).
