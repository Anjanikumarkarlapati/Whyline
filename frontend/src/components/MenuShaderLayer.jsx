import React, { Component, Suspense, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { ShaderGradientCanvas, ShaderGradient } from 'shadergradient';
import { readMenuShaderPalette } from '../utils/flowchartLayers';

class WebGLErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

/**
 * Lightweight R3F 3D wireframe lattice accent that orbits inside the menu's
 * single ShaderGradientCanvas. Mutates refs directly in useFrame (zero setState).
 */
function SpatialMenuLattice({ theme, energyRef, reducedMotion }) {
  const groupRef = useRef(null);
  const ringRef = useRef(null);

  useFrame((state, delta) => {
    if (reducedMotion || !groupRef.current || !ringRef.current) return;
    const energy = energyRef?.current ?? 0;
    const speed = 0.28 + energy * 0.95;

    groupRef.current.rotation.y += delta * speed * 0.55;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.6) * 0.18;

    ringRef.current.rotation.z -= delta * speed * 0.42;
    const targetScale = 1 + Math.min(energy, 1) * 0.14;
    groupRef.current.scale.x += (targetScale - groupRef.current.scale.x) * Math.min(1, delta * 6);
    groupRef.current.scale.y = groupRef.current.scale.x;
    groupRef.current.scale.z = groupRef.current.scale.x;
  });

  const { wireColor, accentColor } = readMenuShaderPalette(theme);

  return (
    <group ref={groupRef} position={[2.8, 0.1, -1.2]}>
      <mesh>
        <icosahedronGeometry args={[0.95, 1]} />
        <meshBasicMaterial color={wireColor} wireframe transparent opacity={theme === 'dark' ? 0.18 : 0.14} />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 3, 0.2, 0]}>
        <torusGeometry args={[1.45, 0.018, 12, 64]} />
        <meshBasicMaterial color={accentColor} transparent opacity={theme === 'dark' ? 0.26 : 0.2} />
      </mesh>
    </group>
  );
}

/**
 * Single WebGL ShaderGradient + R3F Spatial backdrop for the sticky topbar menu.
 * Uses pointerEvents: 'none' and honors prefers-reduced-motion & data-fx="lite".
 */
export default function MenuShaderLayer({ theme = 'light', hoverEnergy = 0 }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [liteMode, setLiteMode] = useState(false);
  const energyRef = useRef(hoverEnergy);

  useEffect(() => {
    energyRef.current = hoverEnergy;
  }, [hoverEnergy]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setReducedMotion(mq.matches);
      setLiteMode(document.documentElement.getAttribute('data-fx') === 'lite');
    };
    sync();
    mq.addEventListener?.('change', sync);
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-fx'] });
    return () => {
      mq.removeEventListener?.('change', sync);
      observer.disconnect();
    };
  }, []);

  if (liteMode) {
    return <div className="menu-shader-fallback" aria-hidden="true" />;
  }

  const palette = readMenuShaderPalette(theme);

  return (
    <div className="menu-shader-layer" aria-hidden="true">
      <WebGLErrorBoundary fallback={<div className="menu-shader-fallback" aria-hidden="true" />}>
        <Suspense fallback={<div className="menu-shader-fallback" aria-hidden="true" />}>
          <ShaderGradientCanvas
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
            pixelDensity={1}
            fov={42}
          >
            <ShaderGradient
              control="props"
              type="waterPlane"
              animate={reducedMotion ? 'off' : 'on'}
              uSpeed={0.38}
              uStrength={2.1}
              uDensity={1.4}
              uFrequency={4.2}
              uAmplitude={1.2}
              color1={palette.color1}
              color2={palette.color2}
              color3={palette.color3}
              cDistance={3.2}
              cPolarAngle={90}
              cAzimuthAngle={180}
              lightType="3d"
              brightness={theme === 'dark' ? 0.9 : 1.15}
              grain="on"
              grainBlending={0.18}
              enableTransition={false}
            />
            <SpatialMenuLattice
              theme={theme}
              energyRef={energyRef}
              reducedMotion={reducedMotion}
            />
          </ShaderGradientCanvas>
        </Suspense>
      </WebGLErrorBoundary>
      <div className="menu-shader-scrim" />
    </div>
  );
}
