// Base de conocimiento del chatbot. Texto FIJO: cualquier cambio invalida el caché
// de prompt, así que no meter fechas ni valores dinámicos aquí.
//
// CONTENIDO PROVISIONAL. Fuentes: doc 04 "El Mundo del Empeño" (investigación interna,
// julio 2026, basada en PROFECO, CONDUSEF, NOM-179-SCFI-2016 y prensa) y el texto actual
// de la página. Cuando Ricardo entregue el contenido real del negocio, reemplazar las
// secciones "Qué hace CAP & Co." y "Preguntas frecuentes" con sus datos.
//
// PENDIENTE DEL CLIENTE: datos del taller de restauración (nombre, servicios, costos,
// tiempos, zona). Mientras no lleguen, el bot solo dice que el taller existe y lleva a cita.
//
// Regla editorial: las cifras por institución viven en casas-datos.js (con fuente y fecha)
// y salen por las herramientas comparar_casas / comparar_instituciones / cotizar_traspaso, no de este texto.

export const KNOWLEDGE = `
# BASE DE CONOCIMIENTO — CAP & Co.

## 1. Qué es CAP & Co. y qué hace
- CAP & Co. significa Casa de Asesoramiento Prendario. Es un servicio de ASESORÍA sobre empeños en México (Ciudad de México y alrededores), operado en línea: página web y WhatsApp. No hay sucursal.
- Contacto: WhatsApp, de lunes a viernes de 9:00 a 17:00, y el correo contacto@casa-ap.com.
- Qué SÍ hace: revisar la boleta de empeño de una persona; explicarle tasa, CAT, plazo, refrendo y costo total en lenguaje claro; calcular cuánto va a terminar pagando; comparar su situación contra otras opciones reales del mercado; y, si le conviene moverse a una opción mejor, acompañarla en el traspaso paso a paso. Si no le conviene moverse, también se lo dice.
- Qué NO hace: NO presta dinero. NO recibe piezas en empeño. NO compra joyas ni boletas. NO es casa de empeño. NO da asesoría legal ni fiscal personalizada (para eso están PROFECO y un abogado).
- Restauración: CAP & Co. trabaja con un taller de joyería para restaurar piezas (ver sección 13).
- Costo: CAP & Co. no le cobra nada a la persona, ni por revisar la boleta ni por acompañarla en el cambio. Las casas de empeño le pagan a CAP & Co. una tarifa solo cuando alguien se cambia con ellas, y la recomendación se hace solo por los números de la persona. Aunque CAP & Co. solo gana si la persona se cambia, si el ahorro no es claro (al menos $500 o 5 %), se le dice que no conviene.
- En este chat la persona puede subir una foto de su boleta (botón de la cámara) y recibe un análisis completo: qué dice, cuánto debe hoy y qué le conviene. La foto no se guarda. Para operar un cambio de boleta, la identidad y la boleta original se validan en la cita presencial.
- Discreción: la situación de cada persona y sus piezas son asunto suyo. No se piden datos personales en este chat.
- Artículos sobre los que más se asesora: alhajas, oro, diamantes y relojes. También puede orientar en términos generales sobre electrónicos y otros bienes.

## 2. Cómo funciona el empeño en México (lo básico)
- Empeñar es un préstamo garantizado con un bien. La persona entrega la pieza, recibe dinero y firma una boleta (legalmente, un contrato de "mutuo con interés y garantía prendaria").
- Avalúo: un valuador estima el valor de reventa de la pieza (no lo que costó). El préstamo es un porcentaje de ese avalúo: en el mercado va desde 25 % hasta casi 100 % en joyas de oro según la institución; lo común es 40 %–60 %.
- Requisito básico: identificación oficial vigente (INE). No se revisa buró de crédito: la garantía es la pieza.
- Plazo típico: 1, 3, 5 o 6 meses según la institución. El plazo corre desde la fecha de firma.
- Al vencer: (a) desempeño = pagar préstamo + intereses y recuperar la pieza; (b) refrendo = pagar solo los intereses para ganar otro plazo; (c) si no se paga, suele haber un periodo de gracia y luego la pieza pasa a venta (remate / "comercialización").
- Los intereses no pueden capitalizarse por acuerdo previo (no se pacta de antemano cobrar interés sobre interés) y la tasa no puede cambiar durante la vigencia del contrato.

## 3. Los cuatro datos que determinan cuánto se paga
1. El préstamo: lo que dieron en la mano. Es el punto de partida de la deuda, no la deuda final.
2. La tasa y el CAT: la tasa es el interés mensual. El CAT (Costo Anual Total) suma la tasa más comisiones, almacenaje y seguro; es el número real para comparar entre instituciones. "15 % al mes" suena poco, pero equivale a 180 % al año antes de comisiones.
3. El vencimiento: fecha límite para pagar o refrendar. Pasada, la pieza puede ir a venta.
4. El refrendo: pagar para que la pieza siga guardada otro periodo. Cubre solo intereses y gastos: la deuda original no baja un peso. Hay instituciones que limitan el número de refrendos (por ejemplo, 3) y otras que no.

## 4. Tasas y costos reales del mercado (datos públicos, orientativos)
- No existe en México una ley federal que tope la tasa de interés de las casas de empeño. Solo es obligatorio informar el CAT (NOM-179-SCFI-2016). Hay iniciativas legislativas para poner tope, pero ninguna aprobada.
- Rango de CAT publicado: según la casa y el plan, va de cerca de 52 % hasta más de 240 % anual (las cifras de cada casa, con su fecha, salen de comparar_instituciones). Una brecha de varias veces por el mismo servicio.
- En tasa mensual, el rango típico que reporta CONDUSEF va de 4 % a 12 % mensual; hay instituciones arriba de eso.
- Algunas cobran interés por mes completo aunque pagues antes; otras por día. Conviene preguntar.
- Comparación con otros créditos (CAT anual aproximado): tarjeta de crédito 37 %–97 %; crédito de nómina 24 %–33 %; prestamista informal 120 %–300 % o más. El empeño en una IAP puede costar menos que una tarjeta; en una comercial, bastante más.
- Regla para comparar: pedir siempre el CAT, no solo la tasa. PROFECO y CONDUSEF recomiendan comparar al menos tres instituciones antes de decidir.

## 5. Derechos de la persona que empeña (PROFECO / NOM-179)
- Toda casa de empeño debe estar inscrita en el Registro Público de Casas de Empeño de PROFECO y usar un contrato de adhesión autorizado. Se puede verificar en rpce.profeco.gob.mx.
- La boleta/contrato debe incluir: avalúo, monto prestado, tasa, CAT, comisiones, plazo, condiciones de refrendo y qué pasa si no se recupera la pieza.
- Derecho de demasía (remanente): si la pieza se vende en más de lo que se debía, la diferencia es de la persona. Se reclama en la sucursal con la boleta original e identificación, en el plazo que marque el contrato (suele ser de meses a un año: hay que revisarlo en la boleta). La mayoría no lo reclama porque no lo sabe.
- Desempeño extemporáneo: en muchas instituciones se puede recuperar la pieza después del vencimiento, pagando una penalización, mientras no se haya vendido. Preguntar cuánto dura ese periodo.
- La institución debe conservar la pieza en las condiciones en que la recibió, sin usarla.
- Las básculas deben tener holograma de verificación de PROFECO visible.
- Quejas: la autoridad para casas de empeño es PROFECO (no CONDUSEF). Se presentan en profeco.gob.mx (queja en línea) o al Teléfono del Consumidor 55 5568 8722 / 800 468 8722, con boleta y comprobantes. CONDUSEF publica orientación, pero no regula ni sanciona a las casas de empeño. El sitio rpce.profeco.gob.mx sirve para verificar si una casa está registrada, no para quejas.

## 6. Traspaso de boleta / mover el empeño
- CAP & Co. compara casas de empeño con nombre, con las tasas que cada una publica y el porcentaje que presta sobre el valor del metal (herramientas comparar_casas y comparar_instituciones), y recomienda según lo que le importa a la persona: pagar menos o recibir más dinero. Si conviene cambiar la boleta, cotizar_traspaso calcula el ahorro y un asesor puede acompañar el cambio.
- Si la cotización no avanza, la persona ya tiene el mejor trato posible del mercado por ahora: se le dice así, se le recomienda continuar con sus pagos y se le ofrece volver a revisar si cambian sus condiciones.
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
- Interés: porcentaje sobre el préstamo por el tiempo transcurrido; según el contrato se cobra por día, semana o mes.
- Plazo: tiempo para pagar o refrendar; empieza en la fecha de firma.
- Préstamo o principal: el dinero entregado; no incluye intereses ni comisiones.
- Prenda: la pieza dejada en garantía.
- Refrendo: pagar solo intereses y gastos para obtener un nuevo plazo. No baja el capital.
- Traspaso de boleta: que un tercero liquide la deuda y la pieza pase a mejores condiciones.

## 8. Preguntas frecuentes (provisional)
- ¿Cobran por la asesoría? No. Revisar la boleta y acompañar el cambio no le cuestan nada a la persona. CAP & Co. recibe una tarifa de la casa de empeño solo si la persona se cambia.
- ¿Tengo que llevar mi pieza? No. CAP & Co. no recibe piezas. Se trabaja con la boleta.
- ¿Me prestan dinero? No. CAP & Co. asesora y compara; no presta.
- ¿Qué pasa si ya venció mi boleta? Depende de la institución: muchas tienen periodo de gracia y desempeño extemporáneo. Lo primero es confirmar si la pieza ya se vendió o no. Si ya se vendió por más de lo que debía, puede reclamar la demasía.
- ¿Cómo sé si mi casa de empeño es legal? Buscarla en rpce.profeco.gob.mx.
- ¿Qué necesito para que revisen mi caso? Una foto legible de la boleta, enviada por WhatsApp.
- ¿Es seguro? La situación de cada persona es confidencial. No se piden datos personales en este chat.

## 9. Boleta de ejemplo (para simular y enseñar a leerla)
Una boleta típica trae estos campos. Úsala para recorrerla con la persona o para armar un ejemplo con sus números:
- Folio / número de contrato: identificador del empeño. Sirve para reclamar, refrendar o desempeñar.
- Fecha de empeño: cuándo se firmó. Desde aquí corre el plazo.
- Descripción de la prenda: qué dejó (ej. "anillo oro 14k, 5.2 g"). Conviene que sea precisa: si está vaga, es difícil reclamar después.
- Avalúo: lo que el valuador dice que vale para reventa (ej. $6,000).
- Préstamo / principal: lo que le dieron (ej. $3,000 = 50 % del avalúo).
- Tasa de interés mensual (ej. 8 %) y CAT anual (ej. 145 % sin IVA). Si solo aparece uno, pedir el otro.
- Plazo / fecha de vencimiento (ej. 4 meses: vence el día X). En esa fecha hay que desempeñar o refrendar.
- Condiciones de refrendo: cuántos permite, cuánto cuesta cada uno (normalmente solo los intereses del periodo) y hasta cuándo.
- Comisiones / almacenaje / seguro: cargos extra que no siempre se ven a simple vista; entran en el CAT.
- Periodo de gracia y desempeño extemporáneo: cuántos días después del vencimiento todavía se puede recuperar y con qué recargo.
- Qué pasa si no paga: la pieza pasa a venta; si se vende en más de lo que debía, la diferencia (demasía) es de la persona.
Ejemplo completo para simular: préstamo $3,000, tasa 8 % mensual, plazo 4 meses, 0 refrendos. Interés por mes $240; a los 4 meses debe $3,960 para desempeñar. Si solo refrenda al vencer, paga $960 y vuelve a deber $3,000 por otro plazo.

## 10. Cómo explicar los conceptos como a alguien de 12 años (analogías probadas)
- Empeño: "Es como dejar tu bici en una tienda a cambio de dinero prestado. Si regresas a tiempo con el dinero más una propina por el favor, te devuelven la bici. Si no, la tienda la vende."
- Avalúo vs. préstamo: "El avalúo es cuánto creen que vale tu bici. El préstamo es lo que te dan, que es menos, por si luego la tienen que vender rápido."
- Tasa mensual: "Es la renta que pagas cada mes por usar ese dinero. 8 % de 3,000 son 240 pesos al mes: eso cuesta tener el dinero un mes."
- CAT: "Es el precio total del préstamo en un año, con todo incluido: la renta de cada mes más los cobros chiquitos (comisión, guardar la pieza, seguro). Por eso dos lugares con la misma tasa pueden tener CAT distinto."
- Refrendo: "Es pagar la renta del mes para que te sigan guardando la bici, pero la bici sigue sin ser tuya: lo que debes no baja nada."
- Desempeño: "Es pagar todo lo que debes y llevarte tu bici."
- Plazo y vencimiento: "Es la fecha límite. Como cuando rentas una película: si te pasas, hay recargo, y si te pasas mucho, la pierdes."
- Demasía: "Si la tienda vende tu bici en más de lo que debías, la diferencia es tuya y te la tienen que dar si la pides."
- Traspaso de boleta: "Es como cambiar de tienda: alguien paga lo que debes en la tienda cara, tu bici pasa a una tienda más barata, y desde ese día pagas menos renta."
- IAP vs. comercial: "Unas son como fundaciones: no buscan ganar, por eso cobran menos renta. Otras son negocios: cobran más porque viven de eso."

## 11. Cómo comparar dos opciones (método que usa CAP & Co.)
1. Sacar el costo total de quedarse: lo que debe hoy + intereses de los meses que le faltan en su tasa actual.
2. Sacar el costo total de moverse: lo que cuesta liquidar hoy (capital + intereses pendientes + penalización si la hay) + intereses de los meses que le faltan en la tasa nueva.
3. La diferencia es el ahorro. Conviene si el ahorro es claro (como regla práctica, más de 5 % del costo total o más de 500 pesos) y si la persona de verdad va a necesitar esos meses. Si le faltan pocos días para desempeñar, casi nunca conviene moverse.
4. Siempre decir también lo que NO se ve en la tasa: comisiones, almacenaje, seguro, número de refrendos permitidos y periodo de gracia.
5. Tasas de referencia del rango bajo del mercado para comparar (orientativas, no promesa): 3 %–4 % mensual en IAP; 5 %–6 % en comerciales baratas. Rango alto: 8 %–12 % mensual o más.

## 12. Valor de metales, piedras y relojes (cómo se calcula; sin precios del día)
- CAP & Co. toma una fotografía del precio internacional de oro, plata, platino y paladio dos veces al día entre semana (mañana y tarde, hora de la Ciudad de México) y lo convierte a pesos por gramo con el tipo de cambio de referencia. Así una misma evaluación no cambia a cada minuto. Las herramientas precio_metales y estimar_valor_metal dan esas cifras con su fecha y hora. Es un precio de referencia: el valuador de cada institución usa el suyo y presta solo un porcentaje.
- Oro: el valor depende del peso en gramos, la pureza (kilates) y el precio del gramo de oro puro ese día. Fórmula: gramos × pureza × precio del gramo de oro puro. La casa de empeño presta solo un porcentaje de ese valor (comúnmente 40 %–60 %, en algunas IAP hasta cerca de 100 % en oro).
- Pureza del oro por kilate: 10k = 41.7 %; 14k = 58.5 %; 18k = 75 %; 22k = 91.7 %; 24k = 99.9 %. El kilataje suele venir grabado en la pieza (10K, 14K, 18K o 417, 585, 750).
- Plata: la de joyería fina es Ley .925 (92.5 % pura). Vale mucho menos por gramo que el oro, así que el préstamo por plata es bajo.
- Platino: se valúa igual que el oro, por peso y pureza (suele venir marcado 950 o PT).
- Diamantes: se valúan por las "4C": peso en quilates (carat), corte, claridad y color. Un certificado (GIA, IGI, HRD) no es obligatorio, pero agiliza y puede mejorar la oferta. Sin certificado, muchas instituciones pagan poco o nada por la piedra y valúan solo el metal.
- Otras piedras (esmeraldas, rubíes, zafiros): su valor varía mucho por calidad; muchas casas de empeño las valúan bajo o no las consideran.
- Relojes: se valúan por marca, modelo, estado, que funcione y que tenga caja, papeles o factura. Relojes de lujo se aceptan en instituciones específicas.
- Un buen estado de la pieza (limpia, completa, broches firmes) ayuda en el avalúo.

## 13. Taller de restauración
- CAP & Co. trabaja con un taller de joyería de confianza para restaurar piezas antes de empeñarlas o para recuperarlas después.
- Costos, tiempos y servicios dependen de la pieza y se cotizan con un asesor en cita presencial. No hay precios de restauración en este chat.
- Si la persona quiere restaurar una pieza, se ofrece la cita (perfil restauracion).

## 14. Contexto del sector (por si preguntan)
- Entre 13 y 35 millones de personas en México usan el empeño cada año; hay entre 7,600 y 10,500 casas de empeño.
- Motivos más comunes: gastos del hogar, salud, emergencias, educación. Préstamo promedio entre 1,000 y 1,600 pesos.
- Entre 70 % y 80 % de las personas sí recuperan su pieza.
- No existe hoy un comparador público y actualizado de casas de empeño; CONDUSEF descontinuó el suyo. Por eso comparar es difícil sin ayuda.
`.trim();
