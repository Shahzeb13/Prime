import { contextBridge, ipcRenderer } from 'electron'

const api = {
  loadReferenceImage: (formType: string, pageIndex: number): Promise<string | null> =>
    ipcRenderer.invoke('load-reference-image', formType, pageIndex),
  saveReferenceImage: (
    formType: string,
    pageIndex: number,
    dataUrl: string,
  ): Promise<string | null> =>
    ipcRenderer.invoke('save-reference-image', formType, pageIndex, dataUrl),
  dialogPrint: (pageSize?: { width: number; height: number }): Promise<{ success: boolean; failureReason?: string }> =>
    ipcRenderer.invoke('dialog-print', pageSize),
  silentPrint: (pageSize?: { width: number; height: number }): Promise<{ success: boolean; failureReason?: string }> =>
    ipcRenderer.invoke('silent-print', pageSize),
  exportLayout: (layoutData: string, defaultFilename?: string): Promise<boolean> =>
    ipcRenderer.invoke('export-layout', layoutData, defaultFilename),
  importLayout: (): Promise<unknown> =>
    ipcRenderer.invoke('import-layout'),
  loadPositions: (): Promise<unknown> => ipcRenderer.invoke('load-positions'),
  savePositions: (positions: unknown): Promise<boolean> =>
    ipcRenderer.invoke('save-positions', positions),
  loadCustomFields: (): Promise<unknown[]> => ipcRenderer.invoke('load-custom-fields'),
  saveCustomFields: (fields: unknown): Promise<boolean> =>
    ipcRenderer.invoke('save-custom-fields', fields),
  loadHiddenFields: (): Promise<unknown> => ipcRenderer.invoke('load-hidden-fields'),
  saveHiddenFields: (fields: unknown): Promise<boolean> =>
    ipcRenderer.invoke('save-hidden-fields', fields),
  saveSubmission: (formType: string, payload: unknown): Promise<number | null> =>
    ipcRenderer.invoke('save-submission', formType, payload),
  loadSubmissions: (formType: string): Promise<unknown[]> =>
    ipcRenderer.invoke('load-submissions', formType),
  deleteSubmission: (id: number): Promise<boolean> =>
    ipcRenderer.invoke('delete-submission', id),
}

contextBridge.exposeInMainWorld('electronAPI', api)