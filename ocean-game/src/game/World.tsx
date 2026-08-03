import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { Box3, Mesh, Vector3 } from 'three'
import islandUrl from '../assets/models/Island.glb?url'
import rockUrl from '../assets/models/Rock.glb?url'
import { INITIAL_ROCK_HEALTH } from './gameConfig'
import { HealthBar } from './HealthBar'
import type { WorldRefs } from './gameTypes'

useGLTF.preload(islandUrl)
useGLTF.preload(rockUrl)

const islandScale = 0.38
const islandCenterHeight = 7.421
const islandWaterlineHeight = 2.2

function Ocean() {
  return (
    <mesh
      position={[
        0,
        (-islandCenterHeight + islandWaterlineHeight) * islandScale,
        0,
      ]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[120, 120, 40, 40]} />
      <meshStandardMaterial
        color="#087b9a"
        metalness={0.08}
        roughness={0.48}
      />
    </mesh>
  )
}

function Island({ islandRef }: Pick<WorldRefs, 'islandRef'>) {
  const { scene } = useGLTF(islandUrl)

  useEffect(() => {
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true
        object.receiveShadow = true
      }
    })
  }, [scene])

  return <primitive ref={islandRef} object={scene} />
}

type RockProps = Pick<WorldRefs, 'rockRef'> & {
  health: number
}

function Rock({ rockRef, health }: RockProps) {
  const { scene } = useGLTF(rockUrl)
  const healthBarPosition = useMemo(() => {
    scene.updateMatrixWorld(true)

    const bounds = new Box3().setFromObject(scene)
    const center = bounds.getCenter(new Vector3())

    return [center.x, bounds.max.y + 1.5, center.z] as [number, number, number]
  }, [scene])

  useEffect(() => {
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true
        object.receiveShadow = true
      }
    })
  }, [scene])

  return (
    <group ref={rockRef} name="interactable-rock">
      <primitive object={scene} />
      <HealthBar
        label="Rock"
        health={health}
        maxHealth={INITIAL_ROCK_HEALTH}
        position={healthBarPosition}
      />
    </group>
  )
}

type WorldProps = WorldRefs & {
  rockHealth: number
}

export function World({ islandRef, rockRef, rockHealth }: WorldProps) {
  return (
    <>
      <Ocean />
      <group
        position={[0, -islandCenterHeight * islandScale, 0]}
        scale={islandScale}
      >
        <Island islandRef={islandRef} />
        {rockHealth > 0 && <Rock rockRef={rockRef} health={rockHealth} />}
      </group>
    </>
  )
}
