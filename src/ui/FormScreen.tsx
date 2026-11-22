import { useEffect, useRef, useState, type ReactNode } from 'react'
// Placeholder reference image (src/assets/form-reference.jpg). The real form
// photo is uploaded via "Upload form image" (persisted to userData), so this
// file only serves as a fallback until one is uploaded.
import formReferencePlaceholder from '../assets/form-reference.jpg'
import { FORM_TYPE_LABELS, CATEGORY_OPTIONS, type FormType } from './formTypes'
import type { FormData, FormFieldValue } from './formState'
import {
  defaultPositions,
  mergePositions,
  type FieldPosition,
  type PositionsMap,
} from './defaultPositions'
import { ALL_CATEGORY_KEYS, FORM_FIELDS, type FieldMeta } from './fields'

interface CustomFieldDef {
  id: string
  label: string
  formType: FormType
  pageIndex: number
  type: 'text' | 'date' | 'checkbox' | 'radio' | 'image'
  width?: string
  options?: string[]
}

interface Props {
  formType: FormType
  formData: FormData
  editingRecordId?: number | null
  onChange: (field: string, value: FormFieldValue) => void
  onBack: () => void
  onSave: (formType: FormType, data: unknown, recordId?: number | null) => Promise<number | null>
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

const usedCustomIds = new Set<string>()
const nextCustomId = (existing: CustomFieldDef[]) => {
  const taken = new Set(existing.map((c) => c.id))
  let n = existing.length + 1
  for (;;) {
    const id = `custom_${n.toString(36)}`
    if (!taken.has(id) && !usedCustomIds.has(id)) {
      usedCustomIds.add(id)
      return id
    }
    n += 1
  }
}

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

interface DragState {
  fieldKey: string
  mode: 'move' | 'resize' | 'marquee'
  startX: number
  startY: number
  origTop: number
  origLeft: number
  origWidth: number
  origHeight: number
  dir: ResizeDir | null
  moved: boolean
  groupOrigPositions?: Record<string, { top: number; left: number }>
}

function metaForKey(pageMeta: FieldMeta[], key: string): FieldMeta {
  const sep = key.indexOf(':')
  if (sep > 0) {
    const group = key.slice(0, sep)
    if (group === 'category') {
      return pageMeta.find((m) => m.type === 'category') ?? pageMeta[0]
    }
    return pageMeta.find((m) => m.id === group) ?? pageMeta[0]
  }
  return pageMeta.find((m) => m.id === key) ?? pageMeta[0]
}

export default function FormScreen({
  formType,
  formData,
  editingRecordId,
  onChange,
  onBack,
  onSave,
}: Props) {
  const [positions, setPositions] = useState<PositionsMap | null>(null)
  const [calibrate, setCalibrate] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [isDesignMode, setIsDesignMode] = useState(false)
  const [image, setImage] = useState<{ key: string; url: string } | null>(null)
  const [opacity, setOpacity] = useState(0.3)
  const [fitToPage, setFitToPage] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fitToPageMap')
        if (saved) {
          const map = JSON.parse(saved)
          const key = `${formType}:${pageIndex}`
          if (typeof map[key] === 'boolean') return map[key]
        }
      } catch {
        // ignore parse error
      }
    }
    return false
  })

  const [showDemoScale, setShowDemoScale] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('showDemoScale')
      if (saved != null) return saved === 'true'
    }
    return true
  })

  const handleToggleDemoScale = (checked: boolean) => {
    setShowDemoScale(checked)
    if (typeof window !== 'undefined') {
      localStorage.setItem('showDemoScale', String(checked))
    }
  }

  const [showCalibrationModal, setShowCalibrationModal] = useState(false)

  const [globalOffsetX, setGlobalOffsetX] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`globalOffset_${formType}`)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (typeof parsed.x === 'number') return parsed.x
        }
      } catch {}
    }
    return 0
  })

  const [globalOffsetY, setGlobalOffsetY] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`globalOffset_${formType}`)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (typeof parsed.y === 'number') return parsed.y
        }
      } catch {}
    }
    return 0
  })

  useEffect(() => {
    document.documentElement.style.setProperty('--global-offset-x', `${globalOffsetX}mm`)
    document.documentElement.style.setProperty('--global-offset-y', `${globalOffsetY}mm`)
  }, [globalOffsetX, globalOffsetY])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`globalOffset_${formType}`)
        if (saved) {
          const parsed = JSON.parse(saved)
          setGlobalOffsetX(typeof parsed.x === 'number' ? parsed.x : 0)
          setGlobalOffsetY(typeof parsed.y === 'number' ? parsed.y : 0)
          return
        }
      } catch {}
    }
    setGlobalOffsetX(0)
    setGlobalOffsetY(0)
  }, [formType])

  const handleOffsetChange = (x: number, y: number) => {
    setGlobalOffsetX(x)
    setGlobalOffsetY(y)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`globalOffset_${formType}`, JSON.stringify({ x, y }))
      } catch (e) {
        console.error('Error saving global offset:', e)
      }
    }
  }

  const handleToggleFitToPage = (checked: boolean) => {
    setFitToPage(checked)
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fitToPageMap')
        const map = saved ? JSON.parse(saved) : {}
        map[`${formType}:${pageIndex}`] = checked
        localStorage.setItem('fitToPageMap', JSON.stringify(map))
      } catch (e) {
        console.error('Error saving fitToPage setting:', e)
      }
    }
  }

  const toggleDesignMode = () => {
    setIsDesignMode((prev) => {
      if (prev) {
        setCalibrate(false)
        setShowPanel(false)
      }
      return !prev
    })
  }
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [marqueeBox, setMarqueeBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null)
  const [isRibbonCollapsed, setIsRibbonCollapsed] = useState(false)
  const [msg, setMsg] = useState('')
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([])
  const [hiddenFields, setHiddenFields] = useState<Record<FormType, string[]>>({
    application: [],
    schedule: [],
    booking: [],
    open_file: [],
  })
  const [addingField, setAddingField] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState<'text' | 'date' | 'checkbox' | 'radio' | 'image'>('text')
  const [newFieldOptions, setNewFieldOptions] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; key: string } | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewPage, setPreviewPage] = useState(0)
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [previewZoom, setPreviewZoom] = useState(1)

  const PAGE_PRESETS = [
    { label: 'Letter (8.5×11")', width: '215.9mm', height: '279.4mm' },
    { label: 'Legal (8.5×14")', width: '215.9mm', height: '355.6mm' },
    { label: '8.5×13" (custom)', width: '215.9mm', height: '330.2mm' },
    { label: 'A4 (210×297mm)', width: '210mm', height: '297mm' },
    { label: 'A5 (148×210mm)', width: '148mm', height: '210mm' },
  ] as const

  const [pageSize, setPageSize] = useState<{ width: string; height: string }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pageSize')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          // ignore parse errors, fall back to default
        }
      }
    }
    return { width: '215.9mm', height: '330.2mm' }
  })
  const [isCustomSize, setIsCustomSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pageSize')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          return !PAGE_PRESETS.some(p => p.width === parsed.width && p.height === parsed.height)
        } catch {
          // ignore
        }
      }
    }
    return false
  })

  const [customUnit, setCustomUnit] = useState<'mm' | 'in'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pageSize')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          return parsed.width.endsWith('in') ? 'in' : 'mm'
        } catch {
          // ignore
        }
      }
    }
    return 'mm'
  })

  const [customWidth, setCustomWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pageSize')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          const isPreset = PAGE_PRESETS.some(p => p.width === parsed.width && p.height === parsed.height)
          if (!isPreset) {
            return parsed.width.replace('mm', '').replace('in', '')
          }
        } catch {
          // ignore
        }
      }
    }
    return ''
  })

  const [customHeight, setCustomHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pageSize')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          const isPreset = PAGE_PRESETS.some(p => p.width === parsed.width && p.height === parsed.height)
          if (!isPreset) {
            return parsed.height.replace('mm', '').replace('in', '')
          }
        } catch {
          // ignore
        }
      }
    }
    return ''
  })

  const dragRef = useRef<DragState | null>(null)
  const pageRef = useRef<HTMLDivElement | null>(null)
  const positionsRef = useRef<PositionsMap>(defaultPositions)
  const clipboardRef = useRef<{
    label: string
    type: CustomFieldDef['type']
    width?: string
    options?: string[]
    position: FieldPosition
  } | null>(null)
  const placementRef = useRef(0)
  const historyRef = useRef<PositionsMap[]>([])
  const previewScrollRef = useRef<HTMLDivElement | null>(null)
  const panRef = useRef<{ x: number; y: number; sl: number; st: number } | null>(null)

  const pos = positions ?? defaultPositions

  useEffect(() => {
    positionsRef.current = positions ?? defaultPositions
  })

  useEffect(() => {
    placementRef.current = 0
  }, [formType, pageIndex])

  useEffect(() => {
    if (!positions) return
    const t = setTimeout(() => {
      if (window.electronAPI?.savePositions) {
        window.electronAPI.savePositions(positions)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [positions])

  const hiddenIds = hiddenFields[formType] ?? []
  const pageCustoms = customFields.filter(
    (c) => c.formType === formType && c.pageIndex === pageIndex,
  )
  const staticMeta = FORM_FIELDS[formType][pageIndex].filter((m) => !hiddenIds.includes(m.id))
  const staticKeys = staticMeta.flatMap((m) =>
    m.type === 'category' ? ALL_CATEGORY_KEYS : [m.id],
  )
  const pageMetaList = [
    ...staticMeta,
    ...pageCustoms.map(
      (c): FieldMeta => ({
        id: c.id,
        label: c.label,
        type: c.type,
        width: c.width,
        options: c.options,
      }),
    ),
  ] as FieldMeta[]
  const pageKeys = [
    ...staticKeys,
    ...pageCustoms.flatMap((c) =>
      c.type === 'radio'
        ? (c.options ?? []).map((o) => `${c.id}:${o}`)
        : [c.id],
    ),
  ]
  const pagePositions = pos[formType][pageIndex] ?? {}
  const totalPages = FORM_FIELDS[formType].length
  const previewScale = Math.min(
    1,
    (typeof window !== 'undefined' ? window.innerHeight - 220 : 900) / 1346,
  )
  const data = formData[formType] as unknown as Record<string, FormFieldValue>
  const shownImage =
    image && image.key === `${formType}:${pageIndex}` ? image.url : formReferencePlaceholder

  // Load positions/customFields/hiddenFields ONCE on mount only.
  // Using [formType] here caused a full reload from disk every time the user
  // switched forms, overwriting unsaved in-memory calibration changes.
  useEffect(() => {
    if (window.electronAPI?.loadPositions) {
      window.electronAPI.loadPositions().then((loaded) => {
        if (loaded && typeof loaded === 'object') {
          setPositions(mergePositions(loaded as Partial<PositionsMap>))
        }
      })
    }
    if (window.electronAPI?.loadCustomFields) {
      window.electronAPI.loadCustomFields().then((fields) => {
        if (Array.isArray(fields)) {
          const seen = new Set<string>()
          const deduped = (fields as CustomFieldDef[]).filter((c) => {
            const k = `${c.id}|${c.formType}|${c.pageIndex}`
            if (seen.has(k)) return false
            seen.add(k)
            return true
          })
          setCustomFields(deduped)
          for (const c of deduped) usedCustomIds.add(c.id)
          if (deduped.length !== fields.length && window.electronAPI?.saveCustomFields) {
            window.electronAPI.saveCustomFields(deduped)
          }
        }
      })
    }
    if (window.electronAPI?.loadHiddenFields) {
      window.electronAPI.loadHiddenFields().then(() => {
        const emptyHidden: Record<FormType, string[]> = {
          application: [],
          schedule: [],
          booking: [],
          open_file: [],
        }
        setHiddenFields(emptyHidden)
        if (window.electronAPI?.saveHiddenFields) {
          window.electronAPI.saveHiddenFields(emptyHidden)
        }
      })
    }
  }, [])

  useEffect(() => {
    if (window.electronAPI?.loadReferenceImage) {
      window.electronAPI.loadReferenceImage(formType, pageIndex).then((url) => {
        if (url) setImage({ key: `${formType}:${pageIndex}`, url })
      })
    }
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fitToPageMap')
        if (saved) {
          const map = JSON.parse(saved)
          const key = `${formType}:${pageIndex}`
          if (typeof map[key] === 'boolean') {
            setFitToPage(map[key])
            return
          }
        }
      } catch {
        // ignore
      }
    }
    setFitToPage(false)
  }, [formType, pageIndex])

  useEffect(() => {
    document.documentElement.style.setProperty('--page-width', pageSize.width)
    document.documentElement.style.setProperty('--page-height', pageSize.height)
    localStorage.setItem('pageSize', JSON.stringify(pageSize))
  }, [pageSize])

  // Arrow-key nudge: move all selected fields exactly 1px (or 5px with Shift) while in Calibrate mode.
  useEffect(() => {
    if (!calibrate) return
    const onKeyDown = (e: KeyboardEvent) => {
      const activeKeys = selectedKeys.length > 0 ? selectedKeys : selectedKey ? [selectedKey] : []
      if (activeKeys.length === 0) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
      if (!arrows.includes(e.key)) return
      e.preventDefault()
      const rect = pageRef.current?.getBoundingClientRect()
      const pw = rect?.width  || 816
      const ph = rect?.height || 1344
      const base = positionsRef.current ?? defaultPositions
      const pagePos = base[formType]?.[pageIndex] ?? {}
      const stepMult = e.shiftKey ? 5 : 1
      const dx = (stepMult / pw) * 100
      const dy = (stepMult / ph) * 100

      let nextPg = { ...pagePos }
      for (const k of activeKeys) {
        const p = pagePos[k] ?? { top: 5, left: 5 }
        let { top, left } = p
        if (e.key === 'ArrowUp')    top  = clamp(top  - dy, 0, 100)
        if (e.key === 'ArrowDown')  top  = clamp(top  + dy, 0, 100)
        if (e.key === 'ArrowLeft')  left = clamp(left - dx, 0, 100)
        if (e.key === 'ArrowRight') left = clamp(left + dx, 0, 100)
        nextPg[k] = { ...p, top, left }
      }

      const nextPages = base[formType].map((pg: Record<string, FieldPosition>, i: number) =>
        i === pageIndex ? nextPg : pg
      )
      const next = { ...base, [formType]: nextPages }
      positionsRef.current = next
      setPositions(next)
      if (window.electronAPI?.savePositions) window.electronAPI.savePositions(next)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [calibrate, selectedKey, selectedKeys, formType, pageIndex])

  const updatePosition = (fieldKey: string, p: FieldPosition) => {
    const base = positionsRef.current ?? defaultPositions
    const nextPages = base[formType].map((pg, i) =>
      i === pageIndex ? { ...pg, [fieldKey]: p } : pg,
    )
    const next = { ...base, [formType]: nextPages }
    positionsRef.current = next
    setPositions(next)
  }

  const setAndSavePosition = (fieldKey: string, p: FieldPosition) => {
    const base = positionsRef.current ?? defaultPositions
    const nextPages = base[formType].map((pg, i) =>
      i === pageIndex ? { ...pg, [fieldKey]: p } : pg,
    )
    const next = { ...base, [formType]: nextPages }
    setPositions(next)
    positionsRef.current = next
    if (window.electronAPI?.savePositions) {
      window.electronAPI.savePositions(next)
    }
  }

  const pushUndo = () => {
    const cur = positionsRef.current ?? defaultPositions
    const last = historyRef.current[historyRef.current.length - 1]
    if (last === cur) return
    historyRef.current.push(cur)
    if (historyRef.current.length > 50) historyRef.current.shift()
  }

  const editPosition = (fieldKey: string, p: FieldPosition) => {
    pushUndo()
    setAndSavePosition(fieldKey, p)
  }

  const activeTargetKeys = selectedKeys.length > 0
    ? selectedKeys
    : selectedKey
      ? [selectedKey]
      : []

  const currentHeaderFontSize = (() => {
    if (activeTargetKeys.length > 0) {
      const firstKey = activeTargetKeys[0]
      const p = pagePositions[firstKey]
      if (p?.fontSize) return p.fontSize
      if (p?.height) return Math.round(clamp(p.height * 0.65, 9, 120))
      return 13
    }
    for (const key of pageKeys) {
      const p = pagePositions[key]
      if (p?.fontSize) return p.fontSize
    }
    return 13
  })()

  const handleHeaderFontSizeChange = (newSize: number, forceAll: boolean = false) => {
    const clamped = clamp(newSize, 8, 120)
    const targets = forceAll || activeTargetKeys.length === 0
      ? pageKeys.filter((k) => metaForKey(pageMetaList, k).type !== 'image')
      : activeTargetKeys

    if (targets.length === 0) return

    pushUndo()

    const base = positionsRef.current ?? defaultPositions
    const curPagePos = base[formType]?.[pageIndex] ?? {}
    const nextPg = { ...curPagePos }

    for (const k of targets) {
      const existing = curPagePos[k] ?? { top: 5, left: 5 }
      nextPg[k] = { ...existing, fontSize: clamped }
    }

    const nextPages = base[formType].map((pg, i) => (i === pageIndex ? nextPg : pg))
    const next = { ...base, [formType]: nextPages }
    positionsRef.current = next
    setPositions(next)
    if (window.electronAPI?.savePositions) {
      window.electronAPI.savePositions(next)
    }
    setMsg(`Font size updated to ${clamped}px for ${targets.length} field${targets.length > 1 ? 's' : ''}.`)
  }

  const handleUndo = () => {
    const prev = historyRef.current.pop()
    if (!prev) {
      setMsg('Nothing to undo.')
      return
    }
    positionsRef.current = prev
    setPositions(prev)
    if (window.electronAPI?.savePositions) {
      window.electronAPI.savePositions(prev)
    }
    setMsg('Undid last layout change.')
  }

  const savePositions = (): Promise<boolean> => {
  return window.electronAPI?.savePositions(positionsRef.current) ?? Promise.resolve(false)
  }

  const handleSaveLayout = async () => {
    const ok = await savePositions()
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fitToPageMap')
        const map = saved ? JSON.parse(saved) : {}
        map[`${formType}:${pageIndex}`] = fitToPage
        localStorage.setItem('fitToPageMap', JSON.stringify(map))
      } catch (e) {
        console.error('Error saving fitToPage setting on Save Layout:', e)
      }
    }
    setMsg(ok ? 'Layout saved.' : 'Could not save layout.')
  }

  const handleExportLayout = async () => {
    if (!window.electronAPI?.exportLayout) {
      setMsg('Layout export works only inside the Electron app.')
      return
    }
    // Only export the current form's data
    const layout = {
      formType,
      positions: positionsRef.current?.[formType] ?? [],
      customFields: customFields.filter((c) => c.formType === formType),
      hiddenFields: hiddenFields[formType] ?? [],
      fitToPage,
    }
    const defaultFilename = `${formType}_form_layout.json`
    const ok = await window.electronAPI.exportLayout(JSON.stringify(layout, null, 2), defaultFilename)
    if (ok) {
      setMsg(`${formType} layout exported successfully.`)
    } else {
      setMsg('Layout export was cancelled or failed.')
    }
  }

  const handleImportLayout = async () => {
    if (
      !window.electronAPI?.importLayout ||
      !window.electronAPI?.savePositions ||
      !window.electronAPI?.saveCustomFields ||
      !window.electronAPI?.saveHiddenFields
    ) {
      setMsg('Layout import works only inside the Electron app.')
      return
    }
    const raw = (await window.electronAPI.importLayout()) as {
      formType?: string
      positions?: PositionsMap[FormType]
      customFields?: CustomFieldDef[]
      hiddenFields?: string[]
      fitToPage?: boolean
    } | null
    if (!raw) {
      setMsg('Layout import was cancelled or failed.')
      return
    }
    if (!raw.positions || !raw.customFields || !raw.hiddenFields || !raw.formType) {
      setMsg('Invalid layout file. Make sure it is a valid PrimeView layout export.')
      return
    }
    if (raw.formType !== formType) {
      setMsg(
        `Cannot import: file is for "${raw.formType}" form, but you are on "${formType}" form. Please open the correct form first.`
      )
      return
    }
    try {
      // Merge: only update the current form's slice, keep all other forms untouched
      const currentPositions = positionsRef.current
      const mergedPositions: PositionsMap = {
        ...currentPositions,
        [formType]: raw.positions,
      }

      // Keep custom fields for other forms, replace only this form's
      const otherCustomFields = customFields.filter((c) => c.formType !== formType)
      const mergedCustomFields = [...otherCustomFields, ...raw.customFields]

      // Keep hidden fields for other forms, replace only this form's
      const mergedHiddenFields: Record<FormType, string[]> = {
        ...hiddenFields,
        [formType]: raw.hiddenFields,
      }

      const savePosOk = await window.electronAPI.savePositions(mergedPositions)
      const saveFieldsOk = await window.electronAPI.saveCustomFields(mergedCustomFields)
      const saveHiddenOk = await window.electronAPI.saveHiddenFields(mergedHiddenFields)

      if (savePosOk && saveFieldsOk && saveHiddenOk) {
        positionsRef.current = mergedPositions
        setPositions(mergedPositions)
        setCustomFields(mergedCustomFields)
        setHiddenFields(mergedHiddenFields)
        if (typeof raw.fitToPage === 'boolean') {
          handleToggleFitToPage(raw.fitToPage)
        }
        setMsg(`${formType} layout imported and applied successfully!`)
      } else {
        setMsg('Could not save the imported layout files.')
      }
    } catch (err) {
      console.error(err)
      setMsg('Error applying imported layout.')
    }
  }

  const isCustomField = (id: string) => customIdForKey(id) !== null

  const customIdForKey = (key: string): string | null => {
    if (!key.startsWith('custom_')) return null
    const sep = key.indexOf(':')
    return sep > 0 ? key.slice(0, sep) : key
  }

  const selectKey = (key: string | null, multi = false) => {
    if (!key) {
      setSelectedKey(null)
      setSelectedKeys([])
      setRenameValue('')
      return
    }

    if (multi) {
      setSelectedKeys((prev) => {
        const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        const lastKey = next[next.length - 1] ?? null
        setSelectedKey(lastKey)
        if (lastKey) {
          const defId = customIdForKey(lastKey)
          const def = defId ? customFields.find((c) => c.id === defId) : undefined
          setRenameValue(def?.label ?? '')
        } else {
          setRenameValue('')
        }
        return next
      })
    } else {
      setSelectedKeys((prev) => {
        if (prev.length > 1 && prev.includes(key)) {
          setSelectedKey(key)
          return prev
        }
        setSelectedKey(key)
        const defId = customIdForKey(key)
        const def = defId ? customFields.find((c) => c.id === defId) : undefined
        setRenameValue(def?.label ?? '')
        return [key]
      })
    }
  }

  const persistCustomFields = (defs: CustomFieldDef[]) => {
    if (window.electronAPI?.saveCustomFields) {
      window.electronAPI.saveCustomFields(defs)
    }
  }

  const handleAddField = () => {
    const name = newFieldName.trim()
    if (!name) return
    pushUndo()
    const id = nextCustomId(customFields)
    const options =
      newFieldType === 'radio'
        ? newFieldOptions
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined
    const def: CustomFieldDef = {
      id,
      label: name,
      formType,
      pageIndex,
      type: newFieldType,
      width: '140px',
      options,
    }
    const next = [...customFields, def]
    setCustomFields(next)
    persistCustomFields(next)
    const n = placementRef.current++
    const baseTop = 20 + (n % 10) * 4
    const baseLeft = 10 + Math.floor(n / 10) * 6
    if (newFieldType === 'radio') {
      ;(options ?? []).forEach((opt, i) => {
        setAndSavePosition(`${id}:${opt}`, { top: baseTop + i * 4, left: baseLeft, width: 140 })
      })
    } else {
      setAndSavePosition(id, {
        top: baseTop,
        left: baseLeft,
        width: newFieldType === 'image' ? 110 : 140,
        height: newFieldType === 'image' ? 146 : undefined,
      })
    }
    setNewFieldName('')
    setNewFieldOptions('')
    setAddingField(false)
    selectKey(newFieldType === 'radio' ? `${id}:${options?.[0] ?? ''}` : id)
    setMsg(
      newFieldType === 'radio'
        ? `Added radio field "${name}". Drag its options into place.`
        : `Added field "${name}". Drag it into place.`,
    )
  }

  const handleDeleteField = (key: string) => {
    pushUndo()
    const base = positionsRef.current ?? defaultPositions
    const defId = customIdForKey(key)
    if (defId) {
      const next = customFields.filter((c) => c.id !== defId)
      setCustomFields(next)
      persistCustomFields(next)
    } else {
      const meta = metaForKey(pageMetaList, key)
      const baseId = meta.type === 'category' ? meta.id : key
      const current = hiddenFields[formType] ?? []
      const nextHidden = { ...hiddenFields, [formType]: [...current, baseId] }
      setHiddenFields(nextHidden)
      if (window.electronAPI?.saveHiddenFields) {
        window.electronAPI.saveHiddenFields(nextHidden)
      }
    }
    const removedKeys =
      customIdForKey(key) !== null
        ? (() => {
            const id = customIdForKey(key)!
            const def = customFields.find((c) => c.id === id)
            return def?.type === 'radio'
              ? (def.options ?? []).map((o) => `${id}:${o}`)
              : [id]
          })()
        : metaForKey(pageMetaList, key).type === 'category'
          ? ALL_CATEGORY_KEYS
          : [key]
    const nextPages = base[formType].map((pg, i) => {
      if (i !== pageIndex) return pg
      const copy = { ...pg }
      for (const k of Object.keys(copy)) {
        if (removedKeys.includes(k) || k.startsWith(`${defId}:`)) delete copy[k]
      }
      return copy
    })
    const nextPos = { ...base, [formType]: nextPages }
    positionsRef.current = nextPos
    setPositions(nextPos)
    if (window.electronAPI?.savePositions) {
      window.electronAPI.savePositions(nextPos)
    }
    if (selectedKey === key || selectedKey === defId) selectKey(null)
  }

  const handleRestoreHidden = () => {
    const restored = hiddenFields[formType] ?? []
    if (!restored.length) return
    pushUndo()
    const nextHidden = { ...hiddenFields, [formType]: [] }
    setHiddenFields(nextHidden)
    if (window.electronAPI?.saveHiddenFields) {
      window.electronAPI.saveHiddenFields(nextHidden)
    }
    const base = positionsRef.current ?? defaultPositions
    const nextPages = base[formType].map((pg, i) => {
      const copy = { ...pg }
      for (const id of restored) {
        const keys = id === 'category' ? ALL_CATEGORY_KEYS : [id]
        for (const k of keys) {
          copy[k] = defaultPositions[formType][i]?.[k] ?? { top: 5, left: 5 }
        }
      }
      return copy
    })
    const nextPos = { ...base, [formType]: nextPages }
    positionsRef.current = nextPos
    setPositions(nextPos)
    if (window.electronAPI?.savePositions) {
      window.electronAPI.savePositions(nextPos)
    }
    setMsg('Removed fields restored to the form.')
  }

  const copyField = (key: string) => {
    if (!key) {
      setMsg('Select a field first (click it).')
      return
    }
    const defId = customIdForKey(key)
    const p = pagePositions[key] ?? { top: 5, left: 5 }
    let label: string
    let type: CustomFieldDef['type']
    let options: string[] | undefined
    let basePos: FieldPosition = p
    if (defId) {
      const def = customFields.find((c) => c.id === defId)
      if (!def) return
      label = def.label
      type = def.type
      options = def.options
      if (type === 'radio') {
        const firstKey = `${defId}:${def.options?.[0] ?? ''}`
        basePos = pagePositions[firstKey] ?? p
      }
    } else {
      const meta = metaForKey(pageMetaList, key)
      if (meta.type === 'category') {
        setMsg('Category block cannot be copied.')
        return
      }
      label = meta.label
      type =
        meta.type === 'date'
          ? 'date'
          : meta.type === 'checkbox'
            ? 'checkbox'
            : meta.type === 'image'
              ? 'image'
              : 'text'
      options = undefined
    }
    clipboardRef.current = {
      label,
      type,
      width: `${p.width ?? 140}px`,
      options,
      position: basePos,
    }
    setMsg(`Copied "${label}". Right-click anywhere to paste (or Ctrl+V).`)
  }

  const pasteAt = (point?: { x: number; y: number } | null) => {
    const clip = clipboardRef.current
    if (!clip) {
      setMsg('Nothing copied yet. Right-click a field and Copy first.')
      return
    }
    pushUndo()
    const id = nextCustomId(customFields)
    const def: CustomFieldDef = {
      id,
      label: clip.label,
      formType,
      pageIndex,
      type: clip.type,
      width: clip.width,
      options: clip.options,
    }
    const next = [...customFields, def]
    setCustomFields(next)
    persistCustomFields(next)
    let base: FieldPosition
    if (point && pageRef.current) {
      const rect = pageRef.current.getBoundingClientRect()
      base = {
        top: clamp(((point.y - rect.top) / rect.height) * 100, 0, 96),
        left: clamp(((point.x - rect.left) / rect.width) * 100, 0, 96),
        width: clip.position.width,
        height: clip.position.height,
      }
    } else {
      const n = placementRef.current++
      base = {
        top: clamp(clip.position.top + 2 + n * 2, 0, 96),
        left: clamp(clip.position.left + 2 + n * 2, 0, 96),
        width: clip.position.width,
        height: clip.position.height,
      }
    }
    const place = (k: string, b: FieldPosition) =>
      setAndSavePosition(k, {
        top: b.top,
        left: b.left,
        width: b.width,
        height: b.height,
      })
    if (clip.type === 'radio') {
      ;(clip.options ?? []).forEach((o, i) => place(`${id}:${o}`, { ...base, top: base.top + i * 4 }))
    } else {
      place(id, base)
    }
    selectKey(clip.type === 'radio' ? `${id}:${clip.options?.[0] ?? ''}` : id)
    setMsg(`Pasted "${clip.label}" here.`)
  }

  const renameField = () => {
    if (!selectedKey) return
    const defId = customIdForKey(selectedKey)
    if (!defId) return
    const name = renameValue.trim()
    if (!name) {
      setMsg('Enter a name first.')
      return
    }
    const next = customFields.map((c) => (c.id === defId ? { ...c, label: name } : c))
    setCustomFields(next)
    persistCustomFields(next)
    setMsg(`Renamed to "${name}".`)
  }

  const openContextMenu = (e: React.MouseEvent, key: string | null) => {
    e.preventDefault()
    e.stopPropagation()
    selectKey(key)
    setCtxMenu({ x: e.clientX, y: e.clientY, key: key ?? '' })
  }

  const closeContextMenu = () => setCtxMenu(null)

  const menuCopy = () => {
    if (ctxMenu) copyField(ctxMenu.key)
    closeContextMenu()
  }

  const menuCut = () => {
    if (!ctxMenu) return
    const meta = metaForKey(pageMetaList, ctxMenu.key)
    if (meta.type !== 'category') copyField(ctxMenu.key)
    handleDeleteField(ctxMenu.key)
    closeContextMenu()
  }

  const menuPaste = () => {
    if (ctxMenu) pasteAt({ x: ctxMenu.x, y: ctxMenu.y })
    closeContextMenu()
  }

  const menuRename = () => {
    setShowPanel(true)
    closeContextMenu()
  }

  const menuDelete = () => {
    if (ctxMenu) handleDeleteField(ctxMenu.key)
    closeContextMenu()
  }

  const menuResetPosition = () => {
    if (!ctxMenu) return
    pushUndo()
    const def =
      defaultPositions[formType][pageIndex]?.[ctxMenu.key] ?? { top: 30, left: 10, width: 140 }
    setAndSavePosition(ctxMenu.key, def)
    setMsg('Reset field to its default position.')
    closeContextMenu()
  }

  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    window.addEventListener('click', close)
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('blur', close)
    }
  }, [ctxMenu])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!calibrate) return
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) {
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        if (selectedKey) copyField(selectedKey)
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        pasteAt(null)
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault()
        if (selectedKey) {
          copyField(selectedKey)
          handleDeleteField(selectedKey)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const handleMouseMove = (e: MouseEvent) => {
    const drag = dragRef.current
    const page = pageRef.current
    if (!drag || !page) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 2) {
      drag.moved = true
    }

    if (drag.mode === 'marquee') {
      if (e.clientY > window.innerHeight - 60) {
        window.scrollBy({ top: 15, behavior: 'auto' })
      } else if (e.clientY < 60) {
        window.scrollBy({ top: -15, behavior: 'auto' })
      }

      const pRect = pageRef.current?.getBoundingClientRect()
      if (pRect) {
        const pageX = e.clientX - pRect.left
        const pageY = e.clientY - pRect.top

        setMarqueeBox({
          startX: drag.startX,
          startY: drag.startY,
          currentX: pageX,
          currentY: pageY,
        })

        const boxMinX = Math.min(drag.startX, pageX)
        const boxMaxX = Math.max(drag.startX, pageX)
        const boxMinY = Math.min(drag.startY, pageY)
        const boxMaxY = Math.max(drag.startY, pageY)

        const foundKeys: string[] = []
        const pagePos = (positionsRef.current ?? defaultPositions)[formType]?.[pageIndex] ?? {}
        for (const key of pageKeys) {
          const p = pagePos[key] ?? { top: 5, left: 5 }
          const meta = metaForKey(pageMetaList, key)
          const fWidth = p.width ?? (meta.type === 'image' ? 110 : 140)
          const fHeight = p.height ?? (meta.type === 'image' ? 146 : 24)

          const fLeftPx = (p.left / 100) * pRect.width
          const fTopPx = (p.top / 100) * pRect.height
          const fRightPx = fLeftPx + fWidth
          const fBottomPx = fTopPx + fHeight

          if (
            fRightPx >= boxMinX &&
            fLeftPx <= boxMaxX &&
            fBottomPx >= boxMinY &&
            fTopPx <= boxMaxY
          ) {
            foundKeys.push(key)
          }
        }
        if (foundKeys.length > 0) {
          setSelectedKeys(foundKeys)
          setSelectedKey(foundKeys[0])
        }
      }
      return
    }

    const rect = page.getBoundingClientRect()
    if (drag.mode === 'resize') {
      const dir = drag.dir ?? 'e'
      let top = drag.origTop
      let left = drag.origLeft
      let width = drag.origWidth
      let height = drag.origHeight
      if (dir.includes('e')) width = clamp(drag.origWidth + dx, 30, 900)
      if (dir.includes('w')) {
        width = clamp(drag.origWidth - dx, 30, 900)
        left = drag.origLeft + (drag.origWidth - width)
      }
      if (dir.includes('s')) height = clamp(drag.origHeight + dy, 14, 1100)
      if (dir.includes('n')) {
        height = clamp(drag.origHeight - dy, 14, 1100)
        top = drag.origTop + (drag.origHeight - height)
      }
      const meta = metaForKey(pageMetaList, drag.fieldKey)
      const next: FieldPosition = { top, left, width }
      if (dir.includes('n') || dir.includes('s') || height !== drag.origHeight) {
        next.height = height
        if (meta.type !== 'image') {
          next.fontSize = Math.round(clamp(height * 0.65, 9, 120))
        }
      }
      updatePosition(drag.fieldKey, next)
      return
    }

    const dyPercent = (dy / rect.height) * 100
    const dxPercent = (dx / rect.width) * 100

    if (drag.groupOrigPositions && Object.keys(drag.groupOrigPositions).length > 1) {
      const group = drag.groupOrigPositions
      const keys = Object.keys(group)
      const base = positionsRef.current ?? defaultPositions
      const curPagePos = base[formType]?.[pageIndex] ?? {}
      const nextPg = { ...curPagePos }

      for (const k of keys) {
        const orig = group[k]
        const newTop = clamp(orig.top + dyPercent, 0, 100)
        const newLeft = clamp(orig.left + dxPercent, 0, 100)
        const existing = curPagePos[k] ?? { top: 5, left: 5 }
        nextPg[k] = { ...existing, top: newTop, left: newLeft }
      }

      const nextPages = base[formType].map((pg, i) => (i === pageIndex ? nextPg : pg))
      const next = { ...base, [formType]: nextPages }
      positionsRef.current = next
      setPositions(next)
      return
    }

    const top = clamp(drag.origTop + dyPercent, 0, 100)
    const left = clamp(drag.origLeft + dxPercent, 0, 100)
    updatePosition(drag.fieldKey, { top, left })
  }

  const stopDragging = () => {
    const drag = dragRef.current
    const moved = drag?.moved
    dragRef.current = null
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', stopDragging)

    if (drag?.mode === 'marquee') {
      setMarqueeBox((m) => {
        if (moved && m && pageRef.current) {
          const pRect = pageRef.current.getBoundingClientRect()
          const boxMinX = Math.min(m.startX, m.currentX)
          const boxMaxX = Math.max(m.startX, m.currentX)
          const boxMinY = Math.min(m.startY, m.currentY)
          const boxMaxY = Math.max(m.startY, m.currentY)

          const foundKeys: string[] = []
          const pagePos = (positionsRef.current ?? defaultPositions)[formType]?.[pageIndex] ?? {}
          for (const key of pageKeys) {
            const p = pagePos[key] ?? { top: 5, left: 5 }
            const meta = metaForKey(pageMetaList, key)
            const fWidth = p.width ?? (meta.type === 'image' ? 110 : 140)
            const fHeight = p.height ?? (meta.type === 'image' ? 146 : 24)

            const fLeftPx = (p.left / 100) * pRect.width
            const fTopPx = (p.top / 100) * pRect.height
            const fRightPx = fLeftPx + fWidth
            const fBottomPx = fTopPx + fHeight

            if (
              fRightPx >= boxMinX &&
              fLeftPx <= boxMaxX &&
              fBottomPx >= boxMinY &&
              fTopPx <= boxMaxY
            ) {
              foundKeys.push(key)
            }
          }
          if (foundKeys.length > 0) {
            setSelectedKeys(foundKeys)
            setSelectedKey(foundKeys[0])
          }
        }
        return null
      })
      return
    }

    savePositions()
  }

  const startDrag = (e: React.MouseEvent, fieldKey: string, p: FieldPosition) => {
    const isMultiClick = e.shiftKey || e.ctrlKey
    selectKey(fieldKey, isMultiClick)
    if (!calibrate) return
    pushUndo()
    e.preventDefault()

    const currentGroup = selectedKeys.includes(fieldKey) ? selectedKeys : [fieldKey]
    let groupOrigPositions: Record<string, { top: number; left: number }> | undefined
    if (currentGroup.length > 1) {
      const base = positionsRef.current ?? defaultPositions
      const pagePos = base[formType]?.[pageIndex] ?? {}
      groupOrigPositions = {}
      for (const k of currentGroup) {
        const itemP = pagePos[k] ?? { top: 5, left: 5 }
        groupOrigPositions[k] = { top: itemP.top, left: itemP.left }
      }
    }

    dragRef.current = {
      fieldKey,
      mode: 'move',
      startX: e.clientX,
      startY: e.clientY,
      origTop: p.top,
      origLeft: p.left,
      origWidth: p.width ?? 140,
      origHeight: p.height ?? 0,
      dir: null,
      moved: false,
      groupOrigPositions,
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', stopDragging)
  }

  const startMarquee = (e: React.MouseEvent) => {
    if (!calibrate && !isDesignMode) return
    const target = e.target as HTMLElement
    if (target.closest('.pos-field') || target.closest('button') || target.closest('input')) return
    if (!e.shiftKey && !e.ctrlKey) {
      selectKey(null)
    }
    const pRect = pageRef.current?.getBoundingClientRect()
    const pageX = pRect ? e.clientX - pRect.left : e.clientX
    const pageY = pRect ? e.clientY - pRect.top : e.clientY

    setMarqueeBox({
      startX: pageX,
      startY: pageY,
      currentX: pageX,
      currentY: pageY,
    })
    dragRef.current = {
      fieldKey: '',
      mode: 'marquee',
      startX: pageX,
      startY: pageY,
      origTop: 0,
      origLeft: 0,
      origWidth: 0,
      origHeight: 0,
      dir: null,
      moved: false,
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', stopDragging)
  }

  const startResize = (e: React.MouseEvent, fieldKey: string, p: FieldPosition, dir: ResizeDir) => {
    selectKey(fieldKey)
    if (!calibrate) return
    e.preventDefault()
    e.stopPropagation()
    const meta = metaForKey(pageMetaList, fieldKey)
    const defaultH = meta.type === 'image' ? 146 : (p.height ?? 28)
    dragRef.current = {
      fieldKey,
      mode: 'resize',
      startX: e.clientX,
      startY: e.clientY,
      origTop: p.top,
      origLeft: p.left,
      origWidth: p.width ?? (meta.type === 'image' ? 110 : 140),
      origHeight: p.height ?? defaultH,
      dir,
      moved: false,
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', stopDragging)
  }

  const handlePageClick = (e: React.MouseEvent) => {
    if (!calibrate) return
    if (e.shiftKey) {
      if (selectedKey && pageRef.current) {
        const rect = pageRef.current.getBoundingClientRect()
        const top = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100)
        const left = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100)
        editPosition(selectedKey, { top, left })
      }
      return
    }
  }

  const handleReset = () => {
    if (selectedKey) {
      pushUndo()
      const def =
        defaultPositions[formType][pageIndex]?.[selectedKey] ?? { top: 30, left: 10, width: 140 }
      setAndSavePosition(selectedKey, def)
      setMsg('Reset selected field to its default position.')
      return
    }
    if (!window.confirm('Reset ALL field positions for this form? You can Undo afterwards.')) {
      return
    }
    pushUndo()
    const fresh = mergePositions({})
    const customKeys = new Set<string>()
    for (const c of customFields) {
      if (c.formType !== formType || c.pageIndex !== pageIndex) continue
      if (c.type === 'radio') {
        ;(c.options ?? []).forEach((o) => customKeys.add(`${c.id}:${o}`))
      } else {
        customKeys.add(c.id)
      }
    }
    if (customKeys.size) {
      const cur = positionsRef.current ?? defaultPositions
      fresh[formType] = fresh[formType].map((pg, i) => {
        const copy = { ...pg }
        const curPg = cur[formType][i] ?? {}
        for (const k of Object.keys(curPg)) {
          if (customKeys.has(k)) copy[k] = curPg[k]
        }
        return copy
      })
    }
    setPositions(fresh)
    positionsRef.current = fresh
    if (window.electronAPI?.savePositions) {
      window.electronAPI.savePositions(fresh)
    }
    setMsg('All built-in field positions reset to defaults.')
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      if (window.electronAPI?.saveReferenceImage) {
        await window.electronAPI.saveReferenceImage(formType, pageIndex, dataUrl)
      }
      setImage({ key: `${formType}:${pageIndex}`, url: dataUrl })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const saveToDb = async (asNewRecord = false): Promise<number | null> => {
    const targetId = asNewRecord ? null : (editingRecordId ?? null)
    const id = await onSave(formType, formData[formType], targetId)
    if (id != null) {
      if (targetId) {
        setMsg(`Record #${targetId} updated successfully.`)
      } else {
        setMsg(`Record saved successfully (Record #${id}).`)
      }
    } else {
      setMsg('Could not save submission to database.')
    }
    return id
  }

  const DUMMY_PHOTO =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="110" height="146">' +
        '<rect width="100%" height="100%" fill="#71a38b"/>' +
        '<text x="50%" y="50%" fill="#ffffff" font-family="Arial" font-size="20" font-weight="bold" text-anchor="middle" dominant-baseline="middle">PV</text>' +
        '</svg>',
    )

  const dummyTextFor = (label: string) => {
    const L = label.toUpperCase()
    if (/CNIC/.test(L)) return '61101-1234567-8'
    if (/CONTACT|PHONE|MOBILE/.test(L)) return '0300-1234567'
    if (/EMAIL/.test(L)) return 'applicant@primeview.pk'
    if (/SHOP|APARTMENT/.test(L)) return 'Shop'
    if (/TYPE/.test(L)) return 'Residential'
    if (/MEMBERSHIP/.test(L)) return 'PV-0001'
    if (/NAME/.test(L)) return 'Muhammad Shahzeb'
    if (/ADDRESS|MAILING/.test(L)) return 'Main G.T. Road, Abbottabad'
    if (/BANK|BRANCH/.test(L)) return 'HBL G.T. Road Branch'
    if (/WORDS/.test(L)) return 'Five Hundred Thousand Rupees Only'
    if (/AMOUNT/.test(L)) return '500000'
    if (/INSTALLMENT/.test(L)) return '20000'
    if (/PRICE|PAYMENT|DOWN/.test(L)) return '100000'
    if (/BLOCK/.test(L)) return 'B'
    if (/STREET/.test(L)) return '2'
    if (/PLOT/.test(L)) return '14'
    if (/SIZE/.test(L)) return '10 Marla'
    if (/RELATION/.test(L)) return 'Son'
    if (/SIGN/.test(L)) return 'Muhammad Shahzeb'
    if (/PROJECT/.test(L)) return 'Prime View Housing Society'
    if (/REMARKS/.test(L)) return 'Demo entry for print test'
    return `Sample ${label}`
  }

  const handleFillDummy = () => {
    FORM_FIELDS[formType].forEach((page) => {
      page.forEach((meta) => {
        if (meta.type === 'category') {
          onChange('category', CATEGORY_OPTIONS[0])
        } else if (meta.type === 'checkbox') {
          onChange(meta.id, true)
        } else if (meta.type === 'image') {
          onChange(meta.id, DUMMY_PHOTO)
        } else if (meta.type === 'date') {
          onChange(meta.id, '2026-01-15')
        } else if (meta.type === 'radio') {
          onChange(meta.id, meta.options?.[0] ?? '')
        } else {
          onChange(meta.id, dummyTextFor(meta.label))
        }
      })
    })
    customFields
      .filter((c) => c.formType === formType)
      .forEach((c) => {
        if (c.type === 'checkbox') onChange(c.id, true)
        else if (c.type === 'radio') onChange(c.id, c.options?.[0] ?? '')
        else if (c.type === 'image') onChange(c.id, DUMMY_PHOTO)
        else if (c.type === 'date') onChange(c.id, '2026-01-15')
        else onChange(c.id, dummyTextFor(c.label))
      })
    setMsg('Filled all fields with demo data.')
  }

  const handleClearData = () => {
    FORM_FIELDS[formType].forEach((page) => {
      page.forEach((meta) => {
        if (meta.type === 'category') {
          onChange('category', '')
        } else if (meta.type === 'checkbox') {
          onChange(meta.id, false)
        } else {
          onChange(meta.id, '')
        }
      })
    })
    customFields
      .filter((c) => c.formType === formType)
      .forEach((c) => {
        if (c.type === 'checkbox') onChange(c.id, false)
        else onChange(c.id, '')
      })
    setMsg('Cleared all form input fields.')
  }
  void [handleFillDummy, handleClearData]

  const openPreview = async () => {
    if (!window.electronAPI?.loadReferenceImage) return
    const total = FORM_FIELDS[formType].length
    const imgs: string[] = []
    for (let i = 0; i < total; i++) {
      const url = await window.electronAPI.loadReferenceImage(formType, i)
      imgs.push(url ?? formReferencePlaceholder)
    }
    setPreviewImages(imgs)
    setPreviewPage(pageIndex)
    setPreviewZoom(1)
    setShowPreview(true)
  }

  const zoomPreview = (factor: number) => {
    setPreviewZoom((z) => clamp(z * factor, 0.2, 4))
  }

  const fitPreview = () => setPreviewZoom(1)

  useEffect(() => {
    const el = previewScrollRef.current
    if (!el || !showPreview) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
        zoomPreview(e.deltaY < 0 ? 1.15 : 1 / 1.15)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [showPreview])

  const parseToMicrons = (val: string): number => {
    const num = parseFloat(val)
    if (isNaN(num)) return 0
    if (val.endsWith('mm')) {
      return Math.round(num * 1000)
    }
    if (val.endsWith('in')) {
      return Math.round(num * 25400)
    }
    return Math.round(num * 1000)
  }

  const doPrint = async (silent: boolean) => {
    if (!window.electronAPI?.dialogPrint || !window.electronAPI?.silentPrint) {
      setMsg('Printing works inside the Electron app (in a browser use Ctrl+P).')
      return
    }
    const widthMicrons = parseToMicrons(pageSize.width)
    const heightMicrons = parseToMicrons(pageSize.height)
    const sizeParam =
      widthMicrons && heightMicrons ? { width: widthMicrons, height: heightMicrons } : undefined

    const res = silent
      ? await window.electronAPI.silentPrint(sizeParam)
      : await window.electronAPI.dialogPrint(sizeParam)
    if (res?.success) {
      const id = await saveToDb()
      setMsg(
        id != null
          ? `Printed successfully. Data saved to database (record #${id}).`
          : 'Printed successfully, but could not save to database.',
      )
    } else {
      setMsg(
        `Print failed${res?.failureReason ? `: ${res.failureReason}` : '.'} Data was NOT saved.`,
      )
    }
    setShowPreview(false)
  }

  const handlePrint = () => {
    if (!window.electronAPI?.dialogPrint || !window.electronAPI?.silentPrint) {
      setMsg('Printing works inside the Electron app (in a browser use Ctrl+P).')
      return
    }
    openPreview()
  }

  const renderPrintContent = (key: string, metaList: FieldMeta[]): ReactNode => {
    const meta = metaForKey(metaList, key)
    const p = pos[formType]?.[pageIndex]?.[key] ?? { top: 5, left: 5 }
    const fs = p.fontSize ?? (p.height ? Math.round(clamp(p.height * 0.65, 9, 120)) : undefined)

    if (meta.type === 'image') {
      const src = typeof data[key] === 'string' ? (data[key] as string) : ''
      return src ? <img className="print-photo" src={src} alt="" /> : null
    }
    if (meta.type === 'category' || meta.type === 'radio') {
      const sep = key.indexOf(':')
      const group = sep > 0 ? key.slice(0, sep) : 'category'
      const opt = sep > 0 ? key.slice(sep + 1) : ''
      const selected = data[group]
      return selected === opt ? (
        <span className="tick-box" style={{ fontSize: fs ? `${fs}px` : undefined }}>
          ✔
        </span>
      ) : null
    }
    const v = data[key]
    if (typeof v === 'boolean') {
      return v ? (
        <span className="tick-box" style={{ fontSize: fs ? `${fs}px` : undefined }}>
          ✔
        </span>
      ) : null
    }
    let s = typeof v === 'string' ? v : ''
    if (meta.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [yyyy, mm, dd] = s.split('-')
      s = `${dd}/${mm}/${yyyy}`
    }
    if (!s && !meta.showLabel) return null
    if (meta.showLabel) {
      return (
        <span className="print-value-labeled" style={{ fontSize: fs ? `${fs}px` : undefined }}>
          <strong className="print-label-prefix">{meta.label}: </strong>
          <span className="print-value-text">{s}</span>
        </span>
      )
    }
    return (
      <span className="print-value" style={{ fontSize: fs ? `${fs}px` : undefined }}>
        {s}
      </span>
    )
  }

  const renderPreviewPage = (idx: number, img: string): ReactNode => {
    const hiddenForIdx = hiddenFields[formType] ?? []
    const customsForIdx = customFields.filter(
      (c) => c.formType === formType && c.pageIndex === idx,
    )
    const staticForIdx = FORM_FIELDS[formType][idx].filter((m) => !hiddenForIdx.includes(m.id))
    const metaList = [
      ...staticForIdx,
      ...customsForIdx.map(
        (c): FieldMeta => ({
          id: c.id,
          label: c.label,
          type: c.type,
          width: c.width,
          options: c.options,
        }),
      ),
    ] as FieldMeta[]
    const keys = [
      ...staticForIdx.flatMap((m) => (m.type === 'category' ? ALL_CATEGORY_KEYS : [m.id])),
      ...customsForIdx.flatMap((c) =>
        c.type === 'radio' ? (c.options ?? []).map((o) => `${c.id}:${o}`) : [c.id],
      ),
    ]
    const pagePos = pos[formType][idx] ?? {}
    return (
      <div className={`print-page ${formType === 'application' ? 'caps-form' : ''}`}>
        {img && (
          <img
            className={`print-page-img ${fitToPage ? 'fit' : ''}`}
            src={img}
            alt="reference"
            style={{ opacity: 1 }}
          />
        )}
        {keys.map((key) => {
          const p = pagePos[key] ?? { top: 5, left: 5 }
          const meta = metaForKey(metaList, key)
          return (
            <div
              key={key}
              className={`pos-field preview-field ${meta.type === 'image' ? 'image-field' : ''}`}
              style={{
                top: `calc(${p.top}% + var(--global-offset-y, 0mm))`,
                left: `calc(${p.left}% + var(--global-offset-x, 0mm))`,
                ...(meta.type === 'image'
                  ? { width: `${p.width ?? 110}px`, height: `${p.height ?? 146}px` }
                  : {}),
              }}
            >
              <div className="field-print">{renderPrintContent(key, metaList)}</div>
            </div>
          )
        })}
      </div>
    )
  }

  const focusNextInput = (currentInput: HTMLInputElement) => {
    const rawInputs = Array.from(
      pageRef.current?.querySelectorAll<HTMLInputElement>(
        'input[type="text"], input[type="date"], input[type="checkbox"], input[type="radio"]'
      ) ?? []
    ).filter((input) => input.offsetParent !== null && !input.disabled)

    // Sort inputs in visual reading order (top-to-bottom, left-to-right)
    const inputs = rawInputs.sort((a, b) => {
      const rectA = a.getBoundingClientRect()
      const rectB = b.getBoundingClientRect()
      if (Math.abs(rectA.top - rectB.top) < 20) {
        return rectA.left - rectB.left
      }
      return rectA.top - rectB.top
    })

    const currentIndex = inputs.indexOf(currentInput)
    if (currentIndex !== -1 && currentIndex < inputs.length - 1) {
      const nextInput = inputs[currentIndex + 1]
      nextInput.focus()
      if (nextInput.type === 'text' || nextInput.type === 'date') {
        nextInput.select()
      }
    }
  }

  const focusPrevInput = (currentInput: HTMLInputElement) => {
    const rawInputs = Array.from(
      pageRef.current?.querySelectorAll<HTMLInputElement>(
        'input[type="text"], input[type="date"], input[type="checkbox"], input[type="radio"]'
      ) ?? []
    ).filter((input) => input.offsetParent !== null && !input.disabled)

    const inputs = rawInputs.sort((a, b) => {
      const rectA = a.getBoundingClientRect()
      const rectB = b.getBoundingClientRect()
      if (Math.abs(rectA.top - rectB.top) < 20) {
        return rectA.left - rectB.left
      }
      return rectA.top - rectB.top
    })

    const currentIndex = inputs.indexOf(currentInput)
    if (currentIndex > 0) {
      const prevInput = inputs[currentIndex - 1]
      prevInput.focus()
      if (prevInput.type === 'text' || prevInput.type === 'date') {
        prevInput.select()
      }
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, key?: string) => {
    const input = e.currentTarget
    const isSmallBox = input.offsetWidth > 0 && input.offsetWidth <= 40

    if (e.key === 'Enter') {
      e.preventDefault()
      focusNextInput(input)
    } else if (e.key === 'Backspace') {
      if (isSmallBox) {
        e.preventDefault()
        if (key && input.value !== '') {
          onChange(key, '')
        }
        focusPrevInput(input)
      }
    }
  }

  const handleInputChange = (key: string, val: string, currentInput: HTMLInputElement) => {
    onChange(key, val)
    const isSmallBox = currentInput.offsetWidth <= 40
    if (isSmallBox && val.length >= 1) {
      focusNextInput(currentInput)
    }
  }

  const renderControl = (key: string, widthPx?: number): ReactNode => {
    const meta = metaForKey(pageMetaList, key)
    if (meta.type === 'category' || meta.type === 'radio') {
      const sep = key.indexOf(':')
      const group = sep > 0 ? key.slice(0, sep) : 'category'
      const opt = sep > 0 ? key.slice(sep + 1) : ''
      const selected = data[group] as string
      return (
        <label className="field-control">
          <input
            type="radio"
            name={`${group}-${formType}-${pageIndex}`}
            checked={selected === opt}
            onChange={() => onChange(group, opt)}
            onKeyDown={handleInputKeyDown}
          />
          <span className="field-option-label">{opt}</span>
        </label>
      )
    }
    if (meta.type === 'image') {
      const src = typeof data[key] === 'string' ? (data[key] as string) : ''
      return (
        <label className="field-control image-control" title="Click to upload / change image">
          {src ? (
            <>
              <img className="image-preview" src={src} alt="" />
              <div className="image-change-overlay" title="Click to change / upload image">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            </>
          ) : (
            <span className="image-placeholder">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '2px' }}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span>{meta.label || 'Add photo'}</span>
            </span>
          )}
          <input
            type="file"
            accept="image/*"
            className="image-input"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) {
                const reader = new FileReader()
                reader.onload = () => onChange(key, reader.result as string)
                reader.readAsDataURL(f)
              }
              e.target.value = ''
            }}
          />
        </label>
      )
    }
    if (meta.type === 'checkbox') {
      return (
        <label className="field-control">
          <input
            type="checkbox"
            checked={data[key] === true}
            onChange={(e) => onChange(key, e.target.checked)}
            onKeyDown={handleInputKeyDown}
          />
        </label>
      )
    }
    const p = pagePositions[key] ?? { top: 5, left: 5 }
    const fs = p.fontSize ?? (p.height ? Math.round(clamp(p.height * 0.65, 9, 120)) : undefined)

    return (
      <label className={`field-control ${meta.showLabel ? 'has-prefix-label' : ''}`}>
        {meta.showLabel && (
          <span className="field-prefix-label" style={{ fontSize: fs ? `${fs}px` : undefined }}>
            {meta.label}:
          </span>
        )}
        <input
          type={meta.type === 'date' ? 'date' : 'text'}
          placeholder={meta.showLabel ? 'Value' : meta.label}
          value={typeof data[key] === 'string' ? (data[key] as string) : ''}
          onChange={(e) => handleInputChange(key, e.target.value, e.target)}
          onKeyDown={(e) => handleInputKeyDown(e, key)}
          style={{
            width: widthPx != null ? `${widthPx}px` : meta.width,
            height: p.height ? `${p.height}px` : undefined,
            fontSize: fs ? `${fs}px` : undefined,
          }}
        />
      </label>
    )
  }

  return (
    <div className="form-screen">
      <div className="form-toolbar ribbon-toolbar">
        {/* Top Header Row: Title, Back button, Primary Actions */}
        <div className="ribbon-header-row">
          <button className="back-btn" onClick={onBack}>
            ← Back
          </button>
          <div className="form-toolbar-title-group">
            <h2>{FORM_TYPE_LABELS[formType]}</h2>
            {editingRecordId && (
              <span className="editing-record-badge" title={`Editing existing submission #${editingRecordId}`}>
                Editing Record #{editingRecordId}
              </span>
            )}
          </div>
          <div className="ribbon-primary-actions">
            <button className="save-record-btn" onClick={() => saveToDb(false)}>
              💾 {editingRecordId ? `Update Record #${editingRecordId}` : 'Save Record'}
            </button>
            <button className="primary" onClick={handlePrint}>
              🖨️ Print
            </button>
            <button onClick={() => setShowCalibrationModal(true)} title="Adjust page print alignment for your printer">
              📐 Alignment
            </button>
            <button
              className={`design-mode-toggle-btn ${isDesignMode ? 'active' : ''}`}
              onClick={toggleDesignMode}
            >
              {isDesignMode ? '✓ Done Design' : '⚙️ Design Mode'}
            </button>
            <button
              type="button"
              className="ribbon-toggle-btn"
              title={isRibbonCollapsed ? "Expand Toolbar Sections" : "Shrink Toolbar to Save Vertical Space"}
              onClick={() => setIsRibbonCollapsed((c) => !c)}
            >
              {isRibbonCollapsed ? '▼ Expand Tools' : '▲ Shrink Navbar'}
            </button>
          </div>
        </div>

        {/* Ribbon Body: Grouped Ribbon Sections */}
        {!isRibbonCollapsed && (
          <div className="ribbon-sections-row">
          {/* Section 1: Typography */}
          <div className="ribbon-group">
            <div className="ribbon-group-title">🔤 Typography</div>
            <div className="ribbon-group-content">
              <div className="header-font-control" title="Adjust font/text size for form fields">
                <button
                  type="button"
                  className="font-stepper-btn"
                  title="Decrease font size by 1px"
                  onClick={() => handleHeaderFontSizeChange(currentHeaderFontSize - 1)}
                >
                  A−
                </button>
                <input
                  type="number"
                  className="header-font-input"
                  min={8}
                  max={120}
                  value={currentHeaderFontSize}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    if (!isNaN(val) && val >= 8 && val <= 120) {
                      handleHeaderFontSizeChange(val)
                    }
                  }}
                />
                <span className="font-unit">px</span>
                <button
                  type="button"
                  className="font-stepper-btn"
                  title="Increase font size by 1px"
                  onClick={() => handleHeaderFontSizeChange(currentHeaderFontSize + 1)}
                >
                  A+
                </button>
                <select
                  className="header-font-select"
                  value={[9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32].includes(currentHeaderFontSize) ? currentHeaderFontSize : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleHeaderFontSizeChange(Number(e.target.value))
                    }
                  }}
                >
                  <option value="" disabled>Size...</option>
                  {[9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32].map((sz) => (
                    <option key={sz} value={sz}>{sz}px</option>
                  ))}
                </select>
                <span className="header-font-target-badge">
                  {activeTargetKeys.length > 0
                    ? `(${activeTargetKeys.length} selected)`
                    : '(All on page)'}
                </span>
                {activeTargetKeys.length > 0 && (
                  <button
                    type="button"
                    className="font-apply-all-btn"
                    title="Apply this font size to all fields on this page"
                    onClick={() => handleHeaderFontSizeChange(currentHeaderFontSize, true)}
                  >
                    Apply All
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: View & Canvas Settings */}
          <div className="ribbon-group">
            <div className="ribbon-group-title">👁️ View & Canvas</div>
            <div className="ribbon-group-content">
              {isDesignMode && (
                <>
                  <label className="calibrate-toggle">
                    <input
                      type="checkbox"
                      checked={calibrate}
                      onChange={(e) => setCalibrate(e.target.checked)}
                    />
                    Calibrate
                  </label>
                  <label className="opacity-control" title="Adjust form background image opacity">
                    Img:
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={opacity}
                      onChange={(e) => setOpacity(Number(e.target.value))}
                    />
                  </label>
                  <label className="calibrate-toggle" title="Stretch the image to fill the paper edge to edge so positions map accurately">
                    <input
                      type="checkbox"
                      checked={fitToPage}
                      onChange={(e) => handleToggleFitToPage(e.target.checked)}
                    />
                    Fit image
                  </label>
                  <label className="calibrate-toggle" title="Show or hide field alignment scale lines on each field">
                    <input
                      type="checkbox"
                      checked={showDemoScale}
                      onChange={(e) => handleToggleDemoScale(e.target.checked)}
                    />
                    Demo Scale
                  </label>
                </>
              )}
              <div className="page-size-selector" title="Page size paper dimensions">
                <select
                  value={isCustomSize ? 'Custom' : (PAGE_PRESETS.find(p => p.width === pageSize.width && p.height === pageSize.height)?.label ?? 'Custom')}
                  onChange={(e) => {
                    if (e.target.value === 'Custom') {
                      setIsCustomSize(true)
                      const wClean = pageSize.width.replace('mm', '').replace('in', '')
                      const hClean = pageSize.height.replace('mm', '').replace('in', '')
                      setCustomWidth(wClean)
                      setCustomHeight(hClean)
                      setCustomUnit(pageSize.width.endsWith('in') ? 'in' : 'mm')
                    } else {
                      const preset = PAGE_PRESETS.find(p => p.label === e.target.value)
                      if (preset) {
                        setPageSize({ width: preset.width, height: preset.height })
                        setIsCustomSize(false)
                        setCustomWidth('')
                        setCustomHeight('')
                        setCustomUnit(preset.width.endsWith('in') ? 'in' : 'mm')
                      }
                    }
                  }}
                >
                  {PAGE_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                  <option value="Custom">Custom...</option>
                </select>
                {isCustomSize && (
                  <>
                    <input
                      type="text"
                      placeholder={`W (${customUnit})`}
                      value={customWidth}
                      onChange={(e) => setCustomWidth(e.target.value)}
                      style={{ width: '55px' }}
                      onBlur={() => {
                        const w = customWidth ? `${customWidth}${customUnit}` : pageSize.width
                        const h = customHeight ? `${customHeight}${customUnit}` : pageSize.height
                        setPageSize({ width: w, height: h })
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const w = `${customWidth || pageSize.width.replace('mm', '').replace('in', '')}${customUnit}`
                          const h = `${customHeight || pageSize.height.replace('mm', '').replace('in', '')}${customUnit}`
                          setPageSize({ width: w, height: h })
                        }
                      }}
                    />
                    <span>×</span>
                    <input
                      type="text"
                      placeholder={`H (${customUnit})`}
                      value={customHeight}
                      onChange={(e) => setCustomHeight(e.target.value)}
                      style={{ width: '55px' }}
                      onBlur={() => {
                        const w = customWidth ? `${customWidth}${customUnit}` : pageSize.width
                        const h = customHeight ? `${customHeight}${customUnit}` : pageSize.height
                        setPageSize({ width: w, height: h })
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const w = `${customWidth || pageSize.width.replace('mm', '').replace('in', '')}${customUnit}`
                          const h = `${customHeight || pageSize.height.replace('mm', '').replace('in', '')}${customUnit}`
                          setPageSize({ width: w, height: h })
                        }
                      }}
                    />
                    <select
                      value={customUnit}
                      onChange={(e) => {
                        const newUnit = e.target.value as 'mm' | 'in'
                        setCustomUnit(newUnit)
                        const w = customWidth ? `${customWidth}${newUnit}` : pageSize.width
                        const h = customHeight ? `${customHeight}${newUnit}` : pageSize.height
                        setPageSize({ width: w, height: h })
                      }}
                      style={{ width: '50px', padding: '2px 4px', fontSize: '12px' }}
                    >
                      <option value="mm">mm</option>
                      <option value="in">in</option>
                    </select>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Layout & Field Tools (Design Mode) */}
          {isDesignMode && (
            <div className="ribbon-group">
              <div className="ribbon-group-title">🛠️ Layout Tools</div>
              <div className="ribbon-group-content">
                <button onClick={() => setAddingField((s) => !s)}>➕ Add field</button>
                {addingField && (
                  <span className="add-field-inline">
                    <input
                      type="text"
                      placeholder="Field name"
                      value={newFieldName}
                      autoFocus
                      onChange={(e) => setNewFieldName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddField()
                        if (e.key === 'Escape') setAddingField(false)
                      }}
                    />
                    <select
                      value={newFieldType}
                      onChange={(e) =>
                        setNewFieldType(e.target.value as 'text' | 'date' | 'checkbox' | 'radio' | 'image')
                      }
                    >
                      <option value="text">Text</option>
                      <option value="date">Date</option>
                      <option value="checkbox">Tick box</option>
                      <option value="radio">Radio</option>
                      <option value="image">Image</option>
                    </select>
                    {newFieldType === 'radio' && (
                      <input
                        type="text"
                        placeholder="Options (comma separated)"
                        value={newFieldOptions}
                        onChange={(e) => setNewFieldOptions(e.target.value)}
                      />
                    )}
                    <button className="primary" onClick={handleAddField}>
                      Add
                    </button>
                    <button onClick={() => setAddingField(false)}>Cancel</button>
                  </span>
                )}
                <button onClick={() => setShowPanel((s) => !s)}>🎛️ Fine-tune</button>
                <button onClick={handleUndo}>↩️ Undo</button>
                <button onClick={handleReset}>🔄 Reset</button>
                <button onClick={handleSaveLayout}>💾 Save Layout</button>
                <button onClick={handleExportLayout}>📤 Export</button>
                <button onClick={handleImportLayout}>📥 Import</button>
                <label className="upload-btn">
                  🖼️ Form Image
                  <input type="file" accept="image/*" onChange={handleFile} />
                </label>
              </div>
            </div>
          )}
        </div>
        )}

        {(selectedKeys.length > 1 || msg) && (
          <div className="ribbon-status-row">
            {selectedKeys.length > 1 && (
              <span className="print-msg" style={{ background: '#e2f0e6', color: '#137547', fontWeight: 600 }}>
                📦 {selectedKeys.length} fields selected (drag any to move group)
              </span>
            )}
            {msg && <span className="print-msg">{msg}</span>}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="page-nav">
          <button disabled={pageIndex === 0} onClick={() => setPageIndex((p) => p - 1)}>
            ← Prev
          </button>
          <span className="page-count">
            Page {pageIndex + 1} of {totalPages}
          </span>
          <button
            disabled={pageIndex >= totalPages - 1}
            onClick={() => setPageIndex((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}

      <div className="layout-row">
        <div className="print-page-wrap">
          <div
          className={`print-page ${formType === 'application' ? 'caps-form' : ''} ${!isDesignMode ? 'fill-mode' : ''}`}
          ref={pageRef}
          onClick={handlePageClick}
          onMouseDown={startMarquee}
          onContextMenu={(e) => {
            e.preventDefault()
            openContextMenu(e, null)
          }}
        >
            {marqueeBox && (() => {
              const boxMinX = Math.min(marqueeBox.startX, marqueeBox.currentX)
              const boxMaxX = Math.max(marqueeBox.startX, marqueeBox.currentX)
              const boxMinY = Math.min(marqueeBox.startY, marqueeBox.currentY)
              const boxMaxY = Math.max(marqueeBox.startY, marqueeBox.currentY)
              return (
                <div
                  className="selection-marquee"
                  style={{
                    left: `${boxMinX}px`,
                    top: `${boxMinY}px`,
                    width: `${boxMaxX - boxMinX}px`,
                    height: `${boxMaxY - boxMinY}px`,
                  }}
                />
              )
            })()}
            {shownImage && (
              <img
                className={`print-page-img ${fitToPage ? 'fit' : ''}`}
                src={shownImage}
                alt="reference"
                style={{ opacity }}
              />
            )}
            {pageKeys.map((key) => {
              const p = pagePositions[key] ?? { top: 5, left: 5 }
              const meta = metaForKey(pageMetaList, key)
              const resizable =
                meta.type === 'text' || meta.type === 'date' || meta.type === 'image'
              const widthPx = resizable
                ? p.width ?? (meta.type === 'image' ? 110 : 140)
                : undefined
              const isGroupSel = selectedKeys.includes(key) && selectedKeys.length > 1
              return (
                <div
                  key={key}
                  className={`pos-field ${meta.type === 'image' ? 'image-field' : ''} ${
                    calibrate ? 'calibrating' : ''
                  } ${selectedKey === key ? 'selected' : ''} ${isGroupSel ? 'selected-group' : ''}`}
                  style={{
                    top: `calc(${p.top}% + var(--global-offset-y, 0mm))`,
                    left: `calc(${p.left}% + var(--global-offset-x, 0mm))`,
                    ...(meta.type === 'image'
                      ? {
                          width: `${p.width ?? 110}px`,
                          height: `${p.height ?? 146}px`,
                        }
                      : {}),
                  }}
                  onMouseDown={(e) => startDrag(e, key, p)}
                  onClick={(e) => e.stopPropagation()}
                  onContextMenu={(e) => {
                    if (isDesignMode) openContextMenu(e, key)
                  }}
                >
                  {isDesignMode && showDemoScale && (
                    <div className="field-4axis-scale">
                      {/* Top Center Scale Axis */}
                      <svg className="axis-svg axis-top" width="20mm" height="20mm" viewBox="0 0 20 20">
                        <line x1="10" y1="20" x2="10" y2="0" stroke="#000" strokeWidth="1" />
                        {Array.from({ length: 21 }, (_, i) => {
                          const is5 = i % 5 === 0
                          const w = is5 ? 6 : 3
                          return (
                            <g key={i}>
                              <line x1={10 - w / 2} y1={20 - i} x2={10 + w / 2} y2={20 - i} stroke="#000" strokeWidth={is5 ? 0.9 : 0.5} />
                              {is5 && i > 0 && i % 10 === 0 && (
                                <text x="14" y={20 - i + 1} fontSize="3.5" fill="#000" fontWeight="bold">{i}</text>
                              )}
                            </g>
                          )
                        })}
                      </svg>

                      {/* Bottom Center Scale Axis */}
                      <svg className="axis-svg axis-bottom" width="20mm" height="20mm" viewBox="0 0 20 20">
                        <line x1="10" y1="0" x2="10" y2="20" stroke="#000" strokeWidth="1" />
                        {Array.from({ length: 21 }, (_, i) => {
                          const is5 = i % 5 === 0
                          const w = is5 ? 6 : 3
                          return (
                            <g key={i}>
                              <line x1={10 - w / 2} y1={i} x2={10 + w / 2} y2={i} stroke="#000" strokeWidth={is5 ? 0.9 : 0.5} />
                              {is5 && i > 0 && i % 10 === 0 && (
                                <text x="14" y={i + 1} fontSize="3.5" fill="#000" fontWeight="bold">{i}</text>
                              )}
                            </g>
                          )
                        })}
                      </svg>

                      {/* Left Center Scale Axis */}
                      <svg className="axis-svg axis-left" width="20mm" height="20mm" viewBox="0 0 20 20">
                        <line x1="20" y1="10" x2="0" y2="10" stroke="#000" strokeWidth="1" />
                        {Array.from({ length: 21 }, (_, i) => {
                          const is5 = i % 5 === 0
                          const h = is5 ? 6 : 3
                          return (
                            <g key={i}>
                              <line x1={20 - i} y1={10 - h / 2} x2={20 - i} y2={10 + h / 2} stroke="#000" strokeWidth={is5 ? 0.9 : 0.5} />
                              {is5 && i > 0 && i % 10 === 0 && (
                                <text x={20 - i} y="15" textAnchor="middle" fontSize="3.5" fill="#000" fontWeight="bold">{i}</text>
                              )}
                            </g>
                          )
                        })}
                      </svg>

                      {/* Right Center Scale Axis */}
                      <svg className="axis-svg axis-right" width="20mm" height="20mm" viewBox="0 0 20 20">
                        <line x1="0" y1="10" x2="20" y2="10" stroke="#000" strokeWidth="1" />
                        {Array.from({ length: 21 }, (_, i) => {
                          const is5 = i % 5 === 0
                          const h = is5 ? 6 : 3
                          return (
                            <g key={i}>
                              <line x1={i} y1={10 - h / 2} x2={i} y2={10 + h / 2} stroke="#000" strokeWidth={is5 ? 0.9 : 0.5} />
                              {is5 && i > 0 && i % 10 === 0 && (
                                <text x={i} y="15" textAnchor="middle" fontSize="3.5" fill="#000" fontWeight="bold">{i}</text>
                              )}
                            </g>
                          )
                        })}
                      </svg>
                    </div>
                  )}
                  <div className="field-control-wrap">{renderControl(key, widthPx)}</div>
                  <div
                    className="field-print"
                    style={{
                      ...(p.fontSize || p.height
                        ? {
                            fontSize: `${p.fontSize ?? Math.round(clamp((p.height ?? 28) * 0.65, 9, 120))}px`,
                          }
                        : {}),
                    }}
                  >
                    {renderPrintContent(key, pageMetaList)}
                  </div>
                  {calibrate && meta.type === 'image' && (
                    <>
                      <span className="resize-handle rh-n" onMouseDown={(e) => startResize(e, key, p, 'n')} />
                      <span className="resize-handle rh-s" onMouseDown={(e) => startResize(e, key, p, 's')} />
                      <span className="resize-handle rh-e" onMouseDown={(e) => startResize(e, key, p, 'e')} />
                      <span className="resize-handle rh-w" onMouseDown={(e) => startResize(e, key, p, 'w')} />
                      <span className="resize-handle rh-ne" onMouseDown={(e) => startResize(e, key, p, 'ne')} />
                      <span className="resize-handle rh-nw" onMouseDown={(e) => startResize(e, key, p, 'nw')} />
                      <span className="resize-handle rh-se" onMouseDown={(e) => startResize(e, key, p, 'se')} />
                      <span className="resize-handle rh-sw" onMouseDown={(e) => startResize(e, key, p, 'sw')} />
                    </>
                  )}
                  {calibrate && resizable && meta.type !== 'image' && (
                    <>
                      <span className="resize-handle rh-e" onMouseDown={(e) => startResize(e, key, p, 'e')} />
                      <span className="resize-handle rh-s" onMouseDown={(e) => startResize(e, key, p, 's')} />
                      <span className="resize-handle rh-se" onMouseDown={(e) => startResize(e, key, p, 'se')} />
                    </>
                  )}

                </div>
              )
            })}
          </div>
        </div>

        {showPanel && isDesignMode && (
          <aside className="fine-tune-panel">
            <h3>Fine-tune positions</h3>
            {(() => {
              const defId = selectedKey ? customIdForKey(selectedKey) : null
              const def = defId ? customFields.find((c) => c.id === defId) : undefined
              if (!def) return null
              return (
                <div className="rename-inline">
                  <input
                    key={selectedKey}
                    type="text"
                    placeholder="Field name"
                    value={renameValue}
                    autoFocus
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') renameField()
                    }}
                  />
                  <button className="primary" onClick={renameField}>
                    Rename
                  </button>
                </div>
              )
            })()}
            {hiddenIds.length > 0 && (
              <p className="hint">
                {hiddenIds.length} field(s) removed.{' '}
                <button className="restore-btn" onClick={handleRestoreHidden}>
                  Restore them
                </button>
              </p>
            )}
            {calibrate ? (
              <p className="hint">
                Drag a box onto its blank line — the blue tag above is just the field&apos;s
                name; the box itself is exactly where the typed text will go. Drag the blue
                edge to resize. Shift+click the image to place the selected field. Use the
                toolbar&apos;s <b>Add field</b> to add custom fields; delete them with the ×.
              </p>
            ) : (
              <p className="hint">Turn on Calibrate to drag fields on the page.</p>
            )}
            {pageKeys.map((key) => {
              const p = pagePositions[key] ?? { top: 5, left: 5 }
              const selected = selectedKey === key
              const meta = metaForKey(pageMetaList, key)
              const resizable =
                meta.type === 'text' || meta.type === 'date' || meta.type === 'image'
              const sep = key.indexOf(':')
              const displayName =
                sep > 0 && (meta.type === 'category' || meta.type === 'radio')
                  ? key.slice(sep + 1)
                  : key
              return (
                <div
                  key={key}
                  className={`ft-row ${selected ? 'selected' : ''}`}
                  onClick={() => selectKey(key)}
                >
                  <span className="ft-key">{displayName}</span>
                  <span className="ft-num">
                    T{' '}
                    <input
                      type="number"
                      value={Number(p.top.toFixed(1))}
                      onChange={(e) =>
                        editPosition(key, { ...p, top: clamp(Number(e.target.value), 0, 100) })
                      }
                    />
                  </span>
                  <span className="ft-num">
                    L{' '}
                    <input
                      type="number"
                      value={Number(p.left.toFixed(1))}
                      onChange={(e) =>
                        editPosition(key, { ...p, left: clamp(Number(e.target.value), 0, 100) })
                      }
                    />
                  </span>
                  {resizable && (
                    <>
                      <span className="ft-num">
                        W{' '}
                        <input
                          type="number"
                          value={p.width ?? 140}
                          onChange={(e) =>
                            editPosition(key, { ...p, width: clamp(Number(e.target.value), 30, 900) })
                          }
                        />
                      </span>
                      <span className="ft-num">
                        H{' '}
                        <input
                          type="number"
                          value={p.height ?? (meta.type === 'image' ? 146 : 28)}
                          onChange={(e) => {
                            const h = clamp(Number(e.target.value), 14, 1100)
                            const autoFs = meta.type !== 'image' ? Math.round(clamp(h * 0.65, 9, 120)) : undefined
                            editPosition(key, { ...p, height: h, ...(autoFs ? { fontSize: autoFs } : {}) })
                          }}
                        />
                      </span>
                      {meta.type !== 'image' && (
                        <span className="ft-num" title="Font size in px">
                          Font{' '}
                          <input
                            type="number"
                            value={p.fontSize ?? (p.height ? Math.round(clamp(p.height * 0.65, 9, 120)) : 13)}
                            onChange={(e) =>
                              editPosition(key, { ...p, fontSize: clamp(Number(e.target.value), 8, 120) })
                            }
                          />
                        </span>
                      )}
                    </>
                  )}
                  <span className="ft-nudge">
                    <button title="Move up 1px (↑)" onClick={() => {
                      const h = pageRef.current?.getBoundingClientRect().height || 1344
                      const step = (1 / h) * 100
                      editPosition(key, { ...p, top: clamp(p.top - step, 0, 100) })
                    }}>↑</button>
                    <button title="Move down 1px (↓)" onClick={() => {
                      const h = pageRef.current?.getBoundingClientRect().height || 1344
                      const step = (1 / h) * 100
                      editPosition(key, { ...p, top: clamp(p.top + step, 0, 100) })
                    }}>↓</button>
                    <button title="Move left 1px (←)" onClick={() => {
                      const w = pageRef.current?.getBoundingClientRect().width || 816
                      const step = (1 / w) * 100
                      editPosition(key, { ...p, left: clamp(p.left - step, 0, 100) })
                    }}>←</button>
                    <button title="Move right 1px (→)" onClick={() => {
                      const w = pageRef.current?.getBoundingClientRect().width || 816
                      const step = (1 / w) * 100
                      editPosition(key, { ...p, left: clamp(p.left + step, 0, 100) })
                    }}>→</button>
                  </span>
                  {isCustomField(key) && (
                    <button
                      className="ft-del"
                      title="Delete field"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteField(key)
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              )
            })}
          </aside>
        )}
      </div>

      {showPreview && (
        <div className="preview-overlay" onClick={() => setShowPreview(false)}>
          <div className="preview-window" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h3>{FORM_TYPE_LABELS[formType]} — Preview</h3>
              {previewImages.length > 1 && (
                <div className="preview-nav">
                  <button
                    disabled={previewPage === 0}
                    onClick={() => setPreviewPage((p) => p - 1)}
                  >
                    ← Prev
                  </button>
                  <span>
                    Page {previewPage + 1} of {previewImages.length}
                  </span>
                  <button
                    disabled={previewPage >= previewImages.length - 1}
                    onClick={() => setPreviewPage((p) => p + 1)}
                  >
                    Next →
                  </button>
                </div>
              )}
              <span className="preview-hint">
                Ctrl+wheel or buttons to zoom, drag to pan.
              </span>
            </div>
            <div
              className="preview-scroll"
              ref={previewScrollRef}
            >
              <div className="preview-zoombar">
                <button onClick={() => zoomPreview(1 / 1.25)} title="Zoom out">
                  −
                </button>
                <button onClick={fitPreview} title="Fit to window">
                  {Math.round(previewScale * previewZoom * 100)}%
                </button>
                <button onClick={() => zoomPreview(1.25)} title="Zoom in">
                  +
                </button>
              </div>
              {previewImages[previewPage] && (
                <div
                  className="preview-scale-wrap"
                  style={{
                    width: 816 * previewScale * previewZoom,
                    height: 1346 * previewScale * previewZoom,
                  }}
                  onPointerDown={(e) => {
                    const el = previewScrollRef.current
                    if (!el) return
                    panRef.current = {
                      x: e.clientX,
                      y: e.clientY,
                      sl: el.scrollLeft,
                      st: el.scrollTop,
                    }
                    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
                  }}
                  onPointerMove={(e) => {
                    if (!panRef.current || !previewScrollRef.current) return
                    const el = previewScrollRef.current
                    el.scrollLeft = panRef.current.sl - (e.clientX - panRef.current.x)
                    el.scrollTop = panRef.current.st - (e.clientY - panRef.current.y)
                  }}
                  onPointerUp={() => {
                    panRef.current = null
                  }}
                  onPointerCancel={() => {
                    panRef.current = null
                  }}
                >
                  <div
                    className="preview-scale"
                    style={{
                      width: 816,
                      height: 1346,
                      transform: `scale(${previewScale * previewZoom})`,
                    }}
                  >
                    {renderPreviewPage(previewPage, previewImages[previewPage])}
                  </div>
                </div>
              )}
            </div>
            <div className="preview-footer">
              <button className="primary" onClick={() => doPrint(false)}>
                Print
              </button>
              <button onClick={() => doPrint(true)}>Print without dialog</button>
              <button onClick={() => setShowPreview(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showCalibrationModal && (
        <div className="preview-overlay" onClick={() => setShowCalibrationModal(false)}>
          <div className="calibration-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h3>🖨️ Printer Alignment Calibration</h3>
              <button className="calibration-close-btn" onClick={() => setShowCalibrationModal(false)}>
                ×
              </button>
            </div>

            <div className="calibration-body">
              <p className="calibration-desc">
                If your printer shifts text off-target on paper, adjust the position below. This moves <strong>all text fields together</strong> at once without changing individual box layout positions.
              </p>

              <div className="calibration-grid">
                <div className="calibration-nudge-pad">
                  <span className="nudge-label">Directional Nudge</span>
                  <div className="nudge-buttons">
                    <button
                      className="nudge-btn nudge-up"
                      onClick={() => handleOffsetChange(globalOffsetX, Math.round((globalOffsetY - 0.5) * 10) / 10)}
                      title="Move all text UP"
                    >
                      ▲ Move Up (-0.5mm)
                    </button>
                    <div className="nudge-mid-row">
                      <button
                        className="nudge-btn nudge-left"
                        onClick={() => handleOffsetChange(Math.round((globalOffsetX - 0.5) * 10) / 10, globalOffsetY)}
                        title="Move all text LEFT"
                      >
                        ◄ Move Left (-0.5mm)
                      </button>
                      <button
                        className="nudge-btn nudge-reset"
                        onClick={() => handleOffsetChange(0, 0)}
                        title="Reset offset to 0"
                      >
                        Reset (0)
                      </button>
                      <button
                        className="nudge-btn nudge-right"
                        onClick={() => handleOffsetChange(Math.round((globalOffsetX + 0.5) * 10) / 10, globalOffsetY)}
                        title="Move all text RIGHT"
                      >
                        Move Right ► (+0.5mm)
                      </button>
                    </div>
                    <button
                      className="nudge-btn nudge-down"
                      onClick={() => handleOffsetChange(globalOffsetX, Math.round((globalOffsetY + 0.5) * 10) / 10)}
                      title="Move all text DOWN"
                    >
                      ▼ Move Down (+0.5mm)
                    </button>
                  </div>
                </div>

                <div className="calibration-inputs">
                  <div className="calibration-field">
                    <label>
                      <strong>Vertical Shift (Up / Down)</strong>
                      <span className="field-hint">Increase (+) if text prints too high on paper.</span>
                    </label>
                    <div className="input-row">
                      <button onClick={() => handleOffsetChange(globalOffsetX, Math.round((globalOffsetY - 1) * 10) / 10)}>-1mm</button>
                      <input
                        type="number"
                        step="0.5"
                        value={globalOffsetY}
                        onChange={(e) => handleOffsetChange(globalOffsetX, Number(e.target.value))}
                      />
                      <span>mm</span>
                      <button onClick={() => handleOffsetChange(globalOffsetX, Math.round((globalOffsetY + 1) * 10) / 10)}>+1mm</button>
                    </div>
                  </div>

                  <div className="calibration-field">
                    <label>
                      <strong>Horizontal Shift (Left / Right)</strong>
                      <span className="field-hint">Increase (+) if text prints too far left.</span>
                    </label>
                    <div className="input-row">
                      <button onClick={() => handleOffsetChange(Math.round((globalOffsetX - 1) * 10) / 10, globalOffsetY)}>-1mm</button>
                      <input
                        type="number"
                        step="0.5"
                        value={globalOffsetX}
                        onChange={(e) => handleOffsetChange(Number(e.target.value), globalOffsetY)}
                      />
                      <span>mm</span>
                      <button onClick={() => handleOffsetChange(Math.round((globalOffsetX + 1) * 10) / 10, globalOffsetY)}>+1mm</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="calibration-presets">
                <span>Quick Fixes:</span>
                <button onClick={() => handleOffsetChange(globalOffsetX, 1.0)}>+1mm Down</button>
                <button onClick={() => handleOffsetChange(globalOffsetX, 2.0)}>+2mm Down</button>
                <button onClick={() => handleOffsetChange(globalOffsetX, 3.0)}>+3mm Down</button>
                <button onClick={() => handleOffsetChange(globalOffsetX, -2.0)}>-2mm Up</button>
                <button onClick={() => handleOffsetChange(0, 0)}>Reset to 0</button>
              </div>

              <div className="calibration-tip">
                💡 <strong>Important Print Tip:</strong> In your browser print window, ensure <strong>Margins</strong> is set to <em>None</em> and <strong>Scale</strong> is set to <em>100% (Actual Size)</em>.
              </div>
            </div>

            <div className="preview-footer">
              <button className="primary" onClick={() => setShowCalibrationModal(false)}>
                Done & Save
              </button>
              <button onClick={() => { setShowCalibrationModal(false); handlePrint(); }}>
                🖨️ Test Print
              </button>
            </div>
          </div>
        </div>
      )}

      {ctxMenu && (
        <div
          className="ctx-menu"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={menuPaste}>Paste here</button>
          {ctxMenu.key && (
            <>
              <button onClick={menuCopy}>Copy</button>
              <button onClick={menuCut}>Cut</button>
              {customIdForKey(ctxMenu.key) && <button onClick={menuRename}>Rename</button>}
              <button onClick={menuResetPosition}>Reset position</button>
              <button className="ctx-danger" onClick={menuDelete}>
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}