import { useCallback, useEffect, useState } from 'react'
import { FORM_TYPE_LABELS, type FormType } from './formTypes'

interface SavedRecord {
  id: number
  formType: FormType
  createdAt: string
  payload: Record<string, string | boolean>
}

export default function RecordsScreen({ onBack }: { onBack: () => void }) {
  const [formType, setFormType] = useState<FormType>('application')
  const [records, setRecords] = useState<SavedRecord[]>([])

  const load = useCallback(() => {
    if (!window.electronAPI?.loadSubmissions) return
    window.electronAPI.loadSubmissions(formType).then((rows) => {
      setRecords(
        (rows as SavedRecord[]).map((r) => ({
          ...r,
          payload: (r.payload ?? {}) as Record<string, string | boolean>,
        })),
      )
    })
  }, [formType])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async (id: number) => {
    await window.electronAPI?.deleteSubmission(id)
    load()
  }

  const firstField = (rec: SavedRecord) => {
    const keys = Object.keys(rec.payload)
    return keys.length ? `${keys[0]}: ${String(rec.payload[keys[0]])}` : ''
  }

  return (
    <div className="records-screen">
      <div className="records-toolbar">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2>Saved records</h2>
        <select
          value={formType}
          onChange={(e) => setFormType(e.target.value as FormType)}
        >
          {(Object.keys(FORM_TYPE_LABELS) as FormType[]).map((t) => (
            <option key={t} value={t}>
              {FORM_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div className="table-wrap">
        <table className="static-table records-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Saved on</th>
              <th>First field</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.createdAt}</td>
                <td>{firstField(r)}</td>
                <td>
                  <button className="danger" onClick={() => handleDelete(r.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr className="empty-row">
                <td colSpan={4}>No saved records for this form type.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}