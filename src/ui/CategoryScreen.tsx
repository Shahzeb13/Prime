import { FORM_TYPE_LABELS, type FormType } from './formTypes'

interface Props {
  onSelect: (formType: FormType) => void
  onRecords: () => void
}

const FORM_TYPE_DESCRIPTIONS: Record<FormType, string> = {
  application: 'Full applicant, plot & office details',
  schedule: 'Pick a category & plot info',
  booking: 'Booking terms, payments & declarations',
}

export default function CategoryScreen({ onSelect, onRecords }: Props) {
  return (
    <div className="category-screen">
      <div className="brand-mark">
        <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true">
          <path
            d="M20 4c4 6 11 12 11 20a11 11 0 1 1-22 0c0-8 7-14 11-20Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M13 25h14M20 25v8"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h1>PrimeView</h1>
      <p className="subtitle">Prime View Co-operative Housing Society Ltd.</p>
      <p className="prompt">Select a form to fill:</p>
      <div className="category-buttons">
        {(Object.keys(FORM_TYPE_LABELS) as FormType[]).map((t) => (
          <button key={t} className="cat-card" onClick={() => onSelect(t)}>
            <span>
              <span className="cat-name">{FORM_TYPE_LABELS[t]}</span>
              <span className="cat-desc">{FORM_TYPE_DESCRIPTIONS[t]}</span>
            </span>
            <span className="cat-arrow">→</span>
          </button>
        ))}
      </div>
      <button className="ghost category-ghost" onClick={onRecords}>
        View saved records
      </button>
    </div>
  )
}
