import { Suspense, useEffect, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Mesh, type Group } from 'three'
import raftFloorUrl from '../assets/models/10by10Floor.glb?url'

function RaftFloor() {
  const { scene } = useGLTF(raftFloorUrl)

  useEffect(() => {
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true
        object.receiveShadow = true
      }
    })
  }, [scene])

  return <primitive object={scene} scale={0.1} />
}

useGLTF.preload(raftFloorUrl)

const turnSpeed = 1.5


function Raft() {
  const raftRef = useRef<Group>(null)
  const heldKeys = useRef(new Set<string>())

  useEffect(() => {
      function onKeyDown(event: KeyboardEvent) {
        heldKeys.current.add(event.code)
      } 

      function onKeyUp(event: KeyboardEvent) {
        heldKeys.current.delete(event.code)
      }

      function onBlur(){
        heldKeys.current.clear()
      }

      window.addEventListener('keyup', onKeyUp)
      window.addEventListener('keydown', onKeyDown)
      window.addEventListener('blur', onBlur)

      return () => {
        window.removeEventListener('keydown', onKeyDown)
        window.removeEventListener('keyup', onKeyUp)
        window.removeEventListener('blur', onBlur)

      } 
    }, [])

  useFrame((_, delta) => {
    if (!raftRef.current) return

    if (heldKeys.current.has('KeyW')) {
      raftRef.current.translateZ(-2 * delta)
    }
    if (heldKeys.current.has('KeyS')) {
      raftRef.current.translateZ(2 * delta)
    }
    if (heldKeys.current.has('KeyA')){
      raftRef.current.rotation.y += turnSpeed * delta
    }
    if (heldKeys.current.has('KeyD')){
      raftRef.current.rotation.y -= turnSpeed * delta
    }
  })

  return (
    <group position={[0, 0.22, 0]} rotation={[0, -0.35, 0]} ref ={raftRef}>
      <RaftFloor />
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[0.12, 0.85, 0.12]} />
        <meshStandardMaterial color="#51321e" />
      </mesh>
      <mesh position={[0, 0.68, 0]} rotation={[0, 0, -0.08]} castShadow>
        <boxGeometry args={[1.05, 0.58, 0.04]} />
        <meshStandardMaterial color="#f0e3c3" side={2} />
      </mesh>
    </group>
  )
}

function Ocean() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[80, 80, 40, 40]} />
      <meshStandardMaterial
        color="#087b9a"
        metalness={0.08}
        roughness={0.48}
      />
    </mesh>
  )
}

export function OceanScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [5.8, 4.4, 6.6], fov: 42 }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#8bd5e8']} />
      <fog attach="fog" args={['#8bd5e8', 12, 38]} />
      <ambientLight intensity={1.6} />
      <directionalLight
        castShadow
        intensity={2.4}
        position={[5, 9, 4]}
        shadow-mapSize={[1024, 1024]}
      />
      <Ocean />
      <Suspense fallback={null}>
        <Raft />
      </Suspense>
    </Canvas>
  )
}
