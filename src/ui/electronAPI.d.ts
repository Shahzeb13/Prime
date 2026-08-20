interface PrintResult {
  success: boolean
  failureReason?: string
}

interface ElectronAPI {
  loadReferenceImage: (formType: string, pageIndex: number) => Promise<string | null>
  saveReferenceImage: (formType: string, pageIndex: number, dataUrl: string) => Promise<string | null>
  dialogPrint: (pageSize?: { width: number; height: number }) => Promise<PrintResult>
  silentPrint: (pageSize?: { width: number; height: number }) => Promise<PrintResult>
  exportLayout: (layoutData: string, defaultFilename?: string) => Promise<boolean>
  importLayout: () => Promise<unknown>
  loadPositions: () => Promise<unknown>
  savePositions: (positions: unknown) => Promise<boolean>
  loadCustomFields: () => Promise<unknown[]>
  saveCustomFields: (fields: unknown) => Promise<boolean>
  loadHiddenFields: () => Promise<unknown>
  saveHiddenFields: (fields: unknown) => Promise<boolean>
  saveSubmission: (formType: string, payload: unknown) => Promise<number | null>
  loadSubmissions: (formType: string) => Promise<unknown[]>
  deleteSubmission: (id: number) => Promise<boolean>
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}