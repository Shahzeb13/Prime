import type { CategoryOption, FormType } from './formTypes'

export type FormFieldValue = string | boolean | CategoryOption | ''

export interface ApplicationFormData {
  date: string
  membership_no: string
  block_no: string
  street_no: string
  plot_no: string
  plot_size: string
  plot_type: string
  total_price: string
  payment: string
  monthly_installment: string
  customer_name: string
  customer_so_do_wo: string
  customer_address: string
  customer_cnic: string
  customer_contact: string
  nok_name: string
  nok_so_do_wo: string
  nok_cnic: string
  nok_relation: string
  office_sign: string
  project_name: string
  installment: boolean
  full_payment: boolean
  others: boolean
  plot_shop_apartment_office: string
  office_block: string
  remarks: string
  secretary_sign: string
  photo: string
}

export interface ScheduleFormData {
  category: CategoryOption | ''
  block_no: string
  street_no: string
  plot_no: string
  plot_size: string
  applicant_signature: string
}

export interface BookingFormData {
  membership_no: string
  date: string
  applicant_name: string
  applicant_so_do_wo: string
  applicant_cnic_nicop: string
  applicant_contact_no: string
  applicant_email: string
  applicant_mailing_address: string
  nok_name: string
  nok_cnic_nicop: string
  category: CategoryOption | ''
  block_no: string
  street_no: string
  plot_no: string
  plot_size: string
  down_payment: string
  applicant_signature: string
  signature_tr_branch: string
  signature_general_secretary: string
  signature_president: string
  amount_rs: string
  amount_in_words: string
  bank_branch_deposited: string
  declaration_date: string
  applicant_signature_thumb: string
}

export interface FormData {
  application: ApplicationFormData
  schedule: ScheduleFormData
  booking: BookingFormData
}

export const initialFormData: FormData = {
  application: {
    date: '',
    membership_no: '',
    block_no: '',
    street_no: '',
    plot_no: '',
    plot_size: '',
    plot_type: '',
    total_price: '',
    payment: '',
    monthly_installment: '',
    customer_name: '',
    customer_so_do_wo: '',
    customer_address: '',
    customer_cnic: '',
    customer_contact: '',
    nok_name: '',
    nok_so_do_wo: '',
    nok_cnic: '',
    nok_relation: '',
    office_sign: '',
    project_name: '',
    installment: false,
    full_payment: false,
    others: false,
    plot_shop_apartment_office: '',
    office_block: '',
    remarks: '',
    secretary_sign: '',
    photo: '',
  },
  schedule: {
    category: '',
    block_no: '',
    street_no: '',
    plot_no: '',
    plot_size: '',
    applicant_signature: '',
  },
  booking: {
    membership_no: '',
    date: '',
    applicant_name: '',
    applicant_so_do_wo: '',
    applicant_cnic_nicop: '',
    applicant_contact_no: '',
    applicant_email: '',
    applicant_mailing_address: '',
    nok_name: '',
    nok_cnic_nicop: '',
    category: '',
    block_no: '',
    street_no: '',
    plot_no: '',
    plot_size: '',
    down_payment: '',
    applicant_signature: '',
    signature_tr_branch: '',
    signature_general_secretary: '',
    signature_president: '',
    amount_rs: '',
    amount_in_words: '',
    bank_branch_deposited: '',
    declaration_date: '',
    applicant_signature_thumb: '',
  },
}

export function updateFormData(
  state: FormData,
  formType: FormType,
  field: string,
  value: FormFieldValue,
): FormData {
  const form = state[formType] as unknown as Record<string, FormFieldValue>
  const next = { ...form, [field]: value }
  switch (formType) {
    case 'application':
      return { ...state, application: next as unknown as ApplicationFormData }
    case 'schedule':
      return { ...state, schedule: next as unknown as ScheduleFormData }
    case 'booking':
      return { ...state, booking: next as unknown as BookingFormData }
  }
}
