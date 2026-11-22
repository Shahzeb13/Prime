import { useEffect, useRef, useState, type ReactNode } from 'react'
import formReferencePlaceholder from '../assets/form-reference.jpg'
import { FORM_TYPE_LABELS, type FormType } from './formTypes'
import {
  defaultPositions,
  mergePositions,
  type PositionsMap,
} from './defaultPositions'
import { ALL_CATEGORY_KEYS, FORM_FIELDS, type FieldMeta } from './fields'
import type { SavedRecord } from './recordUtils'

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
  record: SavedRecord
  onClose: () => void
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

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

function parseToMicrons(val: string): number {
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

export default function RecordPrintPreview({ record, onClose }: Props) {
  const [positions, setPositions] = useState<PositionsMap | null>(null)
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([])
  const [hiddenFields, setHiddenFields] = useState<Record<FormType, string[]>>({
    application: [],
    schedule: [],
    booking: [],
    open_file: [],
  })
  const [previewPage, setPreviewPage] = useState(0)
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [previewZoom, setPreviewZoom] = useState(1)
  const [msg, setMsg] = useState('')

  const previewScrollRef = useRef<HTMLDivElement | null>(null)
  const panRef = useRef<{ x: number; y: number; sl: number; st: number } | null>(null)

  const formType = record.formType

  const [pageSize] = useState<{ width: string; height: string }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pageSize')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          // ignore parse errors
        }
      }
    }
    return { width: '215.9mm', height: '330.2mm' }
  })

  const [globalOffsetX] = useState<number>(() => {
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

  const [globalOffsetY] = useState<number>(() => {
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

  const fitToPage = (() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fitToPageMap')
        if (saved) {
          const map = JSON.parse(saved)
          const key = `${formType}:${previewPage}`
          if (typeof map[key] === 'boolean') return map[key]
        }
      } catch {}
    }
    return false
  })()

  useEffect(() => {
    document.documentElement.style.setProperty('--global-offset-x', `${globalOffsetX}mm`)
    document.documentElement.style.setProperty('--global-offset-y', `${globalOffsetY}mm`)
    document.documentElement.style.setProperty('--page-width', pageSize.width)
    document.documentElement.style.setProperty('--page-height', pageSize.height)
  }, [globalOffsetX, globalOffsetY, pageSize])

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
          setCustomFields(fields as CustomFieldDef[])
        }
      })
    }
    if (window.electronAPI?.loadHiddenFields) {
      window.electronAPI.loadHiddenFields().then((fields) => {
        if (fields && typeof fields === 'object') {
          const raw = fields as Record<FormType, string[]>
          const cleaned = {
            ...raw,
            application: (raw.application ?? []).filter((id) => id !== 'photo'),
          }
          setHiddenFields((prev) => ({ ...prev, ...cleaned }))
        }
      })
    }
  }, [])

  useEffect(() => {
    const total = FORM_FIELDS[formType]?.length || 1
    const loadImages = async () => {
      const imgs: string[] = []
      for (let i = 0; i < total; i++) {
        if (window.electronAPI?.loadReferenceImage) {
          const url = await window.electronAPI.loadReferenceImage(formType, i)
          imgs.push(url ?? formReferencePlaceholder)
        } else {
          imgs.push(formReferencePlaceholder)
        }
      }
      setPreviewImages(imgs)
    }
    loadImages()
  }, [formType])

  const zoomPreview = (factor: number) => {
    setPreviewZoom((z) => clamp(z * factor, 0.2, 4))
  }

  const fitPreview = () => setPreviewZoom(1)

  useEffect(() => {
    const el = previewScrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
        zoomPreview(e.deltaY < 0 ? 1.15 : 1 / 1.15)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const pos = positions ?? defaultPositions
  const previewScale = Math.min(
    1,
    (typeof window !== 'undefined' ? window.innerHeight - 220 : 900) / 1346,
  )

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
      setMsg('Printed successfully.')
    } else {
      setMsg(`Print failed${res?.failureReason ? `: ${res.failureReason}` : '.'}`)
    }
  }

  const renderPrintContent = (key: string, metaList: FieldMeta[], idx: number): ReactNode => {
    const meta = metaForKey(metaList, key)
    const payload = record.payload ?? {}
    const p = pos[formType]?.[idx]?.[key] ?? { top: 5, left: 5 }
    const fs = p.fontSize ?? (p.height ? Math.round(clamp(p.height * 0.65, 9, 120)) : undefined)

    if (meta.type === 'image') {
      const src = typeof payload[key] === 'string' ? (payload[key] as string) : ''
      return src ? <img className="print-photo" src={src} alt="" /> : null
    }
    if (meta.type === 'category' || meta.type === 'radio') {
      const sep = key.indexOf(':')
      const group = sep > 0 ? key.slice(0, sep) : 'category'
      const opt = sep > 0 ? key.slice(sep + 1) : ''
      const selected = payload[group]
      return selected === opt ? (
        <span className="tick-box" style={{ fontSize: fs ? `${fs}px` : undefined }}>
          ✔
        </span>
      ) : null
    }
    const v = payload[key]
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
    const staticForIdx = (FORM_FIELDS[formType]?.[idx] ?? []).filter(
      (m) => !hiddenForIdx.includes(m.id),
    )
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
    const pagePos = pos[formType]?.[idx] ?? {}
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
          const fs = p.fontSize ?? (p.height ? Math.round(clamp(p.height * 0.65, 9, 120)) : undefined)
          return (
            <div
              key={key}
              className={`pos-field preview-field ${meta.type === 'image' ? 'image-field' : ''}`}
              style={{
                top: `calc(${p.top}% + var(--global-offset-y, 0mm))`,
                left: `calc(${p.left}% + var(--global-offset-x, 0mm))`,
                ...(meta.type === 'image' || p.height
                  ? {
                      ...(p.width ? { width: `${p.width}px` } : {}),
                      ...(p.height ? { height: `${p.height}px` } : {}),
                    }
                  : {}),
              }}
            >
              <div
                className="field-print"
                style={{
                  ...(fs ? { fontSize: `${fs}px` } : {}),
                }}
              >
                {renderPrintContent(key, metaList, idx)}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="preview-window" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <h3>{FORM_TYPE_LABELS[formType]} — Print Record #{record.id}</h3>
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
          <span className="preview-hint">Ctrl+wheel or buttons to zoom, drag to pan.</span>
        </div>
        <div className="preview-scroll" ref={previewScrollRef}>
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
          {msg && <span className="print-msg">{msg}</span>}
          <button className="primary" onClick={() => doPrint(false)}>
            Print
          </button>
          <button onClick={() => doPrint(true)}>Print without dialog</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
