import { useState, useEffect, useCallback } from 'react'
import getMeta from '@/utils/meta'

interface GitFile {
  status: string
  path: string
}

interface GitCommit {
  hash: string
  subject: string
}

interface StatusData {
  initialized: boolean
  branch: string | null
  files: GitFile[]
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

const btn = (bg: string, disabled = false) => ({
  padding: '6px 12px',
  fontSize: '12px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  backgroundColor: bg,
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  opacity: disabled ? 0.6 : 1,
})

export default function GitPanel() {
  const base = getMeta('ol-sidecarUrl') ?? ''
  const projectId = getMeta('ol-project_id') ?? ''

  const [status, setStatus] = useState<StatusData | null>(null)
  const [commits, setCommits] = useState<GitCommit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [commitMsg, setCommitMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const post = useCallback(
    async (path: string, body: Record<string, string>) => {
      const resp = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ...body }),
      })
      return resp.json() as Promise<{ ok: boolean; error?: string } & Record<string, unknown>>
    },
    [base, projectId]
  )

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statusData, logData] = await Promise.all([
        post('/api/git/status', {}),
        post('/api/git/log', {}),
      ])
      if (!statusData.ok) throw new Error(statusData.error || 'Status failed')
      setStatus({
        initialized: Boolean(statusData.initialized),
        branch: (statusData.branch as string | null) ?? null,
        files: (statusData.files as GitFile[]) || [],
      })
      if (logData.ok) {
        setCommits((logData.commits as GitCommit[]) || [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [post])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const initRepo = async () => {
    setBusy(true)
    setError(null)
    try {
      const data = await post('/api/git/init', {})
      if (!data.ok) throw new Error(data.error || 'Init failed')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const commitAll = async () => {
    if (!commitMsg.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const data = await post('/api/git/commit', { message: commitMsg.trim() })
      if (!data.ok) throw new Error(data.error || 'Commit failed')
      setCommitMsg('')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 16px', color: 'var(--content-primary-themed)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600, fontSize: '13px' }}>Git</span>
        <button type="button" onClick={() => void refresh()} disabled={loading} style={btn('var(--blue-50)', loading)}>
          {loading ? '...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ fontSize: '12px', color: 'var(--red-50)', wordBreak: 'break-word' }}>{error}</div>
      )}

      {loading && !status && (
        <div style={{ fontSize: '12px', color: 'var(--content-secondary-themed)' }}>Loading...</div>
      )}

      {status && !status.initialized && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--content-secondary-themed)' }}>
            No git repository found in this project's working directory.
          </div>
          <button type="button" onClick={() => void initRepo()} disabled={busy} style={btn('var(--green-50)', busy)}>
            {busy ? 'Initializing...' : 'Initialize repository'}
          </button>
        </div>
      )}

      {status && status.initialized && (
        <>
          <div style={{ fontSize: '12px', color: 'var(--content-secondary-themed)' }}>
            Branch: <span style={{ color: 'var(--content-primary-themed)', fontWeight: 600 }}>{status.branch || '(detached)'}</span>
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Changed files ({status.files.length})
            </div>
            {status.files.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--content-secondary-themed)' }}>No changes</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '140px', overflowY: 'auto' }}>
                {status.files.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '6px', fontSize: '12px', fontFamily: 'monospace' }}>
                    <span style={{ color: 'var(--green-50)', minWidth: '20px' }}>{f.status}</span>
                    <span style={{ color: 'var(--content-secondary-themed)', wordBreak: 'break-all' }}>{f.path}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <input
              value={commitMsg}
              onChange={e => setCommitMsg(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) void commitAll() }}
              placeholder="Commit message..."
              disabled={busy}
              style={box}
            />
            <button
              type="button"
              onClick={() => void commitAll()}
              disabled={busy || !commitMsg.trim()}
              style={btn('var(--blue-50)', busy || !commitMsg.trim())}
            >
              {busy ? 'Committing...' : 'Stage all & commit'}
            </button>
          </div>

          {commits.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Recent commits</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '160px', overflowY: 'auto' }}>
                {commits.map(c => (
                  <div key={c.hash} style={{ fontSize: '12px', fontFamily: 'monospace', display: 'flex', gap: '6px' }}>
                    <span style={{ color: 'var(--content-secondary-themed)', minWidth: '56px' }}>{c.hash}</span>
                    <span style={{ color: 'var(--content-primary-themed)', wordBreak: 'break-word' }}>{c.subject}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
