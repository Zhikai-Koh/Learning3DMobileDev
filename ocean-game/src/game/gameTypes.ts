import type { RefObject } from 'react'
import type { Group } from 'three'

export type WorldRefs = {
  islandRef: RefObject<Group | null>
  rockRef: RefObject<Group | null>
}
