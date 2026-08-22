// Base de conocimiento del chatbot. Texto FIJO: cualquier cambio invalida el caché
// de prompt, así que no meter fechas ni valores dinámicos aquí.
//
// CONTENIDO PROVISIONAL. Fuentes: doc 04 "El Mundo del Empeño" (investigación interna,
// julio 2026, basada en PROFECO, CONDUSEF, NOM-179-SCFI-2016 y prensa) y el texto actual
// de la página. Cuando Ricardo entregue el contenido real del negocio, reemplazar las
// secciones "Qué hace CAP & Co." y "Preguntas frecuentes" con sus datos.
//
// Regla editorial: aquí NO se nombra ninguna casa de empeño ni institución prendaria.
// Solo autoridades (PROFECO, CONDUSEF) y categorías (IAP vs comerciales).

export const KNOWLEDGE = `
# BASE DE CONOCIMIENTO — CAP & Co.

## 1. Qué es CAP & Co. y qué hace
- CAP & Co. significa Casa de Asesoramiento Prendario. Es un servicio de ASESORÍA sobre empeños en México (Ciudad de México y alrededores), operado en línea: página web y WhatsApp. No hay sucursal.
- Qué SÍ hace: revisar la boleta de empeño de una persona; explicarle tasa, CAT, plazo, refrendo y costo total en lenguaje claro; calcular cuánto va a terminar pagando; comparar su situación contra otras opciones reales del mercado; y, si le conviene moverse a una opción mejor, acompañarla en el traspaso paso a paso. Si no le conviene moverse, también se lo dice.
- Qué NO hace: NO presta dinero. NO recibe piezas. NO compra joyas. NO es casa de empeño. NO da asesoría legal ni fiscal personalizada (para eso están PROFECO y un abogado).
- Costo: la orientación inicial por WhatsApp no tiene costo para la persona.
- Canal para casos reales: WhatsApp. Ahí la persona manda foto de su boleta y se revisa su caso concreto. En este chat web solo se orienta con los números que la persona escribe; no se reciben fotos ni documentos.
- Discreción: la situación de cada persona y sus piezas son asunto suyo. No se piden datos personales en este chat.
- Artículos sobre los que más se asesora: alhajas, oro, diamantes y relojes. También puede orientar en términos generales sobre electrónicos y otros bienes.

## 2. Cómo funciona el empeño en México (lo básico)
- Empeñar es un préstamo garantizado con un bien. La persona entrega la pieza, recibe dinero y firma una boleta (legalmente, un contrato de "mutuo con interés y garantía prendaria").
- Avalúo: un valuador estima el valor de reventa de la pieza (no lo que costó). El préstamo es un porcentaje de ese avalúo: en el mercado va desde 25 % hasta casi 100 % en joyas de oro según la institución; lo común es 40 %–60 %.
- Requisito básico: identificación oficial vigente (INE). No se revisa buró de crédito: la garantía es la pieza.
- Plazo típico: 1, 3, 5 o 6 meses según la institución. El plazo corre desde la fecha de firma.
- Al vencer: (a) desempeño = pagar préstamo + intereses y recuperar la pieza; (b) refrendo = pagar solo los intereses para ganar otro plazo; (c) si no se paga, suele haber un periodo de gracia y luego la pieza pasa a venta (remate / "comercialización").
- La ley prohíbe cobrar interés sobre interés y la tasa no puede cambiar durante la vigencia del contrato.

## 3. Los cuatro datos que determinan cuánto se paga
1. El préstamo: lo que dieron en la mano. Es el punto de partida de la deuda, no la deuda final.
2. La tasa y el CAT: la tasa es el interés mensual. El CAT (Costo Anual Total) suma la tasa más comisiones, almacenaje y seguro; es el número real para comparar entre instituciones. "15 % al mes" suena poco, pero equivale a 180 % al año antes de comisiones.
3. El vencimiento: fecha límite para pagar o refrendar. Pasada, la pieza puede ir a venta.
4. El refrendo: pagar para que la pieza siga guardada otro periodo. Cubre solo intereses y gastos: la deuda original no baja un peso. Hay instituciones que limitan el número de refrendos (por ejemplo, 3) y otras que no.

## 4. Tasas y costos reales del mercado (datos públicos, orientativos)
- No existe en México una ley federal que tope la tasa de interés de las casas de empeño. Solo es obligatorio informar el CAT (NOM-179-SCFI-2016). Hay iniciativas legislativas para poner tope, pero ninguna aprobada.
- Rango de CAT observado: las instituciones de asistencia privada (IAP, sin fines de lucro) suelen estar entre 69 % y 120 % anual; las casas de empeño comerciales van de 144 % hasta 278 % anual. Una brecha de hasta 4 veces por el mismo servicio.
- En tasa mensual, el rango típico que reporta CONDUSEF va de 4 % a 12 % mensual; hay instituciones arriba de eso.
- Algunas cobran interés por mes completo aunque pagues antes; otras por día. Conviene preguntar.
- Comparación con otros créditos (CAT anual aproximado): tarjeta de crédito 37 %–97 %; crédito de nómina 24 %–33 %; prestamista informal 120 %–300 % o más. El empeño en una IAP puede costar menos que una tarjeta; en una comercial, bastante más.
- Regla para comparar: pedir siempre el CAT, no solo la tasa. PROFECO y CONDUSEF recomiendan comparar al menos tres instituciones antes de decidir.

## 5. Derechos de la persona que empeña (PROFECO / NOM-179)
- Toda casa de empeño debe estar inscrita en el Registro Público de Casas de Empeño de PROFECO y usar un contrato de adhesión autorizado. Se puede verificar en rpce.profeco.gob.mx.
- La boleta/contrato debe incluir: avalúo, monto prestado, tasa, CAT, comisiones, plazo, condiciones de refrendo y qué pasa si no se recupera la pieza.
- Derecho de demasía (remanente): si la pieza se vende en más de lo que se debía, la diferencia es de la persona. Se reclama en la sucursal con la boleta original e identificación, hasta un año después de la venta. La mayoría no lo reclama porque no lo sabe.
- Desempeño extemporáneo: en muchas instituciones se puede recuperar la pieza después del vencimiento, pagando una penalización, mientras no se haya vendido. Preguntar cuánto dura ese periodo.
- La institución debe conservar la pieza en las condiciones en que la recibió, sin usarla.
- Las básculas deben tener holograma de verificación de PROFECO visible.
- Quejas: la autoridad para casas de empeño es PROFECO (no CONDUSEF). Se presentan en profeco.gob.mx (queja en línea) o al Teléfono del Consumidor 55 5568 8722 / 800 468 8722, con boleta y comprobantes. CONDUSEF publica orientación, pero no regula ni sanciona a las casas de empeño. El sitio rpce.profeco.gob.mx sirve para verificar si una casa está registrada, no para quejas.

## 6. Traspaso de boleta / mover el empeño
- Consiste en que otra institución o un tercero liquide lo que se debe en la casa de empeño actual y la pieza quede bajo mejores condiciones (por ejemplo, menor tasa o mayor préstamo).
- Solo conviene si la evaluación es favorable: se compara costo total actual vs. costo total en la nueva opción, incluyendo lo que cuesta liquidar hoy. A veces no conviene moverse, y CAP & Co. lo dice.
- Precaución importante: existen intermediarios informales ("coyotes") afuera de sucursales y en redes que ofrecen cantidades mínimas por boletas. Nunca entregar la boleta ni la INE a desconocidos. CAP & Co. no compra boletas en este chat ni pide documentos aquí.
- El análisis real de un traspaso requiere ver la boleta: eso se hace por WhatsApp.

## 7. Glosario (NOM-179-SCFI-2016, en lenguaje simple)
- Avalúo: valoración de la pieza hecha por un valuador frente a la persona.
- Boleta de empeño: el contrato que ampara el préstamo. Debe traer avalúo, monto, tasa, plazo y condiciones de refrendo.
- CAT: costo anual total del financiamiento, con todo incluido. El número para comparar.
- Comercialización / remate: venta de la pieza cuando venció el plazo sin pago.
- Demasía / remanente: dinero que le toca a la persona si su pieza se vendió en más de lo que debía.
- Desempeño: recuperar la pieza pagando préstamo más intereses.
- Desempeño extemporáneo: recuperarla después del plazo, con penalización, mientras no se haya vendido.
- Interés: porcentaje sobre el préstamo por el tiempo transcurrido. No puede cobrarse interés sobre interés.
- Plazo: tiempo para pagar o refrendar; empieza en la fecha de firma.
- Préstamo o principal: el dinero entregado; no incluye intereses ni comisiones.
- Prenda: la pieza dejada en garantía.
- Refrendo: pagar solo intereses y gastos para obtener un nuevo plazo. No baja el capital.
- Traspaso de boleta: que un tercero liquide la deuda y la pieza pase a mejores condiciones.

## 8. Preguntas frecuentes (provisional)
- ¿Cobran por la asesoría? La orientación por WhatsApp no tiene costo.
- ¿Tengo que llevar mi pieza? No. CAP & Co. no recibe piezas. Se trabaja con la boleta.
- ¿Me prestan dinero? No. CAP & Co. asesora y compara; no presta.
- ¿Qué pasa si ya venció mi boleta? Depende de la institución: muchas tienen periodo de gracia y desempeño extemporáneo. Lo primero es confirmar si la pieza ya se vendió o no. Si ya se vendió por más de lo que debía, puede reclamar la demasía.
- ¿Cómo sé si mi casa de empeño es legal? Buscarla en rpce.profeco.gob.mx.
- ¿Qué necesito para que revisen mi caso? Una foto legible de la boleta, enviada por WhatsApp.
- ¿Es seguro? La situación de cada persona es confidencial. No se piden datos personales en este chat.

## 9. Contexto del sector (por si preguntan)
- Entre 13 y 35 millones de personas en México usan el empeño cada año; hay entre 7,600 y 10,500 casas de empeño.
- Motivos más comunes: gastos del hogar, salud, emergencias, educación. Préstamo promedio entre 1,000 y 1,600 pesos.
- Entre 70 % y 80 % de las personas sí recuperan su pieza.
- No existe hoy un comparador público y actualizado de casas de empeño; CONDUSEF descontinuó el suyo. Por eso comparar es difícil sin ayuda.
`.trim();
