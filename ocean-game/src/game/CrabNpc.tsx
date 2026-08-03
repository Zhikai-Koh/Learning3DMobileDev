import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type RefObject,
} from 'react'
import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import {
  LoopOnce,
  LoopRepeat,
  Mesh,
  Quaternion,
  Raycaster,
  Vector3,
  type AnimationAction,
  type Group,
} from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import characterUrl from '../assets/models/DefaultCrab.glb?url'
import { ATTACK_IMPACT_TIME, CHARACTER_GROUND_OFFSET } from './gameConfig'
import { HealthBar } from './HealthBar'
import type { WorldRefs } from './gameTypes'

useGLTF.preload(characterUrl)

const moveSpeed = 0.65
const chaseSpeed = 1
const chaseDistance = 6
const attackDistance = 1.8
const attackHitDistance = 2.2
const attackCooldownTime = 3.5
const leashDistance = 4.5
const homeArrivalDistance = 0.75
const grabbedItemRotationOffset = Math.PI / 2

type CrabNpcProps = WorldRefs & {
  playerRef: RefObject<Group | null>
  id: string
  health: number
  maxHealth: number
  positionXZ: [number, number]
  scale: number
  rotationY: number
  isCarried: boolean
  onRefChange: (id: string, npc: Group | null) => void
  onPlayerHit: () => void
}

export function CrabNpc({
  islandRef,
  rockRef,
  playerRef,
  id,
  health,
  maxHealth,
  positionXZ,
  scale,
  rotationY,
  isCarried,
  onRefChange,
  onPlayerHit,
}: CrabNpcProps) {
  const npcRef = useRef<Group>(null)
  const attackPlaying = useRef(false)
  const attackHitChecked = useRef(false)
  const attackCooldown = useRef(0)
  const returningToSpawn = useRef(false)
  const turnTimer = useRef(1 + Math.random() * 2)
  const carriedWiggleTimer = useRef(2 + Math.random() * 3)

  const terrainRaycaster = useRef(new Raycaster())
  const nextPosition = useRef(new Vector3())
  const moveOffset = useRef(new Vector3())
  const rayOrigin = useRef(new Vector3())
  const downDirection = useRef(new Vector3(0, -1, 0))
  const npcWorldPosition = useRef(new Vector3())
  const playerWorldPosition = useRef(new Vector3())
  const playerDirection = useRef(new Vector3())
  const grabbingBoneWorldPosition = useRef(new Vector3())
  const grabbingBoneWorldQuaternion = useRef(new Quaternion())
  const parentWorldQuaternion = useRef(new Quaternion())

  const { scene, animations } = useGLTF(characterUrl)
  const clonedScene = useMemo(() => clone(scene), [scene])
  const { actions, mixer } = useAnimations(animations, npcRef)

  // Keep the NPC's local ref and GameWorld's target map synchronized.
  const setNpcRef = useCallback((npc: Group | null) => {
    npcRef.current = npc
    onRefChange(id, npc)
  }, [id, onRefChange])

  useEffect(() => {
    const npc = npcRef.current
    if (!npc) return

    npc.position.set(positionXZ[0], 0, positionXZ[1])
    npc.rotation.y = rotationY
  }, [positionXZ, rotationY])

  useEffect(() => {
    clonedScene.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true
        object.receiveShadow = true
      }
    })
  }, [clonedScene])

  useEffect(() => {
    const walkAction = actions.Walk
    if (!walkAction) return

    actions.AttackSmash?.stop()
    attackPlaying.current = false
    attackHitChecked.current = false

    if (isCarried) {
      walkAction.stop()
      carriedWiggleTimer.current = 2 + Math.random() * 3
    } else {
      const npc = npcRef.current
      if (npc) {
        npc.rotation.x = 0
        npc.rotation.z = 0
      }

      walkAction.setLoop(LoopRepeat, Infinity)
      walkAction.reset().fadeIn(0.2).play()
    }

    return () => {
      walkAction.stop()
    }
  }, [actions, isCarried])

  useEffect(() => {
    const attackAction = actions.AttackSmash
    if (!attackAction) return

    function onAnimationFinished(event: { action: AnimationAction }) {
      if (event.action !== attackAction) return

      attackPlaying.current = false
      if (!isCarried) {
        actions.Walk?.setLoop(LoopRepeat, Infinity).reset().fadeIn(0.15).play()
      }
    }

    mixer.addEventListener('finished', onAnimationFinished)

    return () => {
      mixer.removeEventListener('finished', onAnimationFinished)
    }
  }, [actions, isCarried, mixer])

  useFrame((_, delta) => {
    const npc = npcRef.current
    const island = islandRef.current
    const player = playerRef.current
    if (!npc || !island || !player) return

    if (isCarried) {
      const grabbingBone = player.getObjectByName('GrabbingBone')

      if (grabbingBone) {
        grabbingBone.getWorldPosition(grabbingBoneWorldPosition.current)

        // Convert the attachment point from world space into the NPC parent's
        // local space, then place the NPC origin exactly on it.
        npc.parent?.worldToLocal(grabbingBoneWorldPosition.current)
        npc.position.copy(grabbingBoneWorldPosition.current)

        // World rotations also need converting when the NPC has a parent.
        grabbingBone.getWorldQuaternion(grabbingBoneWorldQuaternion.current)
        if (npc.parent) {
          npc.parent.getWorldQuaternion(parentWorldQuaternion.current)
          npc.quaternion.copy(
            parentWorldQuaternion.current
              .invert()
              .multiply(grabbingBoneWorldQuaternion.current),
          )
        } else {
          npc.quaternion.copy(grabbingBoneWorldQuaternion.current)
        }

        // The crab model's forward axis is 90 degrees from the attachment
        // point's axis, so correct it after inheriting the bone rotation.
        npc.rotateY(grabbedItemRotationOffset)
      }

      carriedWiggleTimer.current -= delta
      if (carriedWiggleTimer.current <= 0) {
        const walkAction = actions.Walk
        if (walkAction && !walkAction.isRunning()) {
          walkAction.setLoop(LoopOnce, 1)
          walkAction.clampWhenFinished = false
          walkAction.reset().fadeIn(0.1).play()
        }
        carriedWiggleTimer.current = 3 + Math.random() * 4
      }

      return
    }

    attackCooldown.current = Math.max(0, attackCooldown.current - delta)

    npc.getWorldPosition(npcWorldPosition.current)
    player.getWorldPosition(playerWorldPosition.current)
    playerDirection.current
      .copy(playerWorldPosition.current)
      .sub(npcWorldPosition.current)
    playerDirection.current.y = 0

    const distanceToPlayer = playerDirection.current.length()
    const distanceFromSpawn = Math.hypot(
      npc.position.x - positionXZ[0],
      npc.position.z - positionXZ[1],
    )

    if (distanceFromSpawn >= leashDistance) {
      returningToSpawn.current = true
    } else if (
      returningToSpawn.current &&
      distanceFromSpawn <= homeArrivalDistance
    ) {
      returningToSpawn.current = false
    }

    const attackAction = actions.AttackSmash

    // An attack already in progress owns the NPC until it finishes.
    if (attackPlaying.current) {
      if (
        !attackHitChecked.current &&
        attackAction &&
        attackAction.time >= ATTACK_IMPACT_TIME
      ) {
        attackHitChecked.current = true

        if (distanceToPlayer <= attackHitDistance) {
          onPlayerHit()
        }
      }

      return
    }

    // Do not begin another attack while the NPC is returning home.
    if (
      !returningToSpawn.current &&
      distanceToPlayer <= attackDistance &&
      attackCooldown.current <= 0 &&
      attackAction
    ) {
      // The attacking claw points mostly along the crab's local -X axis.
      npc.rotation.y = Math.atan2(
        playerDirection.current.z,
        -playerDirection.current.x,
      )
      actions.Walk?.fadeOut(0.1)
      attackAction.setLoop(LoopOnce, 1)
      attackAction.clampWhenFinished = false
      attackAction.reset().fadeIn(0.1).play()
      attackPlaying.current = true
      attackHitChecked.current = false
      attackCooldown.current = attackCooldownTime
      return
    }

    const proposedPosition = nextPosition.current.copy(npc.position)

    if (returningToSpawn.current) {
      moveOffset.current.set(
        positionXZ[0] - npc.position.x,
        0,
        positionXZ[1] - npc.position.z,
      )

      if (moveOffset.current.lengthSq() > 0) {
        moveOffset.current.normalize()
        npc.rotation.y = Math.atan2(
          -moveOffset.current.x,
          -moveOffset.current.z,
        )
        proposedPosition.addScaledVector(moveOffset.current, chaseSpeed * delta)
      }
    } else if (distanceToPlayer <= chaseDistance && distanceToPlayer > 0) {
      playerDirection.current.normalize()

      // Local -Z is the crab's sideways walking direction.
      npc.rotation.y = Math.atan2(
        -playerDirection.current.x,
        -playerDirection.current.z,
      )
      proposedPosition.addScaledVector(
        playerDirection.current,
        chaseSpeed * delta,
      )
    } else {
      turnTimer.current -= delta
      if (turnTimer.current <= 0) {
        npc.rotation.y += (Math.random() - 0.5) * 1.4
        turnTimer.current = 2 + Math.random() * 3
      }

      moveOffset.current
        .set(0, 0, -moveSpeed * delta)
        .applyQuaternion(npc.quaternion)
      proposedPosition.add(moveOffset.current)
    }

    // Follow the highest walkable surface beneath the proposed position.
    rayOrigin.current.set(proposedPosition.x, 20, proposedPosition.z)
    terrainRaycaster.current.set(rayOrigin.current, downDirection.current)

    const [islandHit] = terrainRaycaster.current.intersectObject(island, true)
    const rock = rockRef.current
    const [rockHit] = rock
      ? terrainRaycaster.current.intersectObject(rock, true)
      : []

    const terrainHit =
      rockHit && (!islandHit || rockHit.distance < islandHit.distance)
        ? rockHit
        : islandHit

    if (!terrainHit) {
      npc.rotation.y += Math.PI * (0.75 + Math.random() * 0.5)
      turnTimer.current = 1
      return
    }

    proposedPosition.y = terrainHit.point.y + CHARACTER_GROUND_OFFSET * scale
    npc.position.copy(proposedPosition)
  })

  return (
    <group ref={setNpcRef} name={id} scale={scale}>
      <primitive object={clonedScene} />
      <HealthBar
        label="Crab"
        health={health}
        maxHealth={maxHealth}
        position={[0, 1.55, 0]}
      />
    </group>
  )
}
