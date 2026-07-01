import { useContext, useState } from 'react'
import getMeta from '@/utils/meta'
import { EditorOpenDocContext } from '@/features/ide-react/context/editor-open-doc-context'
import { EditorSelectionContext } from '@/shared/context/editor-selection-context'
import ProviderSelect from './provider-select'
import { extractDocContext } from './doc-context-extraction'
import { useApplyEdit } from './apply-edit'

const CHARTS = ['bar', 'line', 'scatter', 'pie']

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

// Plot: turn a LaTeX table into a self-contained pgfplots figure (compiles in
// Overleaf, no Python) and insert it into the document.
export default function PlotPanel() {
  const base = getMeta('ol-sidecarUrl') ?? ''
  const apply = useApplyEdit()
  const editorOpenDocCtx = useContext(EditorOpenDocContext)
  const editorSelectionCtx = useContext(EditorSelectionContext)

  const [provider, setProvider] = useState('')
  const [tableLatex, setTableLatex] = useState('')
  const [chartType, setChartType] = useState('bar')
  const [prompt, setPrompt] = useState('')
  const [latex, setLatex] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const useSelection = () => {
    const { selectionText } = extractDocContext(
      editorOpenDocCtx?.currentDocument ?? null,
      editorSelectionCtx?.editorSelection
    )
    if (selectionText) setTableLatex(selectionText)
  }

  const generate = async () => {
    if (!tableLatex.trim() || loading) return
    setLoading(true)
    setError(null)
    setLatex('')
    try {
      const resp = await fetch(`${base}/api/plot/latex`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableLatex, chartType, prompt: prompt.trim() || undefined, provider: provider || undefined }),
      })
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
      <ProviderSelect value={provider} onChange={setProvider} disabled={loading} />
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <select aria-label="Chart type" value={chartType} disabled={loading} onChange={e => setChartType(e.target.value)} style={{ ...box, width: 'auto', flex: 1 }}>
          {CHARTS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="button" onClick={useSelection} disabled={loading} style={{ padding: '6px 10px', fontSize: '12px', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--content-secondary-themed)', border: '1px solid var(--border-divider-themed)', borderRadius: '4px' }}>
          Use selection
        </button>
      </div>
      <textarea value={tableLatex} onChange={e => setTableLatex(e.target.value)} disabled={loading} placeholder="Paste a LaTeX table (\begin{tabular}...) or click Use selection" rows={5} style={box} />
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} disabled={loading} placeholder="Optional note (e.g. 'group bars by model')" rows={2} style={box} />
      <button
        type="button"
        onClick={() => void generate()}
        disabled={loading || !tableLatex.trim()}
        style={{ padding: '7px 12px', fontSize: '13px', fontWeight: 600, cursor: loading || !tableLatex.trim() ? 'not-allowed' : 'pointer', backgroundColor: 'var(--blue-50)', color: '#fff', border: 'none', borderRadius: '4px', opacity: loading || !tableLatex.trim() ? 0.6 : 1 }}
      >
        {loading ? 'Generating...' : 'Generate pgfplots figure'}
      </button>
      {error && <div style={{ fontSize: '12px', color: 'var(--red-50)' }}>{error}</div>}
      {latex && (
        <>
          <pre style={{ ...box, whiteSpace: 'pre-wrap', maxHeight: '240px', overflowY: 'auto', margin: 0 }}>{latex}</pre>
          <div style={{ fontSize: '11px', color: 'var(--content-secondary-themed)' }}>Requires \usepackage&#123;pgfplots&#125; and \pgfplotsset&#123;compat=1.18&#125; in the preamble.</div>
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
