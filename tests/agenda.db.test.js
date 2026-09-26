import { test } from "node:test";
import assert from "node:assert/strict";

const URL = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL || "") ? process.env.DATABASE_URL : "";
const tel = () => `55${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;

test("agenda en la base: reserva atómica, cupo, teléfonos, reprogramación y etapa del lead", { skip: !URL && "sin base local" }, async () => {
  delete process.env.CITA_CAPACIDAD;
  const { reservar, disponibilidad, actualizarCita, expirarCitas } = await import("../lib/agenda/repo.js");
  const { crearLead, actualizarLead, resumenOperacion } = await import("../lib/leads/repo.js");
  const { query, cerrarPool } = await import("../lib/db/client.js");
  const creados = [];
  const nuevo = async () => {
    const l = await crearLead({ perfil: "quiere_traspaso", resumen: "prueba", fuente: {} });
    creados.push(l.codigo);
    return l.codigo;
  };
  const activas = async (codigo) =>
    (await query(`SELECT count(*)::int AS n FROM cita WHERE lead_codigo = $1 AND estado IN ('reservada','confirmada')`, [codigo])).rows[0].n;
  try {
    const [a, b, c] = [await nuevo(), await nuevo(), await nuevo()];
    const [ta, tb, tc] = [tel(), tel(), tel()];
    const libres = await disponibilidad();
    const [h1, h2, h3] = libres[0].horas.length >= 3 ? libres[0].horas : [...libres[0].horas, ...libres[1].horas];

    const ra = await reservar({ codigo: a, nombre: "Ana", telefono: ta, inicio: h1 });
    assert.equal(ra.ok, true);
    assert.deepEqual(await reservar({ codigo: b, nombre: "Beto", telefono: tb, inicio: h1 }), { ok: false, motivo: "ocupado" });
    const sinDatos = await query(`SELECT nombre, telefono FROM lead WHERE codigo = $1`, [b]);
    assert.equal(sinDatos.rows[0].nombre, null, "si no se apartó, tampoco se guardó el contacto");
    assert.ok(!(await disponibilidad()).flatMap((d) => d.horas).some((h) => h.getTime() === h1.getTime()), "ya no se ofrece");

    // QA #1: intentar cambiar a un horario ocupado no le quita la cita que tenía.
    assert.equal((await reservar({ codigo: b, nombre: "Beto", telefono: tb, inicio: h2 })).ok, true);
    assert.equal((await reservar({ codigo: a, nombre: "Ana", telefono: ta, inicio: h2 })).motivo, "ocupado");
    assert.equal(await activas(a), 1, "Ana conserva su cita");

    // QA #3: un código ajeno no cambia el teléfono; un teléfono no aparta dos casos.
    assert.equal((await reservar({ codigo: a, nombre: "Intruso", telefono: tc, inicio: h3 })).motivo, "otro_telefono");
    assert.equal((await reservar({ codigo: c, nombre: "Otra", telefono: ta, inicio: h3 })).motivo, "ya_tiene_cita");

    // Cupo por número de asesores.
    process.env.CITA_CAPACIDAD = "2";
    assert.equal((await reservar({ codigo: c, nombre: "Caro", telefono: tc, inicio: h1 })).ok, true, "con dos asesores caben dos");
    delete process.env.CITA_CAPACIDAD;

    // Reservas simultáneas del mismo lead: queda una sola activa.
    await Promise.all([
      reservar({ codigo: a, nombre: "Ana", telefono: ta, inicio: h3 }),
      reservar({ codigo: a, nombre: "Ana", telefono: ta, inicio: h3 }),
    ]);
    assert.equal(await activas(a), 1);

    // QA #5: reactivar una cita cancelada cuando el lead ya tiene otra activa responde con motivo, no error.
    const vieja = (await query(`SELECT id FROM cita WHERE lead_codigo = $1 AND estado = 'cancelada' AND inicio = $2 LIMIT 1`, [a, h1])).rows[0];
    await actualizarCita(ra.cita.id, {}); // no-op
    if (vieja) assert.equal((await actualizarCita(vieja.id, { estado: "reservada" })).motivo, "lead_con_otra_cita");

    // Milisegundos no se cuelan al cupo.
    assert.equal((await reservar({ codigo: b, nombre: "Beto", telefono: tb, inicio: new Date(h1.getTime() + 500) })).motivo, "horario_invalido");

    // Etapas: confirmar avanza; no asistió regresa; nunca revive un descartado.
    const citaA = (await query(`SELECT id FROM cita WHERE lead_codigo = $1 AND estado = 'reservada'`, [a])).rows[0];
    assert.equal((await actualizarCita(citaA.id, { estado: "confirmada", lugar: "Oficina Roma" })).ok, true);
    const etapa = async (codigo) => (await query(`SELECT etapa FROM lead WHERE codigo = $1`, [codigo])).rows[0].etapa;
    assert.equal(await etapa(a), "cita_confirmada");
    await actualizarCita(citaA.id, { estado: "no_asistio" });
    assert.equal(await etapa(a), "cita_solicitada");
    await actualizarLead(c, { etapa: "descartado" });
    const citaC = (await query(`SELECT id FROM cita WHERE lead_codigo = $1 AND estado = 'reservada'`, [c])).rows[0];
    await actualizarCita(citaC.id, { estado: "confirmada" });
    assert.equal(await etapa(c), "descartado");

    // Reprogramar desde el panel; una llamada se vuelve cita acordada.
    const d = await nuevo();
    const dia = (await import("../lib/agenda/horarios.js")).franjasPosibles()[1];
    const rl = await reservar({ codigo: d, nombre: "Dani", telefono: tel(), tipo: "llamada", fecha: dia.fecha, franja: "tarde" });
    assert.equal(rl.ok, true, JSON.stringify(rl));
    assert.equal(rl.cita.tipo, "llamada");
    await query(`UPDATE cita SET apartada_at = now() - interval '3 days', creado_at = now() - interval '3 days' WHERE id = $1`, [rl.cita.id]);
    const rp = await actualizarCita(rl.cita.id, { inicio: libres.at(-1).horas.at(-1).toISOString() });
    assert.equal(rp.ok, true);
    assert.equal(rp.cita.tipo, "cita");
    assert.equal(rp.cita.franja, null);
    assert.equal(rp.cita.estado, "confirmada", "acordada por teléfono = confirmada");
    assert.ok(Date.now() - new Date(rp.cita.apartada_at).getTime() < 60_000, "el reloj se reinicia");
    assert.equal(await etapa(d), "cita_confirmada");
    await expirarCitas();
    assert.equal(await activas(d), 1, "una cita acordada no expira sola");

    // Expiración de reservas no confirmadas a las 24 h.
    await query(`UPDATE cita SET apartada_at = now() - interval '5 days' WHERE lead_codigo = $1 AND estado = 'reservada'`, [b]);
    assert.ok((await expirarCitas()) >= 1);
    assert.equal(await activas(b), 0);

    // Comisión del mes por fecha de cobro.
    const antes = await resumenOperacion();
    const r = await actualizarLead(a, { etapa: "comision_cobrada", comision_mxn: "1500", casa_destino: "Montepío Luz Saviñón", asesor: "ana" });
    assert.equal(r.ok, true);
    assert.ok(r.lead.cerrado_at);
    assert.equal((await resumenOperacion()).comision_mes - antes.comision_mes, 1500);
    assert.equal((await actualizarLead(a, { comision_mxn: "-5" })).ok, false);
  } finally {
    for (const codigo of creados) await query(`DELETE FROM lead WHERE codigo = $1`, [codigo]);
    await cerrarPool();
  }
});

test("retención: 12 meses sin actividad; 5 años si se cobró comisión", { skip: !URL && "sin base local" }, async () => {
  const { crearLead, registrarContacto, anonimizarLeadsViejos } = await import("../lib/leads/repo.js");
  const { query, cerrarPool } = await import("../lib/db/client.js");
  const creados = [];
  try {
    for (const etapa of ["atendido", "comision_cobrada"]) {
      const l = await crearLead({ perfil: "curioso", resumen: "r", fuente: {} });
      creados.push(l.codigo);
      await registrarContacto({ codigo: l.codigo, nombre: "Viejo", telefono: tel() });
      await query(
        `UPDATE lead SET etapa = $2, created_at = now() - interval '2 years', actualizado_at = now() - interval '2 years',
                cobrado_at = CASE WHEN $2 = 'comision_cobrada' THEN now() - interval '2 years' END WHERE codigo = $1`,
        [l.codigo, etapa],
      );
    }
    await anonimizarLeadsViejos();
    const { rows } = await query(`SELECT etapa, nombre FROM lead WHERE codigo = ANY($1) ORDER BY etapa`, [creados]);
    assert.deepEqual(rows, [
      { etapa: "atendido", nombre: null },
      { etapa: "comision_cobrada", nombre: "Viejo" },
    ]);
  } finally {
    await query(`DELETE FROM lead WHERE codigo = ANY($1)`, [creados]);
    await cerrarPool();
  }
});
