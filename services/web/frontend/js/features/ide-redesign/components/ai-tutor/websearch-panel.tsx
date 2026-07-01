import { useState } from 'react'
import getMeta from '@/utils/meta'
import { useApplyEdit } from './apply-edit'

interface SearchResult {
  title: string
  url: string
  snippet: string
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

const smallBtn = (bg: string) => ({
  padding: '4px 8px',
  fontSize: '12px',
  cursor: 'pointer',
  backgroundColor: bg,
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
})

// Web Search: query DuckDuckGo and optionally insert a \href link into the document.
export default function WebSearchPanel() {
  const base = getMeta('ol-sidecarUrl') ?? ''
  const apply = useApplyEdit()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = async () => {
    if (!query.trim() || loading) return
    setLoading(true)
    setError(null)
    setResults([])
    try {
      const resp = await fetch(`${base}/api/websearch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), maxResults: 6 }),
      })
      const data = (await resp.json()) as { ok: boolean; results?: SearchResult[]; error?: string }
      if (!data.ok) throw new Error(data.error || `HTTP ${resp.status}`)
      setResults(data.results || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '12px 16px',
        color: 'var(--content-primary-themed)',
      }}
    >
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') void search()
          }}
          disabled={loading}
          placeholder="Search the web..."
          style={{ ...box, flex: 1 }}
        />
        <button
          type="button"
          onClick={() => void search()}
          disabled={loading || !query.trim()}
          style={{
            padding: '7px 12px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
            backgroundColor: 'var(--blue-50)',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            opacity: loading || !query.trim() ? 0.6 : 1,
          }}
        >
          {loading ? '...' : 'Search'}
        </button>
      </div>

      {error && (
        <div style={{ fontSize: '12px', color: 'var(--red-50)' }}>{error}</div>
      )}

      {results.map((r, i) => (
        <div
          key={r.url + i}
          style={{ borderTop: '1px solid var(--border-divider-themed)', paddingTop: '8px' }}
        >
          <a
            href={r.url}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--blue-50)',
              textDecoration: 'none',
            }}
          >
            {r.title}
          </a>
          {r.snippet && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--content-secondary-themed)',
                marginTop: '3px',
              }}
            >
              {r.snippet}
            </div>
          )}
          {apply && (
            <div style={{ marginTop: '5px' }}>
              <button
                type="button"
                onClick={() => apply.insertAtCursor(`\\href{${r.url}}{${r.title}}`)}
                style={smallBtn('var(--green-50)')}
              >
                Insert link
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
