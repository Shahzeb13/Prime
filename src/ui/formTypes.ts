export type FormType = 'application' | 'schedule' | 'booking' | 'open_file'

export const FORM_TYPE_LABELS: Record<FormType, string> = {
  application: 'Application Form',
  schedule: '04 Year Payment Schedule',
  booking: 'Booking Form',
  open_file: 'Open File',
}

export const CATEGORY_OPTIONS = [
  '05 Marla Residential',
  '7.5 Marla Residential',
  '10 Marla Residential',
  '13 Marla Residential',
  '1 Kanal Residential',
  '2 Kanal Farm House',
] as const

export type CategoryOption = (typeof CATEGORY_OPTIONS)[number]
