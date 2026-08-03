import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { Html, OrbitControls, useAnimations, useGLTF } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  Box3,
  LoopOnce,
  Mesh,
  MOUSE,
  Raycaster,
  Vector3,
  type AnimationAction,
  type Group,
} from 'three'
import characterUrl from '../assets/models/DefaultCrabWAttack.glb?url'
import islandUrl from '../assets/models/Island.glb?url'
import rockUrl from '../assets/models/Rock.glb?url'

useGLTF.preload(characterUrl)
useGLTF.preload(islandUrl)
useGLTF.preload(rockUrl)

const turnSpeed = 1.5
const movementKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD']
const attackBoneNames = ['Bone023', 'Bone024', 'Bone025', 'Bone026']
const islandScale = 0.25
const islandCenterHeight = 7.421
const moveSpeed = 2
const characterGroundOffset = 0.06
const attackImpactTime = 1.25
const attackReachPastClaw = 1
const initialRockHealth = 3

type WorldRefs = {
  islandRef: RefObject<Group | null>
  rockRef: RefObject<Group | null>
}

type CharacterProps = WorldRefs & {
  onRockHit: () => void
}

function Character({ islandRef, rockRef, onRockHit }: CharacterProps) {
  const characterRef = useRef<Group>(null)
  const currentAction = useRef<'Walk' | 'Scare' | null>(null)
  const scareRequested = useRef(false)
  const attackRequested = useRef(false)
  const attackPlaying = useRef(false)
  const attackHitChecked = useRef(false)
  const heldKeys = useRef(new Set<string>())
  const terrainRaycaster = useRef(new Raycaster())
  const attackRaycaster = useRef(new Raycaster())
  const nextPosition = useRef(new Vector3())
  const moveOffset = useRef(new Vector3())
  const rayOrigin = useRef(new Vector3())
  const downDirection = useRef(new Vector3(0, -1, 0))
  const attackDirection = useRef(new Vector3())
  const attackBonePosition = useRef(new Vector3())

  //scene is the root of the Three.js hierarchy made from Blender. It contains all the meshes, lights, and cameras that were exported from Blender. Animations is an array of animation clips that were exported from Blender.
  const { scene, animations } = useGLTF(characterUrl)

  // Give Walk and AttackSmash separate sets of bones so they do not blend
  // against each other when both actions are playing.
  const layeredAnimations = useMemo(() => {
    function isAttackBoneTrack(trackName: string) {
      return attackBoneNames.some((boneName) =>
        trackName.startsWith(`${boneName}.`),
      )
    }

    return animations.map((clip) => {
      if (clip.name === 'Walk') {
        const walkClip = clip.clone()
        walkClip.tracks = walkClip.tracks.filter(
          (track) => !isAttackBoneTrack(track.name),
        )
        return walkClip
      }

      if (clip.name === 'AttackSmash') {
        const attackClip = clip.clone()
        attackClip.tracks = attackClip.tracks.filter((track) =>
          isAttackBoneTrack(track.name),
        )
        return attackClip
      }

      return clip
    })
  }, [animations])

  const { actions, mixer } = useAnimations(layeredAnimations, characterRef)

  //Set up shadows for all meshes in the scene
  useEffect(() => {
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true
        object.receiveShadow = true
      }
    })
  }, [scene])

  // The mixer tells us when either one-shot animation has finished.
  useEffect(() => {
    const scareAction = actions.Scare
    const attackAction = actions.AttackSmash

    function onAnimationFinished(event: { action: AnimationAction }) {
      if (event.action === scareAction) {
        currentAction.current = null
      }

      if (event.action === attackAction) {
        attackPlaying.current = false
      }
    }

    mixer.addEventListener('finished', onAnimationFinished)

    return () => {
      mixer.removeEventListener('finished', onAnimationFinished)
    }
  }, [actions, mixer])

  // Set up event listeners for key presses and releases
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.code === 'KeyF' &&
        !event.repeat &&
        currentAction.current !== 'Scare'
      ) {
        scareRequested.current = true
      }

      if (
        event.code === 'KeyR' &&
        !event.repeat &&
        !attackPlaying.current &&
        currentAction.current !== 'Scare'
      ) {
        attackRequested.current = true
      }

      heldKeys.current.add(event.code)
    }

    function onKeyUp(event: KeyboardEvent) {
      heldKeys.current.delete(event.code)
    }

    function onBlur() {
      heldKeys.current.clear()
      scareRequested.current = false
      attackRequested.current = false
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

    if (heldKeys.current.has('KeyA')) {
      character.rotation.y += turnSpeed * delta
    }
    if (heldKeys.current.has('KeyD')) {
      character.rotation.y -= turnSpeed * delta
    }

    let moveDistance = 0
    if (heldKeys.current.has('KeyW')) {
      moveDistance -= moveSpeed * delta
    }
    if (heldKeys.current.has('KeyS')) {
      moveDistance += moveSpeed * delta
    }

    const proposedPosition = nextPosition.current.copy(character.position)

    if (moveDistance !== 0) {
      moveOffset.current
        .set(0, 0, moveDistance)
        .applyQuaternion(character.quaternion)
      proposedPosition.add(moveOffset.current)
    }

    const island = islandRef.current
    if (island) {
      rayOrigin.current.set(proposedPosition.x, 20, proposedPosition.z)
      terrainRaycaster.current.set(rayOrigin.current, downDirection.current)

      const [islandHit] = terrainRaycaster.current.intersectObject(island, true)
      const rock = rockRef.current
      const [rockHit] = rock
        ? terrainRaycaster.current.intersectObject(rock, true)
        : []

      // The ray starts above both models, so the closer hit is the higher
      // walkable surface at the crab's proposed X/Z position.
      const terrainHit =
        rockHit && (!islandHit || rockHit.distance < islandHit.distance)
          ? rockHit
          : islandHit

      if (terrainHit) {
        proposedPosition.y = terrainHit.point.y + characterGroundOffset
        character.position.copy(proposedPosition)
      }
    }

    if (scareRequested.current) {
      scareRequested.current = false
      attackRequested.current = false

      const scareAction = actions.Scare
      if (scareAction) {
        actions.AttackSmash?.stop()
        attackPlaying.current = false
        actions.Walk?.fadeOut(0.1)
        scareAction.setLoop(LoopOnce, 1)
        scareAction.clampWhenFinished = false
        scareAction.reset().fadeIn(0.1).play()
        currentAction.current = 'Scare'
      }
    }

    // Scare temporarily has priority over the walking animation.
    if (currentAction.current === 'Scare') return

    if (attackRequested.current) {
      attackRequested.current = false

      const attackAction = actions.AttackSmash
      if (attackAction) {
        attackHitChecked.current = false
        attackAction.setLoop(LoopOnce, 1)
        attackAction.clampWhenFinished = false
        attackAction.reset().fadeIn(0.1).play()
        attackPlaying.current = true
      }
    }

    const attackAction = actions.AttackSmash
    if (
      attackPlaying.current &&
      !attackHitChecked.current &&
      attackAction &&
      attackAction.time >= attackImpactTime
    ) {
      attackHitChecked.current = true

      const attackBone = scene.getObjectByName('Bone026')
      const rock = rockRef.current

      if (attackBone && rock) {
        character.getWorldPosition(rayOrigin.current)
        attackBone.getWorldPosition(attackBonePosition.current)

        attackDirection.current
          .copy(attackBonePosition.current)
          .sub(rayOrigin.current)

        const distanceToClaw = attackDirection.current.length()
        attackDirection.current.normalize()

        attackRaycaster.current.set(rayOrigin.current, attackDirection.current)
        attackRaycaster.current.far = distanceToClaw + attackReachPastClaw

        const rockHits = attackRaycaster.current.intersectObject(rock, true)
        if (rockHits.length > 0) {
          console.log('Rock hit!')
          onRockHit()
        } else {
          console.log('Attack missed the rock')
        }
      } else {
        console.log('Attack check unavailable', {
          attackBoneFound: Boolean(attackBone),
          rockFound: Boolean(rock),
        })
      }
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
      position={[-3, 0, 0]}
    >
      <primitive object={scene} />
    </group>
  )
}

function Ocean() {
  return (
    <mesh position={[0, -1.3, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[80, 80, 40, 40]} />
      <meshStandardMaterial
        color="#087b9a"
        metalness={0.08}
        roughness={0.48}
      />
    </mesh>
  )
}

function Island({ islandRef }: Pick<WorldRefs, 'islandRef'>) {
  const { scene: islandScene } = useGLTF(islandUrl)

  useEffect(() => {
    islandScene.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true
        object.receiveShadow = true
      }
    })
  }, [islandScene])

  return <primitive ref={islandRef} object={islandScene} />
}

type RockProps = Pick<WorldRefs, 'rockRef'> & {
  health: number
  maxHealth: number
}

function Rock({ rockRef, health, maxHealth }: RockProps) {
  const { scene: rockScene } = useGLTF(rockUrl)
  const healthBarPosition = useMemo(() => {
    rockScene.updateMatrixWorld(true)

    const bounds = new Box3().setFromObject(rockScene)
    const center = bounds.getCenter(new Vector3())

    return [center.x, bounds.max.y + 1.5, center.z] as [number, number, number]
  }, [rockScene])
  const healthPercent = (health / maxHealth) * 100

  useEffect(() => {
    rockScene.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true
        object.receiveShadow = true
      }
    })
  }, [rockScene])

  return (
    <group ref={rockRef} name="interactable-rock">
      <primitive object={rockScene} />
      <Html position={healthBarPosition} center distanceFactor={8}>
        <div
          className="rock-healthbar"
          role="progressbar"
          aria-label="Rock health"
          aria-valuemin={0}
          aria-valuemax={maxHealth}
          aria-valuenow={health}
        >
          <span>Rock {health}/{maxHealth}</span>
          <div className="rock-healthbar-track">
            <div
              className="rock-healthbar-fill"
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>
      </Html>
    </group>
  )
}

type IslandWorldProps = WorldRefs & {
  rockHealth: number
}

function IslandWorld({ islandRef, rockRef, rockHealth }: IslandWorldProps) {
  return (
    <group
      position={[0, -islandCenterHeight * islandScale, 0]}
      scale={islandScale}
    >
      <Island islandRef={islandRef} />
      {rockHealth > 0 && (
        <Rock
          rockRef={rockRef}
          health={rockHealth}
          maxHealth={initialRockHealth}
        />
      )}
    </group>
  )
}

function GameWorld() {
  const islandRef = useRef<Group>(null)
  const rockRef = useRef<Group>(null)
  const [rockHealth, setRockHealth] = useState(initialRockHealth)

  useEffect(() => {
    if (rockHealth < initialRockHealth) {
      console.log(`Rock health: ${rockHealth}/${initialRockHealth}`)
    }

    if (rockHealth === 0) {
      console.log('Rock destroyed!')
    }
  }, [rockHealth])

  function handleRockHit() {
    setRockHealth((currentHealth) => Math.max(0, currentHealth - 1))
  }

  return (
    <>
      <IslandWorld
        islandRef={islandRef}
        rockRef={rockRef}
        rockHealth={rockHealth}
      />
      <Character
        islandRef={islandRef}
        rockRef={rockRef}
        onRockHit={handleRockHit}
      />
    </>
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
        <GameWorld />
      </Suspense>
      <OrbitControls
        makeDefault
        target={[0, -0.4, 0]}
        enableDamping
        enablePan={false}
        minDistance={5}
        maxDistance={24}
        maxPolarAngle={Math.PI / 2.05}
        mouseButtons={{
          LEFT: MOUSE.PAN,
          MIDDLE: MOUSE.DOLLY,
          RIGHT: MOUSE.ROTATE,
        }}
      />
    </Canvas>
  )
}
