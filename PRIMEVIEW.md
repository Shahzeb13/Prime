# PrimeView — Web Porting Guide

Complete end-to-end specification for rebuilding the Electron desktop app as a web application.

---

## 1. Application Overview

**PrimeView** is a form-filling and printing application for Pakistani housing society documents (Prime View Housing Society). It renders PDF-like forms in-browser, allows precise field calibration, and prints to physical printers on custom paper sizes (primarily 8.5×13").

**Core capabilities:**
- Multi-page form templates (Application, Schedule, Booking)
- Drag-and-drop field positioning with percentage-based coordinates
- Custom field creation (text, date, checkbox, radio, image)
- Reference image overlay for calibration
- Print to physical printer via Electron (to be replaced with web print)
- Data persistence via localStorage / Electron store (to be replaced with backend API)

**Tech stack (current Electron):**
- React 18 + TypeScript + Vite
- Electron 28+ (main + renderer)
- No UI framework — custom CSS with CSS variables
- `pdfmake`/`jsPDF` NOT used — prints via `window.print()` / `webContents.print()`

---

## 2. Data Model

### 2.1 Form Types (`src/ui/formTypes.ts`)

```ts
type FormType = 'application' | 'schedule' | 'booking'

const FORM_TYPE_LABELS = {
  application: 'Application Form',
  schedule: 'Payment Schedule',
  booking: 'Booking Form',
}
```

### 2.2 Field Metadata (`src/ui/fields.ts`)

```ts
interface FieldMeta {
  id: string
  label: string
  type: 'text' | 'date' | 'checkbox' | 'radio' | 'image' | 'category'
  width?: string
  options?: string[]  // for radio
}

const FORM_FIELDS: Record<FormType, FieldMeta[][]> = {
  application: [ [ ...page 0 fields... ], [ ...page 1 fields... ] ],
  schedule:    [ [ ...page 0 fields... ] ],
  booking:     [ [ ...page 0 fields... ] ],
}
```

**Key fields per form:**
- `application`: 2 pages — CNIC, contact, email, shop/apartment type, membership no, name, addresses, bank, amounts, installment, price, block, street, plot, size, relation, sign, project, remarks, category (radio), photo
- `schedule`: 1 page — installment schedule table
- `booking`: 1 page — booking details

### 2.3 Field Positions (`src/ui/defaultPositions.ts`)

```ts
type FieldPosition = {
  top: number    // percentage 0-100
  left: number   // percentage 0-100
  width?: number // pixels
  height?: number // pixels (images only)
}

type PositionsMap = Record<FormType, Record<number, Record<string, FieldPosition>>>
```

- Positions are **percentage-based** relative to `.print-page` container
- Persisted per form type + page index
- Custom fields get default positions on creation

### 2.4 Form Data (`src/ui/formState.ts`)

```ts
type FormFieldValue = string | boolean | Date

type FormData = {
  application: Record<string, FormFieldValue>
  schedule:    Record<string, FormFieldValue>
  booking:     Record<string, FormFieldValue>
}
```

- Flat key-value store per form type
- Radio groups share a key (`category`), value = selected option
- Checkboxes = boolean
- Images = data URLs

### 2.5 Custom Fields (`src/ui/FormScreen.tsx`)

```ts
interface CustomFieldDef {
  id: string           // e.g. "custom_1a"
  label: string
  formType: FormType
  pageIndex: number
  type: 'text' | 'date' | 'checkbox' | 'radio' | 'image'
  width?: string
  options?: string[]   // radio only
}
```

- User-created fields persisted separately
- Integrated into field list at render time

---

## 3. UI Architecture

### 3.1 Screens (`src/ui/App.tsx`)

```
CategoryScreen  →  FormScreen  ↔  RecordsScreen
     │                │
     └─ selects form type
```

- Single-page app with view state (`category` | `form` | `records`)
- FormScreen is the main workspace

### 3.2 FormScreen Layout (`src/ui/FormScreen.tsx`)

```
┌─────────────────────────────────────────────────────────────┐
│ Toolbar (fixed top)                                          │
│ [Back] [Title] [Calibrate] [Opacity] [Fit] [Upload]         │
│ [Fine-tune] [Undo] [Reset] [Add field] [Save layout]        │
│ [Fill demo] [Print]           [Page Size Selector] ← NEW    │
└─────────────────────────────────────────────────────────────┘
│ Page Nav (if multi-page)                                     │
├──────────────────────────┬───────────────────────────────────┤
│                          │                                    │
│   .print-page-wrap       │  Fine-tune Panel (optional)       │
│   ┌──────────────────┐   │  - Position inputs (T/L/W/H)      │
│   │ .print-page      │   │  - Nudge buttons                  │
│   │  (reference img) │   │  - Delete custom fields           │
│   │  (field boxes)   │   │  - Rename custom fields           │
│   │  215.9×330.2mm   │   │                                    │
│   └──────────────────┘   │                                    │
│                          │                                    │
└──────────────────────────┴───────────────────────────────────┘
```

### 3.3 Key Components

| Component | Purpose |
|-----------|---------|
| `.print-page` | Root container matching paper size (CSS vars) |
| `.print-page-img` | Reference form image (uploaded or placeholder) |
| `.pos-field` | Draggable field box (absolute %, contains input + print value) |
| `.field-control-wrap` | Input controls (hidden in print) |
| `.field-print` | Print-only rendered value |
| `.resize-handle` | 8-direction resize (calibrate mode) |
| Fine-tune panel | Numeric position editor |

---

## 4. Print System (Critical for Web Port)

### 4.1 Current Flow (Electron)

```
User clicks Print
       ↓
FormScreen.doPrint(silent)
       ↓
electronAPI.silentPrint()  OR  electronAPI.dialogPrint()
       ↓ (main process)
win.webContents.print({
  silent: true,
  printBackground: true,
  margins: { marginType: 'none' },
  pageSize: { width: 215900, height: 330200 }  // microns
})
       ↓
OS print dialog / direct to printer
```

### 4.2 CSS Print Styling (`src/ui/index.css`)

```css
/* Page size via CSS variables — dynamic! */
:root {
  --page-width: 215.9mm;
  --page-height: 330.2mm;
}

@page {
  size: var(--page-width) var(--page-height);
  margin: 0;
}

@media print {
  body * { visibility: hidden; }
  .print-page, .print-page * { visibility: visible; }
  .print-page {
    position: absolute;
    top: 0; left: 0;
    width: var(--page-width);
    height: var(--page-height);
    box-shadow: none; margin: 0;
  }
  .print-page-img { display: none; }
  .field-control-wrap { display: none !important; }
  .field-print { display: block; }
}
```

**Key principles:**
- `@page size` drives printer paper request
- `.print-page` must match exactly (layout container)
- `margin: 0` on `@page` + `margins: { marginType: 'none' }` in Electron = full bleed
- Only `.print-page` and descendants visible in print
- Reference image hidden; form values (`.field-print`) shown

### 4.3 Web Print Requirements

**Replace Electron `webContents.print()` with:**
```ts
// Web equivalent
const printOptions = {
  // No direct API for margins/pageSize in window.print()
  // Must rely entirely on @page CSS
}

window.print()
```

**Critical CSS for web:**
```css
@page {
  size: var(--page-width) var(--page-height);
  margin: 0;                    /* Browser must support @page margin */
}

@media print {
  @page { margin: 0; }          /* Redundant but safe */
  html, body {
    margin: 0; padding: 0;      /* Reset browser defaults */
    width: var(--page-width);
    height: var(--page-height);
    overflow: hidden;
  }
  .print-page {
    position: fixed;            /* Fixed to viewport for print */
    top: 0; left: 0;
    width: var(--page-width);
    height: var(--page-height);
    transform: none !important;
    box-shadow: none;
    border-radius: 0;
  }
}
```

**Browser limitations:**
- `@page margin: 0` → not respected by all browsers (Chrome: yes, Firefox: partial, Safari: no)
- Non-printable margins (printer hardware) → typically 4-6mm unprintable
- No programmatic control over print dialog options (margins, scaling)
- User must manually select "Actual size" / "No margins" in print dialog

**Workaround for web:**
1. Generate PDF via `pdf-lib` or `jsPDF` with exact dimensions → user prints PDF
2. Or: Provide "Print to PDF" button that opens `window.print()` with instructions

---

## 5. Calibration System

### 5.1 Coordinate System

- All positions: **percentage of `.print-page` width/height**
- Origin: top-left of `.print-page`
- `top: 0` = top edge, `top: 100` = bottom edge
- `left: 0` = left edge, `left: 100` = right edge

### 5.2 Drag Operations (Calibrate Mode)

```ts
// Move
top = clamp(origTop + (dy / rect.height) * 100, 0, 100)
left = clamp(origLeft + (dx / rect.width) * 100, 0, 100)

// Resize (8 directions)
width = clamp(origWidth + dx, 30, 900)
height = clamp(origHeight + dy, 40, 1100)
```

- Mouse delta → percentage via container `getBoundingClientRect()`
- Real-time preview via `updatePosition()` (debounced save)

### 5.3 Fine-Tune Panel

Numeric inputs for:
- `T` (top %), `L` (left %)
- `W` (width px), `H` (height px) — images only
- Nudge buttons (±0.5%)

---

## 6. Persistence (Electron → Web Migration)

### 6.1 Current (Electron IPC)

```ts
// Preload / electronAPI
savePositions(positions: PositionsMap)
loadPositions(): Promise<PositionsMap>
saveCustomFields(fields: CustomFieldDef[])
loadCustomFields(): Promise<CustomFieldDef[]>
saveHiddenFields(fields: Record<FormType, string[]>)
loadHiddenFields(): Promise<Record<FormType, string[]>>
saveReferenceImage(formType, pageIndex, dataUrl)
loadReferenceImage(formType, pageIndex): Promise<string>
saveSubmission(formType, data): Promise<number>  // SQLite ID
```

### 6.2 Web Replacement Strategy

| Electron API | Web Replacement |
|--------------|-----------------|
| `savePositions` | `localStorage.setItem('positions', JSON.stringify(...))` |
| `loadPositions` | `JSON.parse(localStorage.getItem('positions') || '{}')` |
| `saveCustomFields` | `localStorage.setItem('customFields', ...)` |
| `loadCustomFields` | `JSON.parse(localStorage.getItem('customFields') || '[]')` |
| `saveHiddenFields` | `localStorage.setItem('hiddenFields', ...)` |
| `loadHiddenFields` | `JSON.parse(localStorage.getItem('hiddenFields') || '{}')` |
| `saveReferenceImage` | `localStorage.setItem(`refImg:${formType}:${page}`, dataUrl)` |
| `loadReferenceImage` | `localStorage.getItem(...)` |
| `saveSubmission` | **POST /api/submissions** → returns record ID |

**Sync consideration:** Add `lastModified` timestamps for future multi-device sync.

---

## 7. Page Size System (Dynamic)

### 7.1 CSS Variables (Source of Truth)

```css
:root {
  --page-width: 215.9mm;
  --page-height: 330.2mm;
}
```

### 7.2 Presets (`FormScreen.tsx`)

```ts
const PAGE_PRESETS = [
  { label: 'Letter (8.5×11")', width: '215.9mm', height: '279.4mm' },
  { label: 'Legal (8.5×14")',  width: '215.9mm', height: '355.6mm' },
  { label: '8.5×13" (custom)',  width: '215.9mm', height: '330.2mm' },
  { label: 'A4 (210×297mm)',    width: '210mm',   height: '297mm' },
  { label: 'A5 (148×210mm)',    width: '148mm',   height: '210mm' },
]
```

### 7.3 Runtime Application

```tsx
useEffect(() => {
  document.documentElement.style.setProperty('--page-width', pageSize.width)
  document.documentElement.style.setProperty('--page-height', pageSize.height)
  localStorage.setItem('pageSize', JSON.stringify(pageSize))
}, [pageSize])
```

- Updates `@page`, `.print-page`, preview instantly
- Persisted to localStorage

---

## 8. Reference Images

- One per form type + page index
- Uploaded via file input → converted to data URL
- Stored in localStorage (Electron: file system)
- Displayed as `.print-page-img` with opacity slider
- `Fit image` toggle: `object-fit: contain` → `fill`

---

## 9. Styling System

### 9.1 CSS Variables (`src/ui/index.css`)

```css
:root {
  /* Colors */
  --text: #3a4140;
  --text-h: #12211a;
  --muted: #808285;
  --bg: #f2f6f3;
  --panel: #fff;
  --border: #e3ebe6;
  --border-strong: #cddad2;
  --accent: #137547;
  --accent-dark: #0e5735;
  --accent-bg: rgba(19, 117, 71, 0.09);
  --accent-border: rgba(19, 117, 71, 0.42);
  --sage: #71a38b;
  --danger: #dc2626;
  --danger-bg: rgba(220, 38, 38, 0.08);

  /* Shadows */
  --shadow: 0 8px 24px rgba(14, 50, 35, 0.09);
  --shadow-lg: 0 20px 48px rgba(14, 50, 35, 0.18);

  /* Fonts */
  --sans: 'Manrope', system-ui, 'Segoe UI', Roboto, sans-serif;
  --head: 'Plus Jakarta Sans', var(--sans);
  --btn: 'Poppins', var(--sans);
  --mono: ui-monospace, Consolas, monospace;

  /* Page size */
  --page-width: 215.9mm;
  --page-height: 330.2mm;
}
```

### 9.2 Key Component Styles (`src/ui/App.css`)

| Class | Purpose |
|-------|---------|
| `.form-screen` | Main container, flex column |
| `.form-toolbar` | Top bar, flex wrap, gap |
| `.print-page-wrap` | Gray background, rounded, shadow, overflow-x |
| `.print-page` | White paper sheet, centered, shadow |
| `.pos-field` | Absolute %, z-index 1, contains controls |
| `.field-control-wrap` | Input UI (hidden in print) |
| `.field-print` | Print-only text (visible in print) |
| `.calibrating` | Dashed red outline, shows resize handles |
| `.selected` | Blue outline |
| `.fine-tune-panel` | Right sidebar, fixed width |
| `.page-size-selector` | Toolbar dropdown + custom inputs |

---

## 10. Web Port Implementation Checklist

### 10.1 Project Setup
- [ ] `npm create vite@latest primeview-web -- --template react-ts`
- [ ] Install deps: `npm i` (no Electron)
- [ ] Copy `src/ui/` → new project `src/`
- [ ] Copy `public/` assets (form-reference.jpg)
- [ ] Configure Vite: `base: './'` for relative paths

### 10.2 Remove Electron Dependencies
- [ ] Delete `src/electron/`, `src/ui/electronAPI.d.ts`
- [ ] Replace `window.electronAPI.*` calls with localStorage / API
- [ ] Create `src/api/storage.ts` abstraction layer

### 10.3 Print System
- [ ] Verify `@page` CSS works in target browsers
- [ ] Add "Print to PDF" fallback (generate PDF via `pdf-lib`)
- [ ] Test on Chrome, Firefox, Safari, Edge
- [ ] Document print dialog settings for users

### 10.4 Data Persistence
- [ ] Implement `localStorage` adapter matching Electron API
- [ ] Add migration from old Electron store (if users migrate)
- [ ] Optional: IndexedDB for large reference images

### 10.5 Backend API (for submissions)
- [ ] `POST /api/submissions` — save form data, return ID
- [ ] `GET /api/submissions` — list records (RecordsScreen)
- [ ] `GET /api/submissions/:id` — load record
- [ ] Auth: JWT or session (if multi-user)

### 10.6 Fonts
- [ ] Self-host Manrope, Plus Jakarta Sans, Poppins (Google Fonts)
- [ ] Add `@font-face` in `index.css`
- [ ] Preload critical fonts

### 10.7 PWA (Optional but Recommended)
- [ ] `vite-plugin-pwa` for offline caching
- [ ] Service worker caches form templates, reference images
- [ ] Install prompt for "app-like" experience

### 10.8 Testing Checklist
- [ ] Form rendering matches Electron pixel-for-pixel
- [ ] Drag/resize calibration works on touch devices
- [ ] Print output on 8.5×13" paper fills page correctly
- [ ] Print output on A4/Letter scales correctly
- [ ] Custom fields persist across reloads
- [ ] Reference images persist across reloads
- [ ] Multi-page navigation works
- [ ] Undo/Reset work
- [ ] Demo data fill works

---

## 11. File Structure (Web)

```
primeview-web/
├── public/
│   ├── form-reference.jpg
│   └── favicon.ico
├── src/
│   ├── api/
│   │   ├── storage.ts          # localStorage adapter
│   │   └── submissions.ts      # backend API calls
│   ├── components/
│   │   ├── PageSizeSelector.tsx
│   │   ├── FineTunePanel.tsx
│   │   ├── Toolbar.tsx
│   │   ├── PrintPage.tsx
│   │   └── PosField.tsx
│   ├── screens/
│   │   ├── CategoryScreen.tsx
│   │   ├── FormScreen.tsx
│   │   └── RecordsScreen.tsx
│   ├── hooks/
│   │   ├── usePositions.ts
│   │   ├── useCustomFields.ts
│   │   ├── useReferenceImages.ts
│   │   └── usePageSize.ts
│   ├── types/
│   │   ├── formTypes.ts
│   │   ├── fields.ts
│   │   ├── formState.ts
│   │   └── positions.ts
│   ├── utils/
│   │   ├── defaultPositions.ts
│   │   ├── mergePositions.ts
│   │   └── dummyData.ts
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   └── App.css
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 12. Known Gotchas

| Issue | Solution |
|-------|----------|
| `@page margin: 0` ignored | Warn users to set "Margins: None" in print dialog; provide PDF export |
| Percentage positions drift on zoom | Use `getBoundingClientRect()` on `.print-page` (not window) |
| Reference image aspect ratio | `object-fit: contain` default; `fill` stretches to page |
| Radio group rendering | Single key (`category`), multiple `.pos-field` with `:option` suffix |
| Category fields | Special type — renders as radio group with `ALL_CATEGORY_KEYS` |
| Image field sizing | Width/height in **pixels** (not %) — stored in position |
| Custom field delete | Removes from `customFields` AND cleans up positions |
| Undo history | 50-step limit, per-field-type |
| Print preview vs actual | `@media print` styles differ from screen — test both |

---

## 13. Migration Notes for Existing Users

If migrating from Electron app:
1. Export data via "Save layout" / "Save submission"
2. Web app reads `localStorage` keys (same names)
3. Reference images: re-upload (data URLs too large for clean export)
4. Page size preference: auto-detected from localStorage

---

## 14. Future Enhancements (Post-MVP)

- Multi-user with authentication
- Form template designer (visual)
- PDF generation server-side (Puppeteer) for perfect prints
- Batch printing
- Form validation rules
- Conditional field visibility
- Audit trail / version history
- Mobile-responsive calibration (touch-friendly)

---

## 15. Quick Reference: Key Files to Port

| Electron Path | Web Path | Notes |
|---------------|----------|-------|
| `src/ui/App.tsx` | `src/App.tsx` | Root, view routing |
| `src/ui/FormScreen.tsx` | `src/screens/FormScreen.tsx` | Main logic — split into components |
| `src/ui/CategoryScreen.tsx` | `src/screens/CategoryScreen.tsx` | Simple |
| `src/ui/RecordsScreen.tsx` | `src/screens/RecordsScreen.tsx` | Needs backend API |
| `src/ui/index.css` | `src/index.css` | Global vars, print styles |
| `src/ui/App.css` | `src/App.css` | Component styles |
| `src/ui/formTypes.ts` | `src/types/formTypes.ts` | Types |
| `src/ui/fields.ts` | `src/types/fields.ts` | Field metadata |
| `src/ui/formState.ts` | `src/types/formState.ts` | Form data types |
| `src/ui/defaultPositions.ts` | `src/utils/defaultPositions.ts` | Default layouts |
| `src/ui/electronAPI.d.ts` | `src/api/storage.ts` | **Replace entirely** |

---

*Generated for AI-assisted web port. All logic, types, and flows documented for faithful reproduction.*