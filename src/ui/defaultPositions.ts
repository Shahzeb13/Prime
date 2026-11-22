import type { FormType } from './formTypes'
import { CATEGORY_OPTIONS } from './formTypes'
import { FORM_FIELDS } from './fields'

export interface FieldPosition {
  top: number
  left: number
  width?: number
  height?: number
  fontSize?: number
}

export type PagePositions = Record<string, FieldPosition>

export type PositionsMap = Record<FormType, PagePositions[]>

const ALL_FORM_TYPES: FormType[] = ['application', 'schedule', 'booking', 'open_file']

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

      if (formType === 'open_file') {
        // Top underlined fields
        pos['name'] = { top: 29.5, left: 15.0, width: 320, height: 26, fontSize: 13 }
        pos['s_d_w_o'] = { top: 29.5, left: 61.0, width: 280, height: 26, fontSize: 13 }
        pos['cnic'] = { top: 32.8, left: 15.0, width: 320, height: 26, fontSize: 13 }
        pos['date'] = { top: 32.8, left: 61.0, width: 280, height: 26, fontSize: 13 }
        pos['address'] = { top: 36.2, left: 22.0, width: 620, height: 26, fontSize: 13 }

        // Middle labeled fields (A: B)
        pos['security_no'] = { top: 40.5, left: 13.5, width: 260, height: 26, fontSize: 13 }
        pos['plot_size'] = { top: 40.5, left: 47.5, width: 260, height: 26, fontSize: 13 }
        pos['block_no'] = { top: 43.2, left: 13.5, width: 260, height: 26, fontSize: 13 }
        pos['plot_type'] = { top: 43.2, left: 47.5, width: 260, height: 26, fontSize: 13 }
        pos['street_no'] = { top: 45.9, left: 13.5, width: 260, height: 26, fontSize: 13 }
        pos['plot_no'] = { top: 45.9, left: 47.5, width: 260, height: 26, fontSize: 13 }
        pos['membership_no'] = { top: 48.6, left: 13.5, width: 380, height: 26, fontSize: 13 }

        // QR Code image field on right side
        pos['qr_code'] = { top: 38.5, left: 78.0, width: 110, height: 110 }

        // Bottom right field
        pos['paid_amount'] = { top: 91.2, left: 70.0, width: 180, height: 26, fontSize: 14 }
        return pos
      }

      for (const meta of metas) {
        if (meta.type === 'image') {
          pos[meta.id] = { top: 13.0, left: 75.5, width: 135, height: 165 }
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