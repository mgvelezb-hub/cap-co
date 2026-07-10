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
const POP_DELAY = 2.6;
const POP_DURATION = 0.6;
const TARGET_SCALE = [0.82, 1, 0.82];

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function Gema({ girando }) {
  const ref = useRef();
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const t = Math.min(Math.max((clock.elapsedTime - POP_DELAY) / POP_DURATION, 0), 1);
    const s = easeOutCubic(t);
    ref.current.scale.set(TARGET_SCALE[0] * s, TARGET_SCALE[1] * s, TARGET_SCALE[2] * s);
    if (girando && t >= 1) ref.current.rotation.y += delta * 1.1;
  });
  const geometry = useMemo(() => new THREE.OctahedronGeometry(1, 0), []);
  return (
    <mesh ref={ref} geometry={geometry} scale={[0, 0, 0]} rotation={[0, 0.4, 0]}>
      {/* Granate exacto de la ficha técnica (#A32638): metalness/roughness bajos para
          que la luz no lo desplace hacia blanco o negro, solo lo modele. */}
      <meshStandardMaterial color="#A32638" roughness={0.42} metalness={0.06} />
    </mesh>
  );
}

export default function Gem3D({ className = "" }) {
  const [girando, setGirando] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setGirando(!mq.matches);
    const onChange = () => setGirando(!mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className={`gem-fade ${className}`} aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 3.4], fov: 32 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.95} />
        <directionalLight position={[3, 3.5, 4]} intensity={0.55} />
        <directionalLight position={[-3, -1.5, 2]} intensity={0.2} />
        <Gema girando={girando} />
      </Canvas>
    </div>
  );
}
