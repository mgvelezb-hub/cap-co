"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// El rombo de la marca como gema 3D real (octaedro con Three.js): tiene caras,
// aristas y profundidad de verdad, no una silueta plana con truco de rotateY.
// Gira en el mismo eje horizontal que ya se aprobó para el logo plano.
//
// El "pop" de aparición (escala 0 -> 1) se anima DENTRO de Three.js, sobre la
// malla, no con transform:scale en CSS. Un contenedor con transform:scale(0)
// hace que getBoundingClientRect() devuelva 0x0, y R3F mide el lienzo con ese
// tamaño al montar; como ResizeObserver no dispara de nuevo solo por cambios
// de transform, el canvas se queda en 0x0 para siempre (por eso el rombo no
// aparecía nunca, solo "por accidente" cuando otro reflow —como el scroll—
// forzaba una remedición). El wrapper CSS de afuera ahora solo maneja opacity,
// que no afecta el tamaño medido.
const POP_DELAY = 3.15;
const POP_DURATION = 0.6;
const TARGET_SCALE = [0.82, 1, 0.82];

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function Gema({ girando }) {
  const ref = useRef();
  // El rombo se carga aparte (Gem3DDiferida): el retraso se cuenta desde que abrió la página, no
  // desde que llegó el código, para que no aparezca tarde y desfasado del trazo del logo en
  // conexiones lentas. Con "reducir movimiento" aparece sin animación.
  const yaTranscurrido = useMemo(() => performance.now() / 1000, []);
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const tiempo = clock.elapsedTime + yaTranscurrido;
    const t = girando ? Math.min(Math.max((tiempo - POP_DELAY) / POP_DURATION, 0), 1) : 1;
    const s = easeOutCubic(t);
    ref.current.scale.set(TARGET_SCALE[0] * s, TARGET_SCALE[1] * s, TARGET_SCALE[2] * s);
    if (girando && t >= 1) ref.current.rotation.y += delta * 1.1;
  });
  const geometry = useMemo(() => new THREE.OctahedronGeometry(1, 0), []);
  return (
    <mesh ref={ref} geometry={geometry} scale={[0, 0, 0]} rotation={[0, 0.4, 0]}>
      {/* Oro del rombo del PDF (mediana #B88F54, brillo hasta #EFDCAB). Metalness
          casi nulo a propósito: sin environment map, un material metálico solo
          refleja negro y el oro se ve marrón sucio. Con metalness bajo la luz
          modela las caras igual que hacía con el granate y el tono queda en la
          rampa dorada real de la ficha. */}
      <meshStandardMaterial color="#C8A24B" roughness={0.42} metalness={0.08} />
    </mesh>
  );
}

export default function Gem3D({ className = "" }) {
  // El fundido CSS (.gem-fade, 3.1 s) también se cuenta desde que abrió la página.
  const [retrasoCss] = useState(() => Math.max(0, 3.1 - performance.now() / 1000));
  const [girando, setGirando] = useState(true);
  // Fuera de pantalla no dibuja: al bajar a "¿Quiénes somos?" no quedan dos escenas 3D corriendo.
  const cajaRef = useRef(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = cajaRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setGirando(!mq.matches);
    const onChange = () => setGirando(!mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div ref={cajaRef} className={`gem-fade ${className}`} aria-hidden="true" style={{ animationDelay: `${retrasoCss}s` }}>
      <Canvas
        camera={{ position: [0, 0, 3.4], fov: 32 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        frameloop={visible ? "always" : "never"}
      >
        <ambientLight intensity={0.95} />
        <directionalLight position={[3, 3.5, 4]} intensity={0.55} />
        <directionalLight position={[-3, -1.5, 2]} intensity={0.2} />
        <Gema girando={girando} />
      </Canvas>
    </div>
  );
}
