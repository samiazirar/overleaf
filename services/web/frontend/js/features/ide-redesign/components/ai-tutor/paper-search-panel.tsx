import { useState } from 'react'
import getMeta from '@/utils/meta'
import { useApplyEdit } from './apply-edit'

interface Paper {
  title: string
  abstract: string
  authors: string[]
  url: string
  arxivId: string
}

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
const smallBtn = (bg: string) => ({ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', backgroundColor: bg, color: '#fff', border: 'none', borderRadius: '4px' })

// Paper Search: query arXiv, then insert a \cite key or the full BibTeX entry
// into the document.
export default function PaperSearchPanel() {
  const base = getMeta('ol-sidecarUrl') ?? ''
  const apply = useApplyEdit()

  const [query, setQuery] = useState('')
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const search = async () => {
    if (!query.trim() || loading) return
    setLoading(true)
    setError(null)
    setPapers([])
    try {
      const resp = await fetch(`${base}/api/arxiv/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), maxResults: 6 }),
      })
      const data = (await resp.json()) as { ok: boolean; papers?: Paper[]; error?: string }
      if (!data.ok) throw new Error(data.error || `HTTP ${resp.status}`)
      setPapers(data.papers || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const insertBibtex = async (p: Paper) => {
    if (!apply) return
    setBusy(p.arxivId)
    try {
      const resp = await fetch(`${base}/api/arxiv/bibtex`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arxivId: p.arxivId }),
      })
      const data = (await resp.json()) as { ok: boolean; bibtex?: string; error?: string }
      if (!data.ok || !data.bibtex) throw new Error(data.error || 'No BibTeX')
      apply.insertAtCursor(`${data.bibtex}\n`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 16px', color: 'var(--content-primary-themed)' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void search() }}
          disabled={loading}
          placeholder="Search arXiv..."
          style={{ ...box, flex: 1 }}
        />
        <button type="button" onClick={() => void search()} disabled={loading || !query.trim()} style={{ padding: '7px 12px', fontSize: '13px', fontWeight: 600, cursor: loading || !query.trim() ? 'not-allowed' : 'pointer', backgroundColor: 'var(--blue-50)', color: '#fff', border: 'none', borderRadius: '4px', opacity: loading || !query.trim() ? 0.6 : 1 }}>
          {loading ? '...' : 'Search'}
        </button>
      </div>
      {error && <div style={{ fontSize: '12px', color: 'var(--red-50)' }}>{error}</div>}
      {papers.map(p => (
        <div key={p.arxivId || p.url} style={{ borderTop: '1px solid var(--border-divider-themed)', paddingTop: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600 }}>{p.title}</div>
          <div style={{ fontSize: '11px', color: 'var(--content-secondary-themed)', margin: '2px 0' }}>
            {p.authors.slice(0, 4).join(', ')}{p.authors.length > 4 ? ' et al.' : ''} · {p.arxivId}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--content-secondary-themed)', maxHeight: '54px', overflow: 'hidden' }}>{p.abstract}</div>
          {apply && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '5px' }}>
              <button type="button" onClick={() => apply.insertAtCursor(`\\cite{${p.arxivId}}`)} style={smallBtn('var(--blue-50)')}>Insert \cite</button>
              <button type="button" disabled={busy === p.arxivId} onClick={() => void insertBibtex(p)} style={smallBtn('var(--green-50)')}>{busy === p.arxivId ? '...' : 'Insert BibTeX'}</button>
              <a href={p.url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', alignSelf: 'center', color: 'var(--blue-50)' }}>open</a>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
