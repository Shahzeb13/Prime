import type { FormType } from './formTypes'
import { CATEGORY_OPTIONS } from './formTypes'

export interface RecordFieldDef {
  key: string
  label: string
  kind?: 'category'
}

export interface RecordGroupDef {
  title: string
  fields: RecordFieldDef[]
  table?: {
    label?: string
    columns: string[]
    rows: string[][]
  }
}

export const RECORD_GROUPS: Record<FormType, RecordGroupDef[]> = {
  application: [
    {
      title: 'Form Info',
      fields: [
        { key: 'date', label: 'Date' },
        { key: 'membership_no', label: 'Membership No' },
      ],
    },
    {
      title: 'Plot Details',
      fields: [
        { key: 'block_no', label: 'Block No' },
        { key: 'street_no', label: 'Street No' },
        { key: 'plot_no', label: 'Plot No' },
        { key: 'plot_size', label: 'Plot Size' },
        { key: 'plot_type', label: 'Plot Type' },
        { key: 'total_price', label: 'Total Price' },
        { key: 'payment', label: 'Payment' },
        { key: 'monthly_installment', label: 'Monthly Installment' },
      ],
    },
    {
      title: 'Customer Details',
      fields: [
        { key: 'customer_name', label: 'Name' },
        { key: 'customer_so_do_wo', label: 'S/O, D/O, W/O' },
        { key: 'customer_address', label: 'Address' },
        { key: 'customer_cnic', label: 'CNIC No' },
        { key: 'customer_contact', label: 'Contact No' },
      ],
    },
    {
      title: 'Next of Kin / Nominee Details',
      fields: [
        { key: 'nok_name', label: 'Name' },
        { key: 'nok_so_do_wo', label: 'S/O, D/O, W/O' },
        { key: 'nok_cnic', label: 'CNIC No' },
        { key: 'nok_relation', label: 'Relation' },
      ],
    },
    {
      title: 'Office Use Only',
      fields: [
        { key: 'office_sign', label: 'Sign' },
        { key: 'project_name', label: 'Project Name' },
        { key: 'installment', label: 'Installment' },
        { key: 'full_payment', label: 'Full Payment' },
        { key: 'others', label: 'Others' },
        { key: 'plot_shop_apartment_office', label: 'Plot/Shop/Apartment/Office' },
        { key: 'office_block', label: 'Block' },
        { key: 'remarks', label: 'Remarks' },
        { key: 'secretary_sign', label: 'Secretary' },
      ],
    },
    {
      title: 'Applicant Photo',
      fields: [{ key: 'photo', label: 'Applicant Photo' }],
    },
  ],
  schedule: [
    {
      title: 'Please Tick Particular Category',
      fields: [
        ...CATEGORY_OPTIONS.map((opt) => ({
          key: `category:${opt}`,
          label: opt,
          kind: 'category' as const,
        })),
        { key: 'block_no', label: 'Block No' },
        { key: 'street_no', label: 'Street No' },
        { key: 'plot_no', label: 'Plot No' },
        { key: 'plot_size', label: 'Plot Size' },
      ],
    },
  ],
  booking: [
    {
      title: 'Form Info',
      fields: [
        { key: 'membership_no', label: 'Membership No' },
        { key: 'date', label: 'Date' },
      ],
    },
    {
      title: 'Applicant Details',
      fields: [
        { key: 'applicant_name', label: 'Name of Applicant' },
        { key: 'applicant_so_do_wo', label: 'S/O, D/O, W/O' },
        { key: 'applicant_cnic_nicop', label: 'CNIC / NICOP#' },
        { key: 'applicant_contact_no', label: 'Contact No' },
        { key: 'applicant_email', label: 'Email Address' },
        { key: 'applicant_mailing_address', label: 'Mailing Address' },
      ],
    },
    {
      title: 'Next of Kin (NOK) Details',
      fields: [
        { key: 'nok_name', label: 'Name of NOK' },
        { key: 'nok_cnic_nicop', label: 'CNIC or NICOP of NOK' },
      ],
    },
    {
      title: 'Particular Category',
      fields: [
        ...CATEGORY_OPTIONS.map((opt) => ({
          key: `category:${opt}`,
          label: opt,
          kind: 'category' as const,
        })),
        { key: 'block_no', label: 'Block No' },
        { key: 'street_no', label: 'Street No' },
        { key: 'plot_no', label: 'Plot No' },
        { key: 'plot_size', label: 'Plot Size' },
      ],
    },
    {
      title: 'Cooperative Society Fees & Payments',
      fields: [{ key: 'down_payment', label: 'Down Payment' }],
    },
    {
      title: 'Payment Instructions',
      table: {
        label: 'Bank Details',
        columns: ['Ser', 'Bank Name', 'Account No', 'IBAN No'],
        rows: [
          ['1', '', '', ''],
          ['2', '', '', ''],
          ['3', '', '', ''],
        ],
      },
      fields: [
        { key: 'amount_rs', label: 'Amount Rs' },
        { key: 'amount_in_words', label: 'Amount in Words' },
        {
          key: 'bank_branch_deposited',
          label: 'Bank Name & Branch Code where Application/Amount is deposited',
        },
      ],
    },
  ],
}