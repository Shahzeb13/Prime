import { BrowserWindow, app, ipcMain, dialog } from "electron"
import path from "path";
import fs from "fs";
import { DatabaseSync } from "node:sqlite"
import { isDev } from "./util.js"

const refImageDir = () => path.join(app.getPath("userData"), "reference-images")

const OLD_USER_DATA = path.join(app.getPath("appData"), "printIt")
const NEW_USER_DATA = path.join(app.getPath("appData"), "PrimeView")

function migrateUserData(): void {
  if (fs.existsSync(NEW_USER_DATA) || !fs.existsSync(OLD_USER_DATA)) return
  const items = [
    "positions.json",
    "custom-fields.json",
    "hidden-fields.json",
    "printit.db",
    "reference-images",
  ]
  try {
    fs.mkdirSync(NEW_USER_DATA, { recursive: true })
    for (const it of items) {
      const src = path.join(OLD_USER_DATA, it)
      const dst = path.join(NEW_USER_DATA, it)
      if (fs.existsSync(src)) fs.cpSync(src, dst, { recursive: true })
    }
  } catch {
    // Migration is best-effort; the app keeps working with a fresh userData.
  }
}

migrateUserData()
app.setPath("userData", NEW_USER_DATA)

let mainWindow: BrowserWindow | null = null
let db: DatabaseSync | null = null

interface SubmissionRow {
  id: number
  form_type: string
  payload: string
  created_at: string
}

function initDb(): void {
  const file = path.join(app.getPath("userData"), "printit.db")
  db = new DatabaseSync(file)
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      form_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
}

function saveSubmission(formType: string, payload: unknown): number | null {
  if (!db) return null
  const res = db
    .prepare("INSERT INTO submissions (form_type, payload) VALUES (?, ?)")
    .run(formType, JSON.stringify(payload))
  return Number(res.lastInsertRowid)
}

function loadSubmissions(formType: string) {
  if (!db) return []
  const isAll = formType === "all" || !formType
  const sql = isAll
    ? "SELECT id, form_type, payload, created_at FROM submissions ORDER BY id DESC"
    : "SELECT id, form_type, payload, created_at FROM submissions WHERE form_type = ? ORDER BY id DESC"
  const rows = (isAll
    ? db.prepare(sql).all()
    : db.prepare(sql).all(formType)) as unknown as SubmissionRow[]
  return rows.map((r) => ({
    id: r.id,
    formType: r.form_type,
    createdAt: r.created_at,
    payload: JSON.parse(r.payload),
  }))
}

function deleteSubmission(id: number): boolean {
  if (!db) return false
  const res = db.prepare("DELETE FROM submissions WHERE id = ?").run(id)
  return res.changes > 0
}

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
}

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
}

function findReferenceImage(formType: string, pageIndex: number): string | null {
  const dir = refImageDir()
  if (!fs.existsSync(dir)) return null
  const files = fs.readdirSync(dir).filter((f) => f.startsWith(`${formType}-${pageIndex}.`))
  if (files.length) return path.join(dir, files[0])
  if (pageIndex === 0) {
    const legacy = fs.readdirSync(dir).filter((f) => f.startsWith(`${formType}.`))
    return legacy.length ? path.join(dir, legacy[0]) : null
  }
  return null
}

function registerIpcHandlers(): void {
  ipcMain.handle("load-reference-image", (_event, formType: string, pageIndex: number) => {
    const file = findReferenceImage(formType, pageIndex)
    if (!file) return null
    const buf = fs.readFileSync(file)
    const ext = path.extname(file).replace(".", "").toLowerCase()
    const mime = EXT_MIME[ext] ?? "image/jpeg"
    return `data:${mime};base64,${buf.toString("base64")}`
  })

  ipcMain.handle(
    "save-reference-image",
    (_event, formType: string, pageIndex: number, dataUrl: string) => {
      const match = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(dataUrl)
      if (!match) return null
      const ext = MIME_EXT[match[1]] ?? "png"
      const dir = refImageDir()
      fs.mkdirSync(dir, { recursive: true })
      for (const f of fs.readdirSync(dir)) {
        if (f.startsWith(`${formType}-${pageIndex}.`)) fs.unlinkSync(path.join(dir, f))
      }
      const file = path.join(dir, `${formType}-${pageIndex}.${ext}`)
      fs.writeFileSync(file, Buffer.from(match[2], "base64"))
      return dataUrl
    },
  )

  ipcMain.handle("load-positions", () => {
    const file = path.join(app.getPath("userData"), "positions.json")
    if (!fs.existsSync(file)) return null
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"))
    } catch {
      return null
    }
  })

  ipcMain.handle("save-positions", (_event, positions: unknown) => {
    const file = path.join(app.getPath("userData"), "positions.json")
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(positions, null, 2), "utf8")
    return true
  })

  ipcMain.handle("load-custom-fields", () => {
    const file = path.join(app.getPath("userData"), "custom-fields.json")
    if (!fs.existsSync(file)) return []
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"))
    } catch {
      return []
    }
  })

  ipcMain.handle("save-custom-fields", (_event, fields: unknown) => {
    const file = path.join(app.getPath("userData"), "custom-fields.json")
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(fields, null, 2), "utf8")
    return true
  })

  ipcMain.handle("load-hidden-fields", () => {
    const file = path.join(app.getPath("userData"), "hidden-fields.json")
    if (!fs.existsSync(file)) return {}
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"))
    } catch {
      return {}
    }
  })

  ipcMain.handle("save-hidden-fields", (_event, fields: unknown) => {
    const file = path.join(app.getPath("userData"), "hidden-fields.json")
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(fields, null, 2), "utf8")
    return true
  })

  ipcMain.handle("save-submission", (_event, formType: string, payload: unknown) =>
    saveSubmission(formType, payload),
  )

  ipcMain.handle("load-submissions", (_event, formType: string) => loadSubmissions(formType))

  ipcMain.handle("delete-submission", (_event, id: number) => deleteSubmission(id))

  ipcMain.handle("dialog-print", (_event, pageSize?: { width: number; height: number }) =>
    new Promise((resolve) => {
      const printOptions = {
        printBackground: true,
        margins: { marginType: "none" as const },
        pageSize: pageSize ? { width: pageSize.width, height: pageSize.height } : undefined,
      }
      mainWindow?.webContents.print(
        printOptions,
        (success, failureReason) => {
          resolve({ success, failureReason: failureReason ?? undefined })
        }
      )
    }),
  )

  ipcMain.handle("silent-print", (_event, pageSize?: { width: number; height: number }) =>
    new Promise((resolve) => {
      const printOptions = {
        silent: true,
        printBackground: true,
        margins: { marginType: "none" as const },
        pageSize: pageSize ? { width: pageSize.width, height: pageSize.height } : undefined,
      }
      mainWindow?.webContents.print(
        printOptions,
        (success, failureReason) => {
          resolve({ success, failureReason: failureReason ?? undefined })
        },
      )
    }),
  )

  ipcMain.handle("export-layout", async (_event, layoutData: string, defaultFilename?: string) => {
    if (!mainWindow) return false
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: "Export Layout",
      defaultPath: defaultFilename || "primeview-layout.json",
      filters: [{ name: "JSON Files", extensions: ["json"] }]
    })
    if (canceled || !filePath) return false
    try {
      fs.writeFileSync(filePath, layoutData, "utf8")
      return true
    } catch (err) {
      console.error("Export layout failed:", err)
      return false
    }
  })

  ipcMain.handle("import-layout", async () => {
    if (!mainWindow) return null
    const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
      title: "Import Layout",
      properties: ["openFile"],
      filters: [{ name: "JSON Files", extensions: ["json"] }]
    })
    if (canceled || !filePaths || filePaths.length === 0) return null
    try {
      const content = fs.readFileSync(filePaths[0], "utf8")
      return JSON.parse(content)
    } catch (err) {
      console.error("Import layout failed:", err)
      return null
    }
  })

  ipcMain.handle("window-minimize", () => {
    if (mainWindow) mainWindow.minimize()
  })

  ipcMain.handle("window-maximize", () => {
    if (!mainWindow) return
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })

  ipcMain.handle("window-close", () => {
    if (mainWindow) mainWindow.close()
  })
}

app.on("ready", () => {
  registerIpcHandlers()
  initDb()

  const mainWindowInstance = new BrowserWindow({
    title: "PrimeView",
    frame: isDev(),
    titleBarStyle: isDev() ? "default" : "hidden",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(import.meta.dirname, "preload.cjs"),
    },
  })
  if (!isDev()) {
    mainWindowInstance.setMenu(null)
  }
  mainWindow = mainWindowInstance
  if (isDev()) {
    mainWindow.loadURL('http://localhost:5135');
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), '/dist-react/index.html'));
  }
})