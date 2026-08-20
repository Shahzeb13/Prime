import { useMemo, useState } from 'react'
import { FORM_TYPE_LABELS } from './formTypes'
import { RECORD_GROUPS } from './recordGroups'
import {
  formatDate,
  formatValue,
  getApplicantName,
  getCNIC,
  getContact,
  isImageValue,
  pickApplicantPhoto,
  type SavedRecord,
} from './recordUtils'

interface Props {
  record: SavedRecord
  onBack: () => void
  onDelete: (id: number) => Promise<void> | void
}

interface FieldGroup {
  title: string
  items: { key: string; label: string; value: string; raw: string; checked?: boolean }[]
  table?: { label?: string; columns: string[]; rows: string[][] }
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}
export default function RecordDetailsScreen({ record, onBack, onDelete }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null)

  const groups = useMemo<FieldGroup[]>(() => {
    const defs = RECORD_GROUPS[record.formType] ?? []
    const built = defs
      .map((def) => ({
        title: def.title,
        table: def.table,
        items: def.fields
          .map((f) => {
            if (f.kind === 'category') {
              const opt = f.key.replace(/^category:/, '')
              const selected = record.payload['category']
              const checked = typeof selected === 'string' && selected === opt
              return {
                key: f.key,
                label: f.label,
                value: checked ? 'Yes' : 'No',
                raw: '',
                checked,
              }
            }
            let raw = typeof record.payload[f.key] === 'string' ? (record.payload[f.key] as string) : ''
            if (f.key === 'photo' && record.formType === 'application') {
              raw = pickApplicantPhoto(record.payload)
            }
            return {
              key: f.key,
              label: f.label,
              value: formatValue(raw),
              raw,
            }
          })
          .filter((item) => {
            if (isImageValue(item.raw)) return item.value !== '—'
            return true
          }),
      }))
      .filter((g) => g.items.length > 0)

    return built
  }, [record.payload, record.formType])

  const summary = [
    { label: 'CNIC', value: getCNIC(record), icon: '🪪' },
    { label: 'Contact', value: getContact(record), icon: '📞' },
    { label: 'Record ID', value: `#${record.id}`, icon: '🔢' },
  ]

  return (
    <div className="record-details-screen">
      <div className="records-toolbar details-toolbar">
        <button className="back-btn" onClick={onBack}>
          <BackIcon />
          <span>Records</span>
        </button>
        <h2>Record Details</h2>
        <button className="danger details-delete-btn" onClick={() => onDelete(record.id)}>
          <TrashIcon />
          <span>Delete</span>
        </button>
      </div>

      <div className="record-detail-hero">
        <div className="detail-hero-main">
          <div className="detail-hero-badge-row">
            <span className="detail-record-id">Record #{record.id}</span>
            <span className={`form-badge form-badge-${record.formType}`}>
              {FORM_TYPE_LABELS[record.formType] ?? record.formType}
            </span>
          </div>
          <h3 className="detail-hero-name">{getApplicantName(record)}</h3>
          <div className="detail-hero-meta">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Saved on {formatDate(record.createdAt)}</span>
          </div>
        </div>
        <div className="detail-hero-summary">
          {summary.map((s) => (
            <div key={s.label} className="detail-summary-card">
              <span className="detail-summary-icon">{s.icon}</span>
              <div className="detail-summary-body">
                <span className="detail-summary-label">{s.label}</span>
                <span className="detail-summary-value">{s.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="record-details-empty">
          <p>No fields recorded for this submission.</p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.title} className="detail-section">
            <h4 className="detail-section-title">{g.title}</h4>
            {g.table && (
              <div className="detail-table-wrap">
                {g.table.label && <div className="detail-table-label">{g.table.label}</div>}
                <table className="detail-table">
                  <thead>
                    <tr>
                      {g.table.columns.map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {g.table.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{cell || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="detail-section-grid">
              {g.items.map((item) => (
                <div
                  key={item.key}
                  className={`detail-field-card ${
                    item.checked === undefined ? '' : item.checked ? 'cat-checked' : 'cat-unchecked'
                  }`}
                >
                  <span className="detail-field-label">{item.label}</span>
                  {isImageValue(item.raw) && item.value !== '—' ? (
                    <img
                      src={item.raw}
                      alt={item.label}
                      className="detail-field-image"
                      onClick={() => setLightbox(item.raw)}
                      title="Click to view full photo"
                    />
                  ) : (
                    <span
                      className={`detail-field-value ${
                        item.checked === undefined ? '' : item.checked ? 'cat-yes' : 'cat-no'
                      }`}
                    >
                      {item.value}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {lightbox && (
        <div className="record-lightbox" onClick={() => setLightbox(null)}>
          <div className="record-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button className="record-lightbox-close" onClick={() => setLightbox(null)}>
              ✕
            </button>
            <img src={lightbox} alt="Photo preview" className="record-lightbox-img" />
          </div>
        </div>
      )}
    </div>
  )
}
