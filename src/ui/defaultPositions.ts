import type { FormType } from './formTypes'
import { CATEGORY_OPTIONS } from './formTypes'
import { FORM_FIELDS } from './fields'

export interface FieldPosition {
  top: number
  left: number
  width?: number
  height?: number
}

export type PagePositions = Record<string, FieldPosition>

export type PositionsMap = Record<FormType, PagePositions[]>

const ALL_FORM_TYPES: FormType[] = ['application', 'schedule', 'booking']

const DEFAULT_WIDTH = 140

function parseWidth(width: string | undefined): number {
  const n = parseInt(width ?? '', 10)
  return Number.isFinite(n) ? n : DEFAULT_WIDTH
}

function buildDefaults(): PositionsMap {
  const map = {} as PositionsMap
  for (const formType of ALL_FORM_TYPES) {
    const pages = formType === 'booking' ? 2 : 1
    map[formType] = Array.from({ length: pages }, (_, pIdx) => {
      const metas = FORM_FIELDS[formType][pIdx]
      const pos: PagePositions = {}
      let catIdx = 0
      let fieldIdx = 0
      for (const meta of metas) {
        if (meta.type === 'image') {
          pos[meta.id] = { top: 4, left: 70, width: 110, height: 146 }
          continue
        }
        if (meta.type === 'category') {
          for (const opt of CATEGORY_OPTIONS) {
            const col = catIdx % 2
            const row = Math.floor(catIdx / 2)
            pos[`category:${opt}`] = { top: 10 + row * 6, left: 6 + col * 48 }
            catIdx++
          }
        } else {
          const col = fieldIdx % 3
          const row = Math.floor(fieldIdx / 3)
          pos[meta.id] = {
            top: 6 + row * 7,
            left: 4 + col * 33,
            width: parseWidth(meta.width),
          }
          fieldIdx++
        }
      }
      return pos
    })
  }
  return map
}

export const defaultPositions: PositionsMap = buildDefaults()

export function mergePositions(loaded: Partial<PositionsMap>): PositionsMap {
  const result = {} as PositionsMap
  for (const formType of ALL_FORM_TYPES) {
    result[formType] = defaultPositions[formType].map((page, i) => ({
      ...page,
      ...(loaded[formType]?.[i] ?? {}),
    }))
  }
  return result
}