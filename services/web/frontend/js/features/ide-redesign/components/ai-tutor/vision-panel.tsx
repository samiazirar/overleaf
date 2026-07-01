import { useState } from 'react'
import getMeta from '@/utils/meta'
import ProviderSelect from './provider-select'
import { useApplyEdit } from './apply-edit'

type Mode = 'equation' | 'table' | 'figure' | 'algorithm' | 'ocr'
const MODES: { id: Mode; label: string }[] = [
  { id: 'equation', label: 'Equation' },
  { id: 'table', label: 'Table' },
  { id: 'figure', label: 'Figure' },
  { id: 'algorithm', label: 'Algorithm' },
  { id: 'ocr', label: 'Text (OCR)' },
]

const box = {
  fontSize: '13px',
  padding: '8px',
  borderRadius: '4px',
  border: '1px solid var(--border-divider-themed)',
  backgroundColor: 'var(--bg-primary-themed)',
  color: 'var(--content-primary-themed)',
  boxSizing: 'border-box' as const,
  width: '100%',
}

// Vision / LMM-writer: upload an image (equation, table, figure, algorithm, or
// text) and convert it to LaTeX via a vision-capable provider, then insert the
// result into the document.
export default function VisionPanel() {
  const base = getMeta('ol-sidecarUrl') ?? ''
  const projectId = getMeta('ol-project_id') ?? ''
  const apply = useApplyEdit()

  const [provider, setProvider] = useState('')
  const [mode, setMode] = useState<Mode>('equation')
  const [prompt, setPrompt] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [latex, setLatex] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const convert = async () => {
    if (!file || loading) return
    setLoading(true)
    setError(null)
    setLatex('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('mode', mode)
      if (provider) fd.append('provider', provider)
      if (projectId) fd.append('projectId', projectId)
      if (prompt.trim()) fd.append('prompt', prompt.trim())
      const resp = await fetch(`${base}/api/vision/latex`, { method: 'POST', body: fd })
      const data = (await resp.json()) as { ok: boolean; latex?: string; error?: string }
      if (!data.ok) throw new Error(data.error || `HTTP ${resp.status}`)
      setLatex(data.latex || '')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 16px', color: 'var(--content-primary-themed)' }}>
      <ProviderSelect value={provider} onChange={setProvider} disabled={loading} prefer={(id, label) => /gemini|vision|gpt-4|claude/i.test(`${id} ${label}`)} />
      <select aria-label="Mode" value={mode} disabled={loading} onChange={e => setMode(e.target.value as Mode)} style={box}>
        {MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
      </select>
      <input type="file" accept="image/*" disabled={loading} onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ fontSize: '12px' }} />
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} disabled={loading} placeholder="Optional note (e.g. 'use align environment')" rows={2} style={box} />
      <button
        type="button"
        onClick={() => void convert()}
        disabled={loading || !file}
        style={{ padding: '7px 12px', fontSize: '13px', fontWeight: 600, cursor: loading || !file ? 'not-allowed' : 'pointer', backgroundColor: 'var(--blue-50)', color: '#fff', border: 'none', borderRadius: '4px', opacity: loading || !file ? 0.6 : 1 }}
      >
        {loading ? 'Converting...' : 'Convert to LaTeX'}
      </button>
      {error && <div style={{ fontSize: '12px', color: 'var(--red-50)' }}>{error}</div>}
      {latex && (
        <>
          <pre style={{ ...box, whiteSpace: 'pre-wrap', maxHeight: '240px', overflowY: 'auto', margin: 0 }}>{latex}</pre>
          {apply && (
            <button type="button" onClick={() => apply.insertAtCursor(latex)} style={{ padding: '6px 10px', fontSize: '12px', cursor: 'pointer', backgroundColor: 'var(--green-50)', color: '#fff', border: 'none', borderRadius: '4px' }}>
              Insert into document
            </button>
          )}
        </>
      )}
    </div>
  )
}
