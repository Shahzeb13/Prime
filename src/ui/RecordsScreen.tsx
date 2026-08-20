import { useCallback, useEffect, useMemo, useState } from 'react'
import { FORM_TYPE_LABELS, type FormType } from './formTypes'
import RecordDetailsScreen from './RecordDetailsScreen'
import {
  formatDate,
  getApplicantName,
  getCNICOrContact,
  type SavedRecord,
} from './recordUtils'

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

export default function RecordsScreen({ onBack }: { onBack: () => void }) {
  const [selectedFormFilter, setSelectedFormFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [records, setRecords] = useState<SavedRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<SavedRecord | null>(null)

  const loadRecords = useCallback(() => {
    if (!window.electronAPI?.loadSubmissions) return
    window.electronAPI.loadSubmissions('all').then((rows) => {
      setRecords(
        (rows as SavedRecord[]).map((r) => ({
          ...r,
          payload: (r.payload ?? {}) as Record<string, string | boolean>,
        })),
      )
    })
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const handleDelete = async (id: number) => {
    if (!confirm(`Are you sure you want to delete record #${id}?`)) return
    await window.electronAPI?.deleteSubmission(id)
    if (selectedRecord?.id === id) {
      setSelectedRecord(null)
    }
    loadRecords()
  }

  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      if (selectedFormFilter !== 'all' && rec.formType !== selectedFormFilter) return false
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      if (rec.id.toString().includes(q)) return true
      const label = (FORM_TYPE_LABELS[rec.formType] ?? rec.formType).toLowerCase()
      if (label.includes(q)) return true
      if (rec.createdAt.toLowerCase().includes(q)) return true
      return Object.entries(rec.payload).some(([k, v]) => {
        if (typeof v === 'string' && v.toLowerCase().includes(q)) return true
        if (k.toLowerCase().includes(q)) return true
        return false
      })
    })
  }, [records, selectedFormFilter, searchQuery])

  const counts = useMemo(() => {
    const byType = (Object.keys(FORM_TYPE_LABELS) as FormType[]).map((t) => ({
      type: t,
      label: FORM_TYPE_LABELS[t],
      count: records.filter((r) => r.formType === t).length,
    }))
    const total = byType.reduce((sum, t) => sum + t.count, 0)
    return { total, byType }
  }, [records])

  if (selectedRecord) {
    return (
      <RecordDetailsScreen
        record={selectedRecord}
        onBack={() => setSelectedRecord(null)}
        onDelete={handleDelete}
      />
    )
  }

  return (
    <div className="records-screen">
      <div className="records-toolbar">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2>Saved Submissions ({filteredRecords.length})</h2>

        <div className="records-filter-group">
          <div className="records-search-box">
            <SearchIcon />
            <input
              type="text"
              className="records-search-input"
              placeholder="Search name, CNIC, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                ✕
              </button>
            )}
          </div>

          <select
            className="records-type-select"
            value={selectedFormFilter}
            onChange={(e) => setSelectedFormFilter(e.target.value)}
          >
            <option value="all">All Form Types</option>
            {(Object.keys(FORM_TYPE_LABELS) as FormType[]).map((t) => (
              <option key={t} value={t}>
                {FORM_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="records-stats">
        <div className="stat-card stat-total">
          <span className="stat-value">{counts.total}</span>
          <span className="stat-label">
            {counts.total === 1 ? 'Total Record' : 'Total Records'}
          </span>
        </div>
        {counts.byType.map(({ type, label, count }) => (
          <div key={type} className={`stat-card stat-${type}`}>
            <span className="stat-value">{count}</span>
            <span className="stat-label">{label}</span>
          </div>
        ))}
      </div>

      <div className="table-wrap">
        <table className="static-table records-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Form Type</th>
              <th>Applicant Name</th>
              <th>CNIC / Contact</th>
              <th>Saved Date</th>
              <th className="th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((r) => (
              <tr
                key={r.id}
                className="record-row"
                onClick={() => setSelectedRecord(r)}
                title="Click to view full record details"
              >
                <td className="rec-id">#{r.id}</td>
                <td>
                  <span className={`form-badge form-badge-${r.formType}`}>
                    {FORM_TYPE_LABELS[r.formType] ?? r.formType}
                  </span>
                </td>
                <td className="rec-name">
                  <span className="rec-name-inner">{getApplicantName(r)}</span>
                </td>
                <td className="rec-contact">{getCNICOrContact(r)}</td>
                <td className="rec-date">{formatDate(r.createdAt)}</td>
                <td className="rec-actions">
                  <button
                    className="view-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedRecord(r)
                    }}
                  >
                    <EyeIcon />
                    <span>Details</span>
                  </button>
                  <button
                    className="danger rec-del-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(r.id)
                    }}
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ))}

            {filteredRecords.length === 0 && (
              <tr className="empty-row">
                <td colSpan={6}>
                  {searchQuery
                    ? `No records found matching "${searchQuery}".`
                    : 'No saved records found for this form type.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
