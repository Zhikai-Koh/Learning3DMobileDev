import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber/native';
import type { Group, Mesh } from 'three';

type CubeSceneProps = {
  isRotating: boolean;
  onToggleRotation: () => void;
};

type OrbitingSphereProps = {
  isRotating: boolean;
};

function OrbitingSphere({ isRotating }: OrbitingSphereProps) {
  const orbitRef = useRef<Group>(null);

  useFrame((_state, delta) => {
    if (!orbitRef.current || !isRotating) {
      return;
    }

    orbitRef.current.rotation.y += delta * 0.8;
  });

  return (
    <group ref={orbitRef}>
      <mesh position={[1.6, 0, 0]}>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
    </group>
  );
}

function RotatingCube({ isRotating, onToggleRotation }: CubeSceneProps) {
  const meshRef = useRef<Mesh>(null);

  useFrame((_state, delta) => {
    if (!meshRef.current) {
      return;
    }
    // delta is to ensure change is based on rotation per second instead of frame rate
    if (isRotating) {
      meshRef.current.rotation.x += delta * 0.4;
      meshRef.current.rotation.y += delta * 0.6;
      meshRef.current.rotation.z += delta * 0.7;
    }
  });

  return (
    <mesh 
        ref={meshRef} 
        rotation={[0.4, 0.6, 0]}
        onClick={onToggleRotation}
    >
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial color={isRotating ? "#f97316" : "#3b82f6"} />
    </mesh>
  );
}

function CameraRig() {
    useFrame(({ camera, clock }) => {
      const elapsedTime = clock.getElapsedTime();
      const angle = elapsedTime * 0.2;
      const radius = 5;

      camera.position.x = Math.sin(angle) * radius;
      camera.position.y = 2;
      camera.position.z = Math.cos(angle) * radius;

      camera.lookAt(0, 0, 0);
    });

    return null;
}

export function CubeScene({ isRotating, onToggleRotation }: CubeSceneProps) {

  return (
    <Canvas
        style={{ flex: 1 }}
        camera={{
          position: [0, 0, 4],
          fov: 50,
          near: 0.1,
          far: 100,
        }}
    >
        <CameraRig />

        <axesHelper args={[3]} />
        <ambientLight intensity={0.7} />

        <directionalLight
            position={[2, 3, 4]}
            intensity={1.5}
        />

        <RotatingCube isRotating={isRotating} onToggleRotation={onToggleRotation} />
        <OrbitingSphere isRotating={isRotating} />
    </Canvas>
  );
}