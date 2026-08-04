import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Quaternion, Vector3, type Group } from 'three'
import { CrabNpc } from '../game/CrabNpc'
import {
  INITIAL_NPC_HEALTH,
  INITIAL_PLAYER_HEALTH,
  INITIAL_ROCK_HEALTH,
  EAT_HEAL_AMOUNT,
  NPC_DEFINITIONS,
} from '../game/gameConfig'
import { Player } from '../game/Player'
import { World } from '../game/World'

const cameraHeight = 4
const cameraDistanceBehind = 7
const cameraLookHeight = 0.6
const cameraFollowSharpness = 10
const cameraZoomSharpness = 12
const minimumCameraZoom = 0.55
const maximumCameraZoom = 1.8
const wheelZoomSensitivity = 0.001
const cameraOrbitSensitivity = 0.005
const minimumCameraPolarAngle = 0.08
const maximumCameraPolarAngle = 1.45
const cameraBaseRadius = Math.hypot(cameraDistanceBehind, cameraHeight)
const cameraBasePolarAngle = Math.atan2(cameraDistanceBehind, cameraHeight)

function ChaseCamera({ playerRef }: { playerRef: RefObject<Group | null> }) {
  const camera = useThree((state) => state.camera)
  const canvas = useThree((state) => state.gl.domElement)
  const initialized = useRef(false)
  const targetZoom = useRef(1)
  const currentZoom = useRef(1)
  const cameraAzimuth = useRef(0)
  const cameraPolarAngle = useRef(cameraBasePolarAngle)
  const activePointerId = useRef<number | null>(null)
  const lastPointerX = useRef(0)
  const lastPointerY = useRef(0)
  const playerWorldPosition = useRef(new Vector3())
  const playerWorldQuaternion = useRef(new Quaternion())
  const desiredCameraPosition = useRef(new Vector3())
  const desiredLookTarget = useRef(new Vector3())
  const currentLookTarget = useRef(new Vector3())

  useEffect(() => {
    function onWheel(event: WheelEvent) {
      event.preventDefault()
      targetZoom.current = MathUtils.clamp(
        targetZoom.current + event.deltaY * wheelZoomSensitivity,
        minimumCameraZoom,
        maximumCameraZoom,
      )
    }

    function onPointerDown(event: PointerEvent) {
      if (event.button !== 2) return

      event.preventDefault()
      activePointerId.current = event.pointerId
      lastPointerX.current = event.clientX
      lastPointerY.current = event.clientY
      canvas.setPointerCapture(event.pointerId)
    }

    function onPointerMove(event: PointerEvent) {
      if (activePointerId.current !== event.pointerId) return

      const movementX = event.clientX - lastPointerX.current
      const movementY = event.clientY - lastPointerY.current
      lastPointerX.current = event.clientX
      lastPointerY.current = event.clientY

      cameraAzimuth.current -= movementX * cameraOrbitSensitivity
      cameraPolarAngle.current = MathUtils.clamp(
        cameraPolarAngle.current + movementY * cameraOrbitSensitivity,
        minimumCameraPolarAngle,
        maximumCameraPolarAngle,
      )
    }

    function finishPointerInteraction(event: PointerEvent) {
      if (activePointerId.current !== event.pointerId) return

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }
      activePointerId.current = null
    }

    function preventContextMenu(event: MouseEvent) {
      event.preventDefault()
    }

    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', finishPointerInteraction)
    canvas.addEventListener('pointercancel', finishPointerInteraction)
    canvas.addEventListener('contextmenu', preventContextMenu)

    return () => {
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', finishPointerInteraction)
      canvas.removeEventListener('pointercancel', finishPointerInteraction)
      canvas.removeEventListener('contextmenu', preventContextMenu)
    }
  }, [canvas])

  useFrame((_, delta) => {
    const player = playerRef.current
    if (!player) return

    player.getWorldPosition(playerWorldPosition.current)
    player.getWorldQuaternion(playerWorldQuaternion.current)

    const zoomAmount = 1 - Math.exp(-cameraZoomSharpness * delta)
    currentZoom.current +=
      (targetZoom.current - currentZoom.current) * zoomAmount

    // At azimuth zero, theta PI/2 places the camera on the crab's local +X
    // back side. Right-drag changes azimuth and polar angle around that origin.
    desiredCameraPosition.current
      .setFromSphericalCoords(
        cameraBaseRadius * currentZoom.current,
        cameraPolarAngle.current,
        Math.PI / 2 + cameraAzimuth.current,
      )
      .applyQuaternion(playerWorldQuaternion.current)
      .add(playerWorldPosition.current)

    desiredLookTarget.current.copy(playerWorldPosition.current)
    desiredLookTarget.current.y += cameraLookHeight

    if (!initialized.current) {
      camera.position.copy(desiredCameraPosition.current)
      currentLookTarget.current.copy(desiredLookTarget.current)
      initialized.current = true
    } else {
      const followAmount = 1 - Math.exp(-cameraFollowSharpness * delta)
      camera.position.lerp(desiredCameraPosition.current, followAmount)
      currentLookTarget.current.lerp(desiredLookTarget.current, followAmount)
    }

    camera.lookAt(currentLookTarget.current)
  })

  return null
}

// GameWorld owns state shared between the world, player and NPC components.
function GameWorld() {
  const islandRef = useRef<Group>(null)
  const rockRef = useRef<Group>(null)
  const playerRef = useRef<Group>(null)
  const npcRefs = useRef(new Map<string, Group>())

  const [rockHealth, setRockHealth] = useState(INITIAL_ROCK_HEALTH)
  const [playerHealth, setPlayerHealth] = useState(INITIAL_PLAYER_HEALTH)
  const [carriedNpcId, setCarriedNpcId] = useState<string | null>(null)
  const [edibleNpcIds, setEdibleNpcIds] = useState<Set<string>>(() => new Set())
  const [consumedNpcIds, setConsumedNpcIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [npcHealth, setNpcHealth] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      NPC_DEFINITIONS.map((npc) => [npc.id, INITIAL_NPC_HEALTH]),
    ),
  )

  useEffect(() => {
    if (rockHealth < INITIAL_ROCK_HEALTH) {
      console.log(`Rock health: ${rockHealth}/${INITIAL_ROCK_HEALTH}`)
    }

    if (rockHealth === 0) {
      console.log('Rock destroyed!')
    }
  }, [rockHealth])

  useEffect(() => {
    if (carriedNpcId && (npcHealth[carriedNpcId] ?? 0) <= 0) {
      setCarriedNpcId(null)
    }
  }, [carriedNpcId, npcHealth])

  const handleNpcRef = useCallback((id: string, npc: Group | null) => {
    if (npc) {
      npcRefs.current.set(id, npc)
    } else {
      npcRefs.current.delete(id)
    }
  }, [])

  const handleRockHit = useCallback(() => {
    setRockHealth((currentHealth) => Math.max(0, currentHealth - 1))
  }, [])

  const handleNpcHit = useCallback((id: string) => {
    setNpcHealth((currentHealth) => ({
      ...currentHealth,
      [id]: Math.max(0, (currentHealth[id] ?? 0) - 1),
    }))
  }, [])

  const handlePlayerHit = useCallback(() => {
    setPlayerHealth((currentHealth) => Math.max(0, currentHealth - 1))
  }, [])

  const handleNpcGrab = useCallback((id: string) => {
    setCarriedNpcId((currentId) => currentId ?? id)
  }, [])

  const handleNpcDrop = useCallback(() => {
    setCarriedNpcId(null)
  }, [])

  const handleNpcDeathFinished = useCallback((id: string) => {
    setEdibleNpcIds((currentIds) => {
      const nextIds = new Set(currentIds)
      nextIds.add(id)
      return nextIds
    })
  }, [])

  const handleNpcEat = useCallback((id: string) => {
    setConsumedNpcIds((currentIds) => {
      const nextIds = new Set(currentIds)
      nextIds.add(id)
      return nextIds
    })
    setPlayerHealth((currentHealth) =>
      Math.min(INITIAL_PLAYER_HEALTH, currentHealth + EAT_HEAL_AMOUNT),
    )
  }, [])

  return (
    <>
      <World
        islandRef={islandRef}
        rockRef={rockRef}
        rockHealth={rockHealth}
      />

      <Player
        islandRef={islandRef}
        rockRef={rockRef}
        playerRef={playerRef}
        health={playerHealth}
        maxHealth={INITIAL_PLAYER_HEALTH}
        npcRefs={npcRefs}
        npcHealth={npcHealth}
        edibleNpcIds={edibleNpcIds}
        carriedNpcId={carriedNpcId}
        onRockHit={handleRockHit}
        onNpcHit={handleNpcHit}
        onNpcGrab={handleNpcGrab}
        onNpcDrop={handleNpcDrop}
        onNpcEat={handleNpcEat}
      />

      <ChaseCamera playerRef={playerRef} />

      {NPC_DEFINITIONS.map((npc) => {
        if (consumedNpcIds.has(npc.id)) return null

        const health = npcHealth[npc.id] ?? 0

        return (
          <CrabNpc
            key={npc.id}
            id={npc.id}
            islandRef={islandRef}
            rockRef={rockRef}
            playerRef={playerRef}
            health={health}
            maxHealth={INITIAL_NPC_HEALTH}
            positionXZ={npc.positionXZ}
            scale={npc.scale}
            rotationY={npc.rotationY}
            isCarried={carriedNpcId === npc.id}
            onRefChange={handleNpcRef}
            onPlayerHit={handlePlayerHit}
            onDeathFinished={handleNpcDeathFinished}
          />
        )
      })}
    </>
  )
}

// OceanScene owns only the Canvas, lighting and camera controls.
export function OceanScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 4, 7], fov: 42 }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#8bd5e8']} />
      <fog attach="fog" args={['#8bd5e8', 18, 55]} />
      <ambientLight intensity={1.6} />
      <directionalLight
        castShadow
        intensity={2.4}
        position={[5, 9, 4]}
        shadow-mapSize={[1024, 1024]}
      />

      <Suspense fallback={null}>
        <GameWorld />
      </Suspense>

    </Canvas>
  )
}
