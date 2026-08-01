import { Suspense, useEffect, useRef } from 'react'
import { useAnimations, useGLTF } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Mesh, type Group } from 'three'
import characterUrl from '../assets/models/CrabCube2.glb?url'

useGLTF.preload(characterUrl)

const turnSpeed = 1.5
const movementKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD']

function Character() {
  const characterRef = useRef<Group>(null)
  const currentAction = useRef<'Walk2' | 'Wave2' | null>(null)
  const heldKeys = useRef(new Set<string>())
  const { scene, animations } = useGLTF(characterUrl)
  const { actions } = useAnimations(animations, characterRef)

  useEffect(() => {
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true
        object.receiveShadow = true
      }
    })
  }, [scene])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      heldKeys.current.add(event.code)
    }

    function onKeyUp(event: KeyboardEvent) {
      heldKeys.current.delete(event.code)
    }

    function onBlur() {
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
    const character = characterRef.current
    if (!character) return

    if (heldKeys.current.has('KeyW')) {
      character.translateZ(-2 * delta)
    }
    if (heldKeys.current.has('KeyS')) {
      character.translateZ(2 * delta)
    }
    if (heldKeys.current.has('KeyA')) {
      character.rotation.y += turnSpeed * delta
    }
    if (heldKeys.current.has('KeyD')) {
      character.rotation.y -= turnSpeed * delta
    }

    const isMoving = movementKeys.some((key) => heldKeys.current.has(key))
    const nextActionName = isMoving ? 'Walk2' : 'Wave2'

    if (currentAction.current === nextActionName) return

    const nextAction = actions[nextActionName]
    if (!nextAction) return

    const previousActionName = currentAction.current
    if (previousActionName) {
      actions[previousActionName]?.fadeOut(0.2)
    }

    nextAction.reset().fadeIn(0.2).play()
    currentAction.current = nextActionName
  })

  return (
    <group
      ref={characterRef}
      position={[0, 0.27, 0]}
      scale={0.25}
    >
      <primitive object={scene} />
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
        <Character />
      </Suspense>
    </Canvas>
  )
}
