import { type FormType } from './formTypes'

export interface SavedRecord {
  id: number
  formType: FormType
  createdAt: string
  payload: Record<string, string | boolean>
}

const NAME_KEYS = ['customer_name', 'applicant_name', 'name', 'applicant', 'client_name']
const CNIC_KEYS = ['customer_cnic', 'cnic', 'applicant_cnic', 'cnic_no', 'nok_cnic']
const CONTACT_KEYS = ['customer_contact', 'contact', 'phone', 'mobile', 'contact_no']

export function getPrimaryValue(rec: SavedRecord, keys: string[]): string {
  for (const k of keys) {
    const v = rec.payload[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

export function getApplicantName(rec: SavedRecord): string {
  return getPrimaryValue(rec, NAME_KEYS) || '—'
}

export function getCNIC(rec: SavedRecord): string {
  return getPrimaryValue(rec, CNIC_KEYS) || '—'
}

export function getContact(rec: SavedRecord): string {
  return getPrimaryValue(rec, CONTACT_KEYS) || '—'
}

export function getCNICOrContact(rec: SavedRecord): string {
  const cnic = getCNIC(rec)
  const contact = getContact(rec)
  if (cnic !== '—' && contact !== '—') return `${cnic} / ${contact}`
  return cnic === '—' ? contact : cnic
}

export function formatKeyLabel(key: string): string {
  const clean = key.replace(/^custom_/, '').replace(/_/g, ' ')
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

export function isImageValue(v: string | boolean): boolean {
  if (typeof v !== 'string') return false
  return /^data:image\//i.test(v) || /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(v)
}

const isDummyPlaceholder = (s: string): boolean => {
  if (!/^data:image\/svg\+xml/i.test(s)) return false
  return s.length < 2000 && /<text[^>]*>PV<\/text>/i.test(s)
}

export function pickApplicantPhoto(payload: Record<string, string | boolean>): string {
  const entries = Object.entries(payload).filter(
    (entry): entry is [string, string] => isImageValue(entry[1]),
  )
  if (!entries.length) return ''
  const realPhotos = entries.filter(([, v]) => !isDummyPlaceholder(v))
  const pool = realPhotos.length ? realPhotos : entries
  return pool.sort((a, b) => b[1].length - a[1].length)[0][1]
}

export function formatValue(v: string | boolean): string {
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v || '—')
}

export function formatDate(createdAt: string): string {
  const d = new Date(createdAt)
  if (isNaN(d.getTime())) return createdAt
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
