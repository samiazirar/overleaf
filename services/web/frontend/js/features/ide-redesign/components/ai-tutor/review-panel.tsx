import { useContext, useEffect, useRef, useState } from 'react'
import getMeta from '@/utils/meta'
import { EditorOpenDocContext } from '@/features/ide-react/context/editor-open-doc-context'
import ProviderSelect from './provider-select'

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

// Peer-review the current document via the sidecar reviewer (async job + poll).
export default function ReviewPanel() {
  const base = getMeta('ol-sidecarUrl') ?? ''
  const editorOpenDocCtx = useContext(EditorOpenDocContext)

  const [provider, setProvider] = useState('')
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle')
  const [markdown, setMarkdown] = useState('')
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<number | null>(null)

  useEffect(() => () => { if (pollRef.current) window.clearInterval(pollRef.current) }, [])

  const poll = (jobId: string) => {
    if (pollRef.current) window.clearInterval(pollRef.current)
    pollRef.current = window.setInterval(async () => {
      try {
        const resp = await fetch(`${base}/api/review/${encodeURIComponent(jobId)}`)
        const data = (await resp.json()) as { ok: boolean; status?: string; markdown?: string; error?: string }
        if (!data.ok) throw new Error(data.error || 'poll failed')
        if (data.status === 'completed') {
          if (pollRef.current) window.clearInterval(pollRef.current)
          setMarkdown(data.markdown || '')
          setStatus('completed')
        } else if (data.status === 'error') {
          if (pollRef.current) window.clearInterval(pollRef.current)
          setError(data.error || 'Review failed.')
          setStatus('error')
        }
      } catch (e) {
        if (pollRef.current) window.clearInterval(pollRef.current)
        setError(e instanceof Error ? e.message : String(e))
        setStatus('error')
      }
    }, 2500)
  }

  const runReview = async () => {
    if (status === 'running') return
    const texSource = editorOpenDocCtx?.currentDocument?.getSnapshot() ?? ''
    if (!texSource.trim()) { setError('Open a document to review.'); setStatus('error'); return }
    setStatus('running')
    setError(null)
    setMarkdown('')
    try {
      const resp = await fetch(`${base}/api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texSource, provider: provider || undefined }),
      })
      const data = (await resp.json()) as { ok: boolean; jobId?: string; error?: string }
      if (!data.ok || !data.jobId) throw new Error(data.error || `HTTP ${resp.status}`)
      poll(data.jobId)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 16px', color: 'var(--content-primary-themed)' }}>
      <ProviderSelect value={provider} onChange={setProvider} disabled={status === 'running'} />
      <button
        type="button"
        onClick={() => void runReview()}
        disabled={status === 'running'}
        style={{ padding: '7px 12px', fontSize: '13px', fontWeight: 600, cursor: status === 'running' ? 'not-allowed' : 'pointer', backgroundColor: 'var(--blue-50)', color: '#fff', border: 'none', borderRadius: '4px', opacity: status === 'running' ? 0.6 : 1 }}
      >
        {status === 'running' ? 'Reviewing...' : 'Review current document'}
      </button>
      {error && <div style={{ fontSize: '12px', color: 'var(--red-50)' }}>{error}</div>}
      {markdown && (
        <pre style={{ ...box, whiteSpace: 'pre-wrap', maxHeight: '420px', overflowY: 'auto', margin: 0, lineHeight: 1.45 }}>{markdown}</pre>
      )}
    </div>
  )
}
