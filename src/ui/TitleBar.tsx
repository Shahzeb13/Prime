import { isDev } from './isDev'

export default function TitleBar() {
  // Custom title bar appears ONLY in production build mode, NOT in dev mode!
  if (isDev()) {
    return null
  }

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow()
  }

  const handleMaximize = () => {
    window.electronAPI?.maximizeWindow()
  }

  const handleClose = () => {
    window.electronAPI?.closeWindow()
  }

  return (
    <div className="custom-title-bar">
      <div className="title-bar-drag-area">
        <span className="title-bar-title">PrimeView</span>
      </div>
      <div className="title-bar-controls">
        <button
          type="button"
          className="title-btn title-btn-minimize"
          title="Minimize"
          onClick={handleMinimize}
        >
          &#8722;
        </button>
        <button
          type="button"
          className="title-btn title-btn-maximize"
          title="Maximize"
          onClick={handleMaximize}
        >
          &#9633;
        </button>
        <button
          type="button"
          className="title-btn title-btn-close"
          title="Close"
          onClick={handleClose}
        >
          &#10005;
        </button>
      </div>
    </div>
  )
}
