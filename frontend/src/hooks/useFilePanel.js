import { useState } from 'react'

/**
 * Flatten FastAPI / Axios error into a human-readable string.
 * Used identically in FormPanel, AgentChat — single source of truth.
 */
export const flattenApiError = (e) => {
  const detail = e.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map(d => d.msg || JSON.stringify(d)).join('\n')
  return e.message
}

/**
 * Trigger a browser download for a generated XML file object { name, content }.
 */
export const downloadFile = (file) => {
  const blob = new Blob([file.content], { type: 'application/xml' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: file.name })
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Shared state for the generated-files panel.
 * Consumed by App (to drive the right panel) and passed down as callbacks to children.
 */
export default function useFilePanel() {
  const [files,    setFiles]    = useState([])
  const [selected, setSelected] = useState(null)

  const addFiles = (newFiles) => {
    if (!newFiles?.length) return
    setFiles(prev => [...prev, ...newFiles])
    setSelected(newFiles[0])
  }

  return { files, selected, setSelected, addFiles }
}
