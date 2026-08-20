import type { ReactNode } from 'react'
import logoImg from './assets/logo.png'
import { type FormType } from './formTypes'

interface Props {
  onSelect: (formType: FormType) => void
  onRecords: () => void
}

interface FormOption {
  type: FormType
  title: string
  desc: string
  icon: ReactNode
}

export default function CategoryScreen({ onSelect, onRecords }: Props) {
  const formOptions: FormOption[] = [
    {
      type: 'application',
      title: 'Application Form',
      desc: 'Full applicant, plot and office details',
      icon: (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#137547" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <circle cx="12" cy="14" r="2" />
          <path d="M9 19c0-1.5 1.5-2.5 3-2.5s3 1 3 2.5" />
        </svg>
      ),
    },
    {
      type: 'schedule',
      title: '04 Year Payment Schedule',
      desc: 'Payment plan and installment details',
      icon: (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#137547" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <circle cx="16" cy="15" r="2" />
          <path d="M16 14v2" />
        </svg>
      ),
    },
    {
      type: 'booking',
      title: 'Booking Form',
      desc: 'Booking terms, payments and declarations',
      icon: (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#137547" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M10.4 12.6a2 2 0 1 1 3 3L9 19l.7-3.4z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="category-screen">
      <div className="category-container">
        <div className="brand-header">
          <div className="brand-logo">
            <img src={logoImg} className="brand-logo-img" alt="PrimeView Logo" />
          </div>
          <h1 className="brand-title">PrimeView</h1>
          <p className="brand-subtitle">Prime View Co-operative Housing Society Ltd.</p>
          <div className="brand-line" />
        </div>

        <div className="section-header">
          <h2 className="section-title">Select a Form</h2>
          <p className="section-desc">Choose a document to begin a new client record.</p>
        </div>

        <div className="category-cards">
          {formOptions.map((opt) => (
            <button key={opt.type} className="cat-card-item" onClick={() => onSelect(opt.type)}>
              <div className="cat-card-icon-box">{opt.icon}</div>
              <div className="cat-card-content">
                <h3 className="cat-card-title">{opt.title}</h3>
                <p className="cat-card-desc">{opt.desc}</p>
              </div>
              <div className="cat-card-arrow">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        <div className="bottom-action">
          <button className="records-pill-btn" onClick={onRecords}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1b4332" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span>Saved Records</span>
          </button>
        </div>
      </div>
    </div>
  )
}
