"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Una operación prendaria en 3D para "¿Quiénes somos?". Al entrar en pantalla:
//   1. un anillo de oro cae en el platillo izquierdo de una balanza de joyero y la inclina (avalúo);
//   2. caen monedas en el otro platillo hasta equilibrarla (el préstamo que corresponde a la pieza);
//   3. aparece la boleta de empeño, una lupa la recorre y le cae el sello "Revisada" (lo que hace CAP & Co.).
// Después queda en reposo: la balanza oscila apenas y la lupa sigue revisando. Con "reducir movimiento"
// se muestra la escena final, quieta.

const ESMERALDA = "#14402F";
const ORO = "#C8A24B";
const GRANATE = "#A32638";
const PAPEL = "#FBF7EC";

// Línea de tiempo (segundos desde que la escena entra en pantalla).
const T_ANILLO = 0.2; // empieza a caer el anillo
const DUR_CAIDA = 0.8;
const T_MONEDAS = 1.4; // primera moneda
const ENTRE_MONEDAS = 0.28;
const MONEDAS = 7;
const T_BOLETA = T_MONEDAS + MONEDAS * ENTRE_MONEDAS + 0.2;
const T_LUPA = T_BOLETA + 0.6;
const T_SELLO = T_LUPA + 2.2;
const FINAL = 99;

// Balanza
const PIVOTE = new THREE.Vector3(-0.36, 0.3, 0);
const BRAZO = 0.6; // media longitud del brazo
const CUERDA = 0.62; // del extremo del brazo al platillo
const INCLINACION_MAX = 0.32; // rad, con el anillo solo

const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
// La curva de la marca (DESIGN.md): ease-out-expo, sin rebotes.
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

// Boleta dibujada en un canvas: encabezado, datos con líneas y cifras genéricas de ejemplo.
// Se dibuja al doble de detalle que se ve (la lupa la aumenta) y sirve a dos texturas que comparten
// el mismo lienzo: la hoja y lo que se ve a través de la lupa. Cuando cae el sello, se estampa en el
// papel, así la lupa también lo muestra aumentado al pasar encima.
const HOJA = { ancho: 1.4, alto: 0.92 }; // medidas de la boleta en la escena
const LENTE = { radio: 0.2, aumento: 1.6 };
const SELLO = { x: 0.45, y: -0.24, lado: 0.46, giro: -0.25 }; // en coordenadas de la boleta
const ESCALA_LIENZO = 1.6; // se dibuja en 640×420 y se guarda a 1024×672

function lienzoSello() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  g.strokeStyle = ESMERALDA;
  g.fillStyle = ESMERALDA;
  g.lineWidth = 10;
  g.beginPath();
  g.arc(128, 128, 112, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 3;
  g.beginPath();
  g.arc(128, 128, 94, 0, Math.PI * 2);
  g.stroke();
  g.textAlign = "center";
  g.font = "700 38px Helvetica, Arial, sans-serif";
  g.fillText("REVISADA", 128, 122);
  g.font = "600 24px Helvetica, Arial, sans-serif";
  g.fillText("CAP & Co.", 128, 162);
  return c;
}

function crearBoleta() {
  const c = document.createElement("canvas");
  c.width = 640 * ESCALA_LIENZO;
  c.height = 420 * ESCALA_LIENZO;
  const g = c.getContext("2d");
  g.scale(ESCALA_LIENZO, ESCALA_LIENZO);
  g.fillStyle = PAPEL;
  g.fillRect(0, 0, 640, 420);
  g.strokeStyle = GRANATE;
  g.lineWidth = 6;
  g.strokeRect(14, 14, 640 - 28, 420 - 28);
  g.lineWidth = 1.5;
  g.strokeRect(24, 24, 640 - 48, 420 - 48);
  g.fillStyle = GRANATE;
  g.font = "600 34px Georgia, serif";
  g.textAlign = "center";
  g.fillText("BOLETA DE EMPEÑO", 320, 78);
  g.font = "20px Helvetica, Arial, sans-serif";
  g.fillStyle = "#6B5A3A";
  g.fillText("Contrato de mutuo con interés y garantía prendaria", 320, 108);
  const filas = [
    // Mismo caso que la boleta que se explica más abajo en la página (components/Boleta.js).
    ["Prenda", "Anillo de oro 14k"],
    ["Avalúo", "$2,900.00"],
    ["Préstamo", "$2,000.00"],
    ["Tasa mensual", "8.0 % · CAT 187 %"],
    ["Vence", "15 · AGO · 2026"],
  ];
  g.textAlign = "left";
  filas.forEach(([k, v], i) => {
    const y = 160 + i * 46;
    g.fillStyle = "#6B5A3A";
    g.font = "20px Helvetica, Arial, sans-serif";
    g.fillText(k, 56, y);
    g.fillStyle = ESMERALDA;
    g.font = "600 22px Helvetica, Arial, sans-serif";
    g.fillText(v, 250, y);
    g.strokeStyle = "rgba(107,90,58,0.25)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(56, y + 14);
    g.lineTo(640 - 56, y + 14);
    g.stroke();
  });

  const hoja = new THREE.CanvasTexture(c);
  hoja.colorSpace = THREE.SRGBColorSpace;
  hoja.anisotropy = 4;
  const lente = hoja.clone();
  lente.needsUpdate = true;
  lente.repeat.set(
    (2 * LENTE.radio) / HOJA.ancho / LENTE.aumento,
    (2 * LENTE.radio) / HOJA.alto / LENTE.aumento,
  );
  const selloLienzo = lienzoSello();
  const sello = new THREE.CanvasTexture(selloLienzo);
  sello.colorSpace = THREE.SRGBColorSpace;

  let estampada = false;
  function estampar() {
    if (estampada) return;
    estampada = true;
    const lado = (SELLO.lado / HOJA.ancho) * 640;
    g.save();
    g.translate((SELLO.x / HOJA.ancho + 0.5) * 640, (0.5 - SELLO.y / HOJA.alto) * 420);
    g.rotate(-SELLO.giro);
    g.globalAlpha = 0.85;
    g.drawImage(selloLienzo, -lado / 2, -lado / 2, lado, lado);
    g.restore();
    hoja.needsUpdate = true;
    lente.needsUpdate = true;
  }
  // Centra lo que muestra la lupa en el punto de la boleta que tiene debajo.
  function enfocar(x, y) {
    lente.offset.set(x / HOJA.ancho + 0.5 - lente.repeat.x / 2, y / HOJA.alto + 0.5 - lente.repeat.y / 2);
  }
  return { hoja, lente, sello, estampar, enfocar };
}

// Coloca un cilindro delgado entre dos puntos (cuerdas de la balanza).
const EJE_Y = new THREE.Vector3(0, 1, 0);
function entre(mesh, a, b) {
  const d = new THREE.Vector3().subVectors(b, a);
  mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.scale.set(1, d.length(), 1);
  mesh.quaternion.setFromUnitVectors(EJE_Y, d.normalize());
}

function Escena({ activo, animar, puntero }) {
  const invalidate = useThree((s) => s.invalidate);
  const tRef = useRef(animar ? 0 : FINAL);
  useLayoutEffect(() => {
    if (!animar) {
      tRef.current = FINAL;
      invalidate();
    }
  }, [animar, invalidate]);

  const todo = useRef();
  const brazo = useRef();
  const platoIzq = useRef();
  const platoDer = useRef();
  const cuerdas = useRef([]);
  const anillo = useRef();
  const monedas = useRef([]);
  const boleta = useRef();
  const lupa = useRef();
  const sello = useRef();

  const boletaTex = useMemo(() => crearBoleta(), []);
  const recursos = useMemo(() => {
    const r = {
      verde: new THREE.MeshStandardMaterial({ color: ESMERALDA, roughness: 0.5, metalness: 0.05 }),
      oro: new THREE.MeshStandardMaterial({ color: ORO, roughness: 0.38, metalness: 0.1 }),
      oroFacetado: new THREE.MeshStandardMaterial({ color: ORO, roughness: 0.38, metalness: 0.1, flatShading: true }),
      brillante: new THREE.MeshStandardMaterial({ color: "#EDDEC5", roughness: 0.2, metalness: 0.05, flatShading: true }),
      // La lupa muestra la boleta aumentada (opaca: se ve "a través" sin que la transparencia tape nada).
      aumento: new THREE.MeshStandardMaterial({ map: boletaTex.lente, roughness: 0.9 }),
      brilloVidrio: new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.1, depthWrite: false }),
      papel: new THREE.MeshStandardMaterial({ map: boletaTex.hoja, roughness: 0.9 }),
      sello: new THREE.MeshBasicMaterial({ map: boletaTex.sello, transparent: true, opacity: 0.85, depthWrite: false }),
      base: new THREE.CylinderGeometry(0.42, 0.48, 0.08, 48),
      poste: new THREE.CylinderGeometry(0.035, 0.045, 1.2, 16),
      remate: new THREE.SphereGeometry(0.06, 20, 16),
      barra: new THREE.BoxGeometry(BRAZO * 2 + 0.06, 0.045, 0.045),
      plato: new THREE.CylinderGeometry(0.26, 0.19, 0.04, 40),
      cuerda: new THREE.CylinderGeometry(0.006, 0.006, 1, 6),
      aro: new THREE.TorusGeometry(0.15, 0.028, 16, 48),
      corona: new THREE.CylinderGeometry(0.06, 0.095, 0.05, 8),
      pabellon: new THREE.ConeGeometry(0.095, 0.1, 8),
      moneda: new THREE.CylinderGeometry(0.13, 0.13, 0.034, 36),
      hoja: new THREE.BoxGeometry(HOJA.ancho, HOJA.alto, 0.012),
      lente: new THREE.CircleGeometry(LENTE.radio, 48),
      reflejo: new THREE.CircleGeometry(LENTE.radio * 0.55, 32, Math.PI * 0.55, Math.PI * 0.5),
      borde: new THREE.TorusGeometry(0.2, 0.022, 12, 48),
      mango: new THREE.CylinderGeometry(0.025, 0.032, 0.34, 12),
      marca: new THREE.PlaneGeometry(SELLO.lado, SELLO.lado),
    };
    return r;
  }, []);

  useEffect(
    () => () => {
      [boletaTex.hoja, boletaTex.lente, boletaTex.sello].forEach((x) => x.dispose());
      Object.values(recursos).forEach((x) => x.dispose?.());
    },
    [recursos, boletaTex],
  );

  const pivote = PIVOTE;
  const tmpA = useMemo(() => new THREE.Vector3(), []);
  const tmpB = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, delta) => {
    if (activo && tRef.current < FINAL) tRef.current += delta;
    const t = tRef.current;
    const reloj = animar ? clock.elapsedTime : 0;

    // Anillo: cae con rebote en el platillo izquierdo.
    const caida = easeOutExpo(clamp01((t - T_ANILLO) / DUR_CAIDA));
    const anilloPuesto = t >= T_ANILLO + DUR_CAIDA * 0.35;
    // Monedas visibles y cuánto pesan contra el anillo.
    const nMonedas = Math.min(MONEDAS, Math.max(0, Math.floor((t - T_MONEDAS) / ENTRE_MONEDAS) + 1));
    const pesoMonedas = nMonedas / MONEDAS;
    let angulo = anilloPuesto ? INCLINACION_MAX * (1 - pesoMonedas) : 0;
    if (animar && t >= T_BOLETA) angulo += Math.sin(reloj * 0.9) * 0.025; // respiración en reposo
    if (brazo.current) {
      // Amortigua el cambio de inclinación con un resorte suave.
      const actual = brazo.current.rotation.z;
      const k = t >= FINAL ? 1 : 1 - Math.exp(-6 * delta);
      brazo.current.rotation.z = actual + (angulo - actual) * k;
    }
    const a = brazo.current ? brazo.current.rotation.z : angulo;
    // Extremos del brazo (izquierdo baja con ángulo positivo).
    const izq = tmpA.set(pivote.x - Math.cos(a) * BRAZO, pivote.y - Math.sin(a) * BRAZO, 0);
    const der = tmpB.set(pivote.x + Math.cos(a) * BRAZO, pivote.y + Math.sin(a) * BRAZO, 0);
    const platoI = new THREE.Vector3(izq.x, izq.y - CUERDA, 0);
    const platoD = new THREE.Vector3(der.x, der.y - CUERDA, 0);
    platoIzq.current?.position.copy(platoI);
    platoDer.current?.position.copy(platoD);
    const cs = cuerdas.current;
    if (cs.length === 4) {
      entre(cs[0], izq, new THREE.Vector3(platoI.x - 0.24, platoI.y + 0.02, 0));
      entre(cs[1], izq, new THREE.Vector3(platoI.x + 0.24, platoI.y + 0.02, 0));
      entre(cs[2], der, new THREE.Vector3(platoD.x - 0.24, platoD.y + 0.02, 0));
      entre(cs[3], der, new THREE.Vector3(platoD.x + 0.24, platoD.y + 0.02, 0));
    }

    if (anillo.current) {
      const reposo = platoI.y + 0.19;
      anillo.current.position.set(platoI.x, THREE.MathUtils.lerp(reposo + 1.8, reposo, caida), 0);
      anillo.current.visible = t >= T_ANILLO;
      anillo.current.rotation.y = animar ? Math.sin(reloj * 0.7) * 0.6 : 0.4;
    }
    monedas.current.forEach((m, i) => {
      if (!m) return;
      const inicio = T_MONEDAS + i * ENTRE_MONEDAS;
      const p = easeOutCubic(clamp01((t - inicio) / 0.3));
      const y = platoD.y + 0.04 + i * 0.036;
      m.visible = t >= inicio;
      m.position.set(platoD.x + ((i * 37) % 5) * 0.006 - 0.012, THREE.MathUtils.lerp(y + 0.9, y, p), 0);
    });

    // Boleta: entra desde atrás y flota apenas.
    if (boleta.current) {
      const p = easeOutCubic(clamp01((t - T_BOLETA) / 0.9));
      boleta.current.visible = t >= T_BOLETA;
      boleta.current.position.set(
        THREE.MathUtils.lerp(1.3, 0.5, p),
        0.78 + (animar ? Math.sin(reloj * 0.8) * 0.03 : 0),
        THREE.MathUtils.lerp(-0.8, -0.4, p),
      );
      boleta.current.rotation.set(-0.1, THREE.MathUtils.lerp(-0.9, -0.28, p), 0.05);
    }
    // Lupa: recorre la boleta renglón por renglón.
    if (lupa.current) {
      const p = clamp01((t - T_LUPA) / 0.6);
      lupa.current.visible = t >= T_LUPA;
      const s = animar ? reloj : 2.2;
      // Coordenadas de la boleta (la lupa vive dentro de su grupo).
      const lx = Math.sin(s * 0.9) * 0.4;
      const ly = 0.04 + Math.cos(s * 0.45) * 0.2;
      lupa.current.position.set(lx, ly, 0.02);
      lupa.current.scale.setScalar(easeOutCubic(p));
      boletaTex.enfocar(lx, ly);
    }
    // Sello "Revisada": cae y se asienta sobre la boleta.
    if (sello.current) {
      const p = clamp01((t - T_SELLO) / 0.35);
      // Al asentarse, el sello pasa al papel: desde ahí la lupa lo aumenta como al resto de la boleta.
      if (p >= 1) boletaTex.estampar();
      sello.current.visible = t >= T_SELLO && p < 1;
      sello.current.scale.setScalar(THREE.MathUtils.lerp(1.8, 1, easeOutCubic(p)));
      sello.current.material.opacity = 0.85 * p;
    }

    // Todo el conjunto se inclina un poco hacia el mouse.
    if (animar && todo.current) {
      const k = 1 - Math.exp(-3 * delta);
      todo.current.rotation.y += (puntero.current.x * 0.14 - 0.12 - todo.current.rotation.y) * k;
      todo.current.rotation.x += (-puntero.current.y * 0.06 + 0.04 - todo.current.rotation.x) * k;
    }
  });

  const R = recursos;
  return (
    <group ref={todo} rotation={[0.04, -0.12, 0]} position={[0, -0.12, 0]}>
      {/* Balanza de joyero */}
      <mesh geometry={R.base} material={R.verde} position={[PIVOTE.x, PIVOTE.y - 1.26, 0]} />
      <mesh geometry={R.poste} material={R.verde} position={[PIVOTE.x, PIVOTE.y - 0.62, 0]} />
      <mesh geometry={R.remate} material={R.oro} position={[PIVOTE.x, PIVOTE.y + 0.06, 0]} />
      <group ref={brazo} position={[PIVOTE.x, PIVOTE.y, 0]}>
        <mesh geometry={R.barra} material={R.oro} />
      </group>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} ref={(m) => (cuerdas.current[i] = m)} geometry={R.cuerda} material={R.oro} />
      ))}
      <mesh ref={platoIzq} geometry={R.plato} material={R.oro} />
      <mesh ref={platoDer} geometry={R.plato} material={R.oro} />

      {/* La prenda: anillo con diamante */}
      <group ref={anillo} visible={false}>
        <mesh geometry={R.aro} material={R.oro} />
        <mesh geometry={R.corona} material={R.brillante} position={[0, 0.235, 0]} />
        <mesh geometry={R.pabellon} material={R.brillante} position={[0, 0.16, 0]} rotation={[Math.PI, 0, 0]} />
      </group>

      {/* El préstamo: monedas */}
      {Array.from({ length: MONEDAS }, (_, i) => (
        <mesh key={i} ref={(m) => (monedas.current[i] = m)} geometry={R.moneda} material={R.oroFacetado} visible={false} />
      ))}

      {/* La boleta, la lupa que la revisa y el sello */}
      <group ref={boleta} visible={false}>
        <mesh geometry={R.hoja} material={R.papel} />
        <group ref={lupa} visible={false}>
          <mesh geometry={R.lente} material={R.aumento} position={[0, 0, 0.03]} />
          <mesh geometry={R.reflejo} material={R.brilloVidrio} position={[0, 0, 0.034]} renderOrder={2} />
          <mesh geometry={R.borde} material={R.oro} position={[0, 0, 0.03]} />
          <mesh geometry={R.mango} material={R.verde} position={[0.23, -0.23, 0.03]} rotation={[0, 0, Math.PI / 4]} />
        </group>
        <mesh ref={sello} geometry={R.marca} material={R.sello} position={[SELLO.x, SELLO.y, 0.015]} rotation={[0, 0, SELLO.giro]} visible={false} />
      </group>
    </group>
  );
}

// Aleja la cámara lo necesario para que la escena completa quepa en el lienzo, sea angosto
// (columna de escritorio) o apaisado (celular).
const MEDIO_ANCHO = 1.3;
const MEDIO_ALTO = 1.32;
function CamaraAjustada() {
  const { camera, size, invalidate } = useThree();
  useLayoutEffect(() => {
    const aspecto = size.width / Math.max(size.height, 1);
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.z = Math.max(MEDIO_ALTO, MEDIO_ANCHO / aspecto) / tan + 0.25;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate]);
  return null;
}

export default function Empeno3D({ className = "" }) {
  const caja = useRef(null);
  const puntero = useRef({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [yaSeVio, setYaSeVio] = useState(false);
  // null hasta leer la preferencia de movimiento: el lienzo no se monta antes.
  const [animar, setAnimar] = useState(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setAnimar(!mq.matches);
    const onChange = () => setAnimar(!mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Arranca cuando la mitad de la escena está en pantalla; fuera de pantalla no dibuja (batería).
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting);
        if (e.intersectionRatio >= 0.45) setYaSeVio(true);
      },
      { threshold: [0, 0.45] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Solo con mouse: en el teléfono el dedo que hace scroll inclinaría la escena.
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    function mover(e) {
      if (e.pointerType === "touch") return;
      const r = caja.current?.getBoundingClientRect();
      if (!r) return;
      puntero.current = {
        x: Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)),
        y: Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1)),
      };
    }
    window.addEventListener("pointermove", mover, { passive: true });
    return () => window.removeEventListener("pointermove", mover);
  }, []);

  return (
    <div ref={caja} className={className} aria-hidden="true">
      {animar !== null && (
        <Canvas
          camera={{ position: [0, 0, 4.1], fov: 38 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
          style={{ pointerEvents: "none" }}
          frameloop={visible && animar ? "always" : "demand"}
        >
          <ambientLight intensity={0.85} />
          <directionalLight position={[3, 3.5, 4]} intensity={0.8} />
          <directionalLight position={[-3, -1.5, 2]} intensity={0.25} />
          <CamaraAjustada />
          <Escena activo={yaSeVio} animar={animar} puntero={puntero} />
        </Canvas>
      )}
    </div>
  );
}
