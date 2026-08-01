import { Suspense, useEffect, useRef } from 'react'
import { useAnimations, useGLTF } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Mesh, type Group } from 'three'
import characterUrl from '../assets/models/DefaultCrab.glb?url'

useGLTF.preload(characterUrl)

const turnSpeed = 1.5
const movementKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD']

function Character() {
  const characterRef = useRef<Group>(null)
  const currentAction = useRef<'Walk' | null>(null)
  const heldKeys = useRef(new Set<string>())

  //scene is the root of the Three.js hierarchy made from Blender. It contains all the meshes, lights, and cameras that were exported from Blender. Animations is an array of animation clips that were exported from Blender.
  const { scene, animations } = useGLTF(characterUrl)
  const { actions } = useAnimations(animations, characterRef)

  //Set up shadows for all meshes in the scene
  useEffect(() => {
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true
        object.receiveShadow = true
      }
    })
  }, [scene])

  // Set up event listeners for key presses and releases
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

  // Update character movement and animation based on held keys
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

    //Check if any movement is clicked
    const isMoving = movementKeys.some((key) => heldKeys.current.has(key))

    if (!isMoving) {
      if (currentAction.current) {
        actions[currentAction.current]?.fadeOut(0.2)
        currentAction.current = null
      }
      return
    }

    if (currentAction.current === 'Walk') return

    //Set next animation
    const nextAction = actions.Walk
    if (!nextAction) return

    //fade in the walking animation
    nextAction.reset().fadeIn(0.2).play()
    currentAction.current = 'Walk'
  })

  return (
    <group
      ref={characterRef}
      position={[0, 0.06, 0]}
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
