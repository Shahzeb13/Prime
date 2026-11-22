import { useState } from 'react'
import CategoryScreen from './CategoryScreen'
import FormScreen from './FormScreen'
import RecordsScreen from './RecordsScreen'
import TitleBar from './TitleBar'
import { type FormType } from './formTypes'
import {
  initialFormData,
  updateFormData,
  type FormData,
  type FormFieldValue,
} from './formState'
import { type SavedRecord } from './recordUtils'
import './App.css'

type View = 'category' | 'form' | 'records'

function App() {
  const [view, setView] = useState<View>('category')
  const [formType, setFormType] = useState<FormType>('application')
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null)

  const selectCategory = (t: FormType) => {
    setEditingRecordId(null)
    setFormType(t)
    setFormData((prev) => ({
      ...prev,
      [t]: { ...initialFormData[t] },
    }))
    setView('form')
  }

  const handleEditRecord = (record: SavedRecord) => {
    let payloadObj: Record<string, FormFieldValue> = {}
    if (record.payload) {
      if (typeof record.payload === 'string') {
        try {
          payloadObj = JSON.parse(record.payload)
        } catch {
          payloadObj = {}
        }
      } else if (typeof record.payload === 'object') {
        payloadObj = record.payload as Record<string, FormFieldValue>
      }
    }

    setEditingRecordId(record.id)
    setFormType(record.formType)
    setFormData((prev) => ({
      ...prev,
      [record.formType]: {
        ...initialFormData[record.formType],
        ...payloadObj,
      },
    }))
    setView('form')
  }

  const handleChange = (field: string, value: FormFieldValue) => {
    console.log(`[formData.${formType}.${field}] =`, value)
    setFormData((prev) => updateFormData(prev, formType, field, value))
  }

  const handleSave = async (ft: FormType, data: unknown, recordId?: number | null) => {
    if (!window.electronAPI) return null
    if (recordId) {
      const success = await window.electronAPI.updateSubmission(recordId, ft, data)
      return success ? recordId : null
    }
    return window.electronAPI.saveSubmission(ft, data)
  }

  return (
    <>
      <TitleBar />
      {view === 'category' && (
        <CategoryScreen onSelect={selectCategory} onRecords={() => setView('records')} />
      )}
      {view === 'form' && (
        <FormScreen
          key={`${formType}-${editingRecordId ?? 'new'}`}
          formType={formType}
          formData={formData}
          editingRecordId={editingRecordId}
          onChange={handleChange}
          onBack={() => setView(editingRecordId !== null ? 'records' : 'category')}
          onSave={handleSave}
        />
      )}
      {view === 'records' && (
        <RecordsScreen
          onBack={() => setView('category')}
          onEditRecord={handleEditRecord}
        />
      )}
    </>
  )
}

export default App