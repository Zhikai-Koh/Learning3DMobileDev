import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import {
  LoopOnce,
  Mesh,
  Raycaster,
  Vector3,
  type AnimationAction,
  type Group,
} from 'three'
import characterUrl from '../assets/models/DefaultCrab.glb?url'
import {
  ATTACK_IMPACT_TIME,
  CHARACTER_GROUND_OFFSET,
  EAT_CONSUME_TIME,
  EAT_DISTANCE,
  GRAB_DISTANCE,
  GRAB_PICKUP_TIME,
} from './gameConfig'
import { HealthBar } from './HealthBar'
import type { WorldRefs } from './gameTypes'

useGLTF.preload(characterUrl)

const turnSpeed = 1.5
const moveSpeed = 2
const movementKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD']
const attackBoneNames = ['Bone023', 'Bone024', 'Bone025', 'Bone026']
const attackReachPastClaw = 1

type PlayerProps = WorldRefs & {
  playerRef: RefObject<Group | null>
  health: number
  maxHealth: number
  npcRefs: RefObject<Map<string, Group>>
  npcHealth: Record<string, number>
  edibleNpcIds: ReadonlySet<string>
  carriedNpcId: string | null
  onRockHit: () => void
  onNpcHit: (id: string) => void
  onNpcGrab: (id: string) => void
  onNpcDrop: () => void
  onNpcEat: (id: string) => void
}

export function Player({
  islandRef,
  rockRef,
  playerRef,
  health,
  maxHealth,
  npcRefs,
  npcHealth,
  edibleNpcIds,
  carriedNpcId,
  onRockHit,
  onNpcHit,
  onNpcGrab,
  onNpcDrop,
  onNpcEat,
}: PlayerProps) {
  const currentAction = useRef<
    'Walk' | 'Scare' | 'Grab' | 'Eating' | 'Dying' | null
  >(null)
  const deathStarted = useRef(false)
  const scareRequested = useRef(false)
  const attackRequested = useRef(false)
  const grabRequested = useRef(false)
  const eatRequested = useRef(false)
  const attackPlaying = useRef(false)
  const attackHitChecked = useRef(false)
  const grabPickupChecked = useRef(false)
  const eatConsumeChecked = useRef(false)
  const heldKeys = useRef(new Set<string>())

  const terrainRaycaster = useRef(new Raycaster())
  const attackRaycaster = useRef(new Raycaster())
  const nextPosition = useRef(new Vector3())
  const moveOffset = useRef(new Vector3())
  const rayOrigin = useRef(new Vector3())
  const downDirection = useRef(new Vector3(0, -1, 0))
  const attackDirection = useRef(new Vector3())
  const attackBonePosition = useRef(new Vector3())
  const npcWorldPosition = useRef(new Vector3())

  const { scene, animations } = useGLTF(characterUrl)

  // Walk controls the legs while AttackSmash controls only the claw bones.
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

  const { actions, mixer } = useAnimations(layeredAnimations, playerRef)

  useEffect(() => {
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true
        object.receiveShadow = true
      }
    })
  }, [scene])

  useEffect(() => {
    if (health > 0 || deathStarted.current) return

    deathStarted.current = true
    heldKeys.current.clear()
    scareRequested.current = false
    attackRequested.current = false
    grabRequested.current = false
    eatRequested.current = false
    attackPlaying.current = false

    for (const action of Object.values(actions)) {
      action?.stop()
    }

    const dyingAction = actions.Dying
    if (dyingAction) {
      dyingAction.setLoop(LoopOnce, 1)
      dyingAction.clampWhenFinished = true
      dyingAction.reset().fadeIn(0.1).play()
      currentAction.current = 'Dying'
    }
  }, [actions, health])

  // Clear one-shot animation flags when the mixer finishes an action.
  useEffect(() => {
    const scareAction = actions.Scare
    const attackAction = actions.AttackSmash
    const grabAction = actions.Grab
    const eatingAction = actions.Eating

    function onAnimationFinished(event: { action: AnimationAction }) {
      if (event.action === scareAction) {
        currentAction.current = null
      }

      if (event.action === grabAction) {
        currentAction.current = null
      }

      if (event.action === eatingAction) {
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

  // Browser keyboard input becomes requests and a set of currently held keys.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (health <= 0) return

      if (
        event.code === 'KeyF' &&
        !event.repeat &&
        currentAction.current !== 'Scare' &&
        currentAction.current !== 'Grab' &&
        currentAction.current !== 'Eating'
      ) {
        scareRequested.current = true
      }

      if (
        event.code === 'KeyR' &&
        !event.repeat &&
        !attackPlaying.current &&
        currentAction.current !== 'Scare' &&
        currentAction.current !== 'Grab' &&
        currentAction.current !== 'Eating'
      ) {
        attackRequested.current = true
      }


      if (event.code === 'KeyG' && !event.repeat) {
        if (carriedNpcId) {
          onNpcDrop()
        } else if (
          currentAction.current !== 'Scare' &&
          currentAction.current !== 'Grab' &&
          currentAction.current !== 'Eating'
        ) {
          grabRequested.current = true
        }
      }

      if (
        event.code === 'KeyE' &&
        !event.repeat &&
        health < maxHealth &&
        carriedNpcId === null &&
        currentAction.current !== 'Scare' &&
        currentAction.current !== 'Grab' &&
        currentAction.current !== 'Eating'
      ) {
        eatRequested.current = true
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
      grabRequested.current = false
      eatRequested.current = false
    }

    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('blur', onBlur)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [carriedNpcId, health, maxHealth, onNpcDrop])

  useFrame((_, delta) => {
    const player = playerRef.current
    if (!player) return
    if (health <= 0) return

    // A/D rotate the player's gameplay group.
    if (heldKeys.current.has('KeyA')) {
      player.rotation.y += turnSpeed * delta
    }
    if (heldKeys.current.has('KeyD')) {
      player.rotation.y -= turnSpeed * delta
    }

    // W/S create a local-Z movement amount.
    let moveDistance = 0
    if (heldKeys.current.has('KeyW')) {
      moveDistance -= moveSpeed * delta
    }
    if (heldKeys.current.has('KeyS')) {
      moveDistance += moveSpeed * delta
    }

    const proposedPosition = nextPosition.current.copy(player.position)

    if (moveDistance !== 0) {
      moveOffset.current
        .set(0, 0, moveDistance)
        .applyQuaternion(player.quaternion)
      proposedPosition.add(moveOffset.current)
    }

    // A downward ray chooses the highest walkable island or rock surface.
    const island = islandRef.current
    if (island) {
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

      if (terrainHit) {
        proposedPosition.y = terrainHit.point.y + CHARACTER_GROUND_OFFSET
        player.position.copy(proposedPosition)
      }
    }

    if (scareRequested.current) {
      scareRequested.current = false
      attackRequested.current = false
      grabRequested.current = false
      eatRequested.current = false

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

    if (currentAction.current === 'Scare') return

    if (grabRequested.current) {
      grabRequested.current = false
      attackRequested.current = false
      eatRequested.current = false

      const grabAction = actions.Grab
      if (grabAction) {
        actions.AttackSmash?.stop()
        attackPlaying.current = false
        actions.Walk?.fadeOut(0.1)
        grabPickupChecked.current = false
        grabAction.setLoop(LoopOnce, 1)
        grabAction.clampWhenFinished = false
        grabAction.reset().fadeIn(0.1).play()
        currentAction.current = 'Grab'
      }
    }

    const grabAction = actions.Grab
    if (
      currentAction.current === 'Grab' &&
      !grabPickupChecked.current &&
      grabAction &&
      grabAction.time >= GRAB_PICKUP_TIME
    ) {
      grabPickupChecked.current = true
      player.getWorldPosition(rayOrigin.current)

      let closestNpcId: string | null = null
      let closestDistance = GRAB_DISTANCE

      for (const [npcId, npc] of npcRefs.current) {
        if (npcId === carriedNpcId) continue
        if ((npcHealth[npcId] ?? 0) <= 0) continue

        npc.getWorldPosition(npcWorldPosition.current)
        const distance = rayOrigin.current.distanceTo(npcWorldPosition.current)

        if (distance <= closestDistance) {
          closestDistance = distance
          closestNpcId = npcId
        }
      }

      if (closestNpcId) {
        console.log(`${closestNpcId} picked up!`)
        onNpcGrab(closestNpcId)
      } else {
        console.log('Grab missed')
      }
    }

    if (currentAction.current === 'Grab') return

    if (eatRequested.current) {
      eatRequested.current = false
      attackRequested.current = false

      const eatingAction = actions.Eating
      if (eatingAction) {
        actions.AttackSmash?.stop()
        attackPlaying.current = false
        actions.Walk?.fadeOut(0.1)
        eatConsumeChecked.current = false
        eatingAction.setLoop(LoopOnce, 1)
        eatingAction.clampWhenFinished = false
        eatingAction.reset().fadeIn(0.1).play()
        currentAction.current = 'Eating'
      }
    }

    const eatingAction = actions.Eating
    if (
      currentAction.current === 'Eating' &&
      !eatConsumeChecked.current &&
      eatingAction &&
      eatingAction.time >= EAT_CONSUME_TIME
    ) {
      eatConsumeChecked.current = true
      player.getWorldPosition(rayOrigin.current)

      let closestNpcId: string | null = null
      let closestDistance = EAT_DISTANCE

      for (const [npcId, npc] of npcRefs.current) {
        if (!edibleNpcIds.has(npcId)) continue

        npc.getWorldPosition(npcWorldPosition.current)
        const distance = rayOrigin.current.distanceTo(npcWorldPosition.current)

        if (distance <= closestDistance) {
          closestDistance = distance
          closestNpcId = npcId
        }
      }

      if (closestNpcId) {
        console.log(`${closestNpcId} eaten!`)
        onNpcEat(closestNpcId)
      } else {
        console.log('No dead crab close enough to eat')
      }
    }

    if (currentAction.current === 'Eating') return

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

    // At the impact time, cast from the player toward the animated claw.
    const attackAction = actions.AttackSmash
    if (
      attackPlaying.current &&
      !attackHitChecked.current &&
      attackAction &&
      attackAction.time >= ATTACK_IMPACT_TIME
    ) {
      attackHitChecked.current = true

      // A carried crab is already inside the claw, so the smash damages it
      // directly instead of asking the outward attack ray to find it.
      if (carriedNpcId) {
        console.log(`${carriedNpcId} smashed while carried!`)
        onNpcHit(carriedNpcId)
      } else {
        const attackBone = scene.getObjectByName('Bone026')

        if (attackBone) {
          player.getWorldPosition(rayOrigin.current)
          attackBone.getWorldPosition(attackBonePosition.current)

          attackDirection.current
            .copy(attackBonePosition.current)
            .sub(rayOrigin.current)

          const distanceToClaw = attackDirection.current.length()
          attackDirection.current.normalize()

          attackRaycaster.current.set(rayOrigin.current, attackDirection.current)
          attackRaycaster.current.far = distanceToClaw + attackReachPastClaw

          let closestDistance = Infinity
          let hitTarget: 'rock' | 'npc' | null = null
          let hitNpcId: string | null = null

          const rock = rockRef.current
          const [rockHit] = rock
            ? attackRaycaster.current.intersectObject(rock, true)
            : []

          if (rockHit) {
            closestDistance = rockHit.distance
            hitTarget = 'rock'
          }

          for (const [npcId, npc] of npcRefs.current) {
            if ((npcHealth[npcId] ?? 0) <= 0) continue

            const [npcHit] = attackRaycaster.current.intersectObject(npc, true)

            if (npcHit && npcHit.distance < closestDistance) {
              closestDistance = npcHit.distance
              hitTarget = 'npc'
              hitNpcId = npcId
            }
          }

          if (hitTarget === 'rock') {
            console.log('Rock hit!')
            onRockHit()
          } else if (hitTarget === 'npc' && hitNpcId) {
            console.log(`${hitNpcId} hit!`)
            onNpcHit(hitNpcId)
          } else {
            console.log('Attack missed')
          }
        } else {
          console.log('Attack check unavailable: attack bone not found')
        }
      }
    }

    const isMoving = movementKeys.some((key) => heldKeys.current.has(key))

    if (!isMoving) {
      if (currentAction.current) {
        actions[currentAction.current]?.fadeOut(0.2)
        currentAction.current = null
      }
      return
    }

    if (currentAction.current === 'Walk') return

    const walkAction = actions.Walk
    if (!walkAction) return

    walkAction.reset().fadeIn(0.2).play()
    currentAction.current = 'Walk'
  })

  return (
    <group ref={playerRef} position={[-3, 0, 0]}>
      <primitive object={scene} />
      <HealthBar
        label="Player"
        health={health}
        maxHealth={maxHealth}
        position={[0, 1.45, 0]}
      />
    </group>
  )
}
