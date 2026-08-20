import { useState } from 'react'
import CategoryScreen from './CategoryScreen'
import FormScreen from './FormScreen'
import RecordsScreen from './RecordsScreen'
import { type FormType } from './formTypes'
import {
  initialFormData,
  updateFormData,
  type FormData,
  type FormFieldValue,
} from './formState'
import './App.css'

type View = 'category' | 'form' | 'records'

function App() {
  const [view, setView] = useState<View>('category')
  const [formType, setFormType] = useState<FormType>('application')
  const [formData, setFormData] = useState<FormData>(initialFormData)

  const selectCategory = (t: FormType) => {
    setFormType(t)
    setView('form')
  }

  const handleChange = (field: string, value: FormFieldValue) => {
    console.log(`[formData.${formType}.${field}] =`, value)
    setFormData((prev) => updateFormData(prev, formType, field, value))
  }

  const handleSave = async (ft: FormType, data: unknown) => {
    if (!window.electronAPI?.saveSubmission) return null
    return window.electronAPI.saveSubmission(ft, data)
  }

  return (
    <>
      {view === 'category' && (
        <CategoryScreen onSelect={selectCategory} onRecords={() => setView('records')} />
      )}
      {view === 'form' && (
        <FormScreen
          key={formType}
          formType={formType}
          formData={formData}
          onChange={handleChange}
          onBack={() => setView('category')}
          onSave={handleSave}
        />
      )}
      {view === 'records' && <RecordsScreen onBack={() => setView('category')} />}
    </>
  )
}

export default App