export const CHARACTER_GROUND_OFFSET = 0.06
export const ATTACK_IMPACT_TIME = 1.25
export const GRAB_PICKUP_TIME = 1.25
export const GRAB_DISTANCE = 2.4
export const EAT_CONSUME_TIME = 1.25
export const EAT_DISTANCE = 2.4
export const EAT_HEAL_AMOUNT = 2

export const INITIAL_ROCK_HEALTH = 3
export const INITIAL_PLAYER_HEALTH = 5
export const INITIAL_NPC_HEALTH = 3

export type NpcDefinition = {
  id: string
  positionXZ: [number, number]
  scale: number
  rotationY: number
}

export const NPC_DEFINITIONS: NpcDefinition[] = [
  { id: 'npc-1', positionXZ: [-6, -3], scale: 0.42, rotationY: 0.7 },
  { id: 'npc-2', positionXZ: [-4, 5], scale: 0.36, rotationY: -0.8 },
  { id: 'npc-3', positionXZ: [2, 7], scale: 0.48, rotationY: 2.4 },
]
