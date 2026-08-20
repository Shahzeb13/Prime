import { CATEGORY_OPTIONS, type FormType } from './formTypes'

export type FieldType = 'text' | 'date' | 'checkbox' | 'category' | 'image' | 'radio'

export interface FieldMeta {
  id: string
  label: string
  type: FieldType
  width?: string
  options?: string[]
}

const t = (id: string, label: string, width?: string): FieldMeta => ({
  id,
  label,
  type: 'text',
  width,
})

const d = (id: string, label: string, width?: string): FieldMeta => ({
  id,
  label,
  type: 'date',
  width,
})

const cb = (id: string, label: string): FieldMeta => ({ id, label, type: 'checkbox' })

const cat = (label: string): FieldMeta => ({ id: 'category', label, type: 'category' })

const img = (id: string, label: string): FieldMeta => ({ id, label, type: 'image' })

export const FORM_FIELDS: Record<FormType, FieldMeta[][]> = {
  application: [
    [
      d('date', 'Date', '110px'),
      t('membership_no', 'Membership No.', '90px'),
      t('block_no', 'Block No', '90px'),
      t('street_no', 'Street No', '90px'),
      t('plot_no', 'Plot No', '90px'),
      t('plot_size', 'Plot Size', '110px'),
      t('plot_type', 'Plot Type', '120px'),
      t('total_price', 'Total Price', '120px'),
      t('payment', 'Payment', '120px'),
      t('monthly_installment', 'Monthly Installment', '120px'),
      t('customer_name', 'NAME', '220px'),
      t('customer_so_do_wo', 'S/O, D/O, W/O', '220px'),
      t('customer_address', 'ADDRESS', '220px'),
      t('customer_cnic', 'CNIC NO', '200px'),
      t('customer_contact', 'CONTACT NO', '160px'),
      t('nok_name', 'NAME', '220px'),
      t('nok_so_do_wo', 'S/O, D/O, W/O', '220px'),
      t('nok_cnic', 'CNIC NO', '200px'),
      t('nok_relation', 'RELATION', '160px'),
      t('office_sign', 'SIGN', '120px'),
      t('project_name', 'PROJECT NAME', '220px'),
      cb('installment', 'INSTALLMENT'),
      cb('full_payment', 'FULL PAYMENT'),
      cb('others', 'OTHERS'),
      t('plot_shop_apartment_office', 'PLOT/SHOP/APARTMENT/OFFICE', '200px'),
      t('office_block', 'BLOCK', '120px'),
      t('remarks', 'REMARKS', '260px'),
      t('secretary_sign', 'SECRETARY', '150px'),
      img('photo', 'Applicant Photo'),
    ],
  ],
  schedule: [
    [
      cat('Please Tick Particular Category'),
      t('block_no', 'Block No', '90px'),
      t('street_no', 'Street No', '90px'),
      t('plot_no', 'Plot No', '90px'),
      t('plot_size', 'Plot Size', '110px'),
      t('applicant_signature', 'Signature of Applicant', '200px'),
    ],
  ],
  booking: [
    [
      t('membership_no', 'Membership No', '90px'),
      d('date', 'Date', '110px'),
      t('applicant_name', 'Name of Applicant', '220px'),
      t('applicant_so_do_wo', 'S/O, D/O, W/O', '220px'),
      t('applicant_cnic_nicop', 'CNIC/ NICOP#', '200px'),
      t('applicant_contact_no', 'Contact No', '160px'),
      t('applicant_email', 'Email Address', '200px'),
      t('applicant_mailing_address', 'Mailing Address', '220px'),
      t('nok_name', 'Name of NOK', '220px'),
      t('nok_cnic_nicop', 'CNIC or NICOP of NOK', '200px'),
      cat('Please Tick Particular Category'),
      t('block_no', 'Block No', '90px'),
      t('street_no', 'Street No', '90px'),
      t('plot_no', 'Plot No', '90px'),
      t('plot_size', 'Plot Size', '110px'),
      t('down_payment', 'Down Payment', '140px'),
      t('applicant_signature', 'Signature of Applicant', '200px'),
      t('signature_tr_branch', 'PVCHS Stamp & Signature (T&R Branch)', '200px'),
      t('signature_general_secretary', 'PVCHS Stamp & Signature (General Secretary)', '200px'),
      t('signature_president', 'PVCHS Stamp & Signature (President)', '200px'),
    ],
    [
      t('amount_rs', 'Amount Rs', '140px'),
      t('amount_in_words', 'Amount in Words', '260px'),
      t('bank_branch_deposited', 'Bank Name & Branch Code', '220px'),
      d('declaration_date', 'Date', '110px'),
      t('applicant_signature_thumb', 'Signature & thumb of Applicant', '220px'),
    ],
  ],
}

export const CATEGORY_KEY = (opt: string) => `category:${opt}`

export const ALL_CATEGORY_KEYS = CATEGORY_OPTIONS.map(CATEGORY_KEY)

export function fieldKeysForPage(formType: FormType, pageIndex: number): string[] {
  const metaList = FORM_FIELDS[formType][pageIndex]
  const keys: string[] = []
  for (const meta of metaList) {
    if (meta.type === 'category') {
      keys.push(...ALL_CATEGORY_KEYS)
    } else {
      keys.push(meta.id)
    }
  }
  return keys
}