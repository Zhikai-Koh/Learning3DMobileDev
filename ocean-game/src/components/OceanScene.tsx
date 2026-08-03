import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { MOUSE, type Group } from 'three'
import { CrabNpc } from '../game/CrabNpc'
import {
  INITIAL_NPC_HEALTH,
  INITIAL_PLAYER_HEALTH,
  INITIAL_ROCK_HEALTH,
  NPC_DEFINITIONS,
} from '../game/gameConfig'
import { Player } from '../game/Player'
import { World } from '../game/World'

// GameWorld owns state shared between the world, player and NPC components.
function GameWorld() {
  const islandRef = useRef<Group>(null)
  const rockRef = useRef<Group>(null)
  const playerRef = useRef<Group>(null)
  const npcRefs = useRef(new Map<string, Group>())

  const [rockHealth, setRockHealth] = useState(INITIAL_ROCK_HEALTH)
  const [playerHealth, setPlayerHealth] = useState(INITIAL_PLAYER_HEALTH)
  const [carriedNpcId, setCarriedNpcId] = useState<string | null>(null)
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
        carriedNpcId={carriedNpcId}
        onRockHit={handleRockHit}
        onNpcHit={handleNpcHit}
        onNpcGrab={handleNpcGrab}
        onNpcDrop={handleNpcDrop}
      />

      {NPC_DEFINITIONS.map((npc) => {
        const health = npcHealth[npc.id] ?? 0
        if (health <= 0) return null

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
      camera={{ position: [9, 8, 12], fov: 42 }}
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

      <OrbitControls
        makeDefault
        target={[0, -0.4, 0]}
        enableDamping
        enablePan={false}
        minDistance={6}
        maxDistance={36}
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
