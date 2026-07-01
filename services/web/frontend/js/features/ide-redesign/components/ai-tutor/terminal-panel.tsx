import { useEffect, useRef, useState } from 'react'
import getMeta from '@/utils/meta'

interface Entry {
  command: string
  stdout: string
  stderr: string
  code: number
  error?: string
}

const mono = {
  fontFamily: 'var(--font-family-monospace, monospace)',
  fontSize: '12px',
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-word' as const,
  margin: 0,
}

// Terminal: runs shell commands in the project's server-side working directory
// via the sidecar and shows the output. Request/response runner (not a live PTY).
export default function TerminalPanel() {
  const base = getMeta('ol-sidecarUrl') ?? ''
  const projectId = getMeta('ol-project_id') ?? ''

  const [command, setCommand] = useState('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [running, setRunning] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [entries, running])

  const run = async () => {
    const cmd = command.trim()
    if (!cmd || running) return
    setCommand('')
    setRunning(true)
    try {
      const resp = await fetch(`${base}/api/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, command: cmd }),
      })
      const data = (await resp.json()) as {
        ok: boolean
        stdout?: string
        stderr?: string
        code?: number
        error?: string
      }
      if (!data.ok) {
        setEntries(prev => [...prev, { command: cmd, stdout: '', stderr: '', code: 1, error: data.error || `HTTP ${resp.status}` }])
      } else {
        setEntries(prev => [...prev, { command: cmd, stdout: data.stdout || '', stderr: data.stderr || '', code: data.code ?? 0 }])
      }
    } catch (e) {
      setEntries(prev => [...prev, { command: cmd, stdout: '', stderr: '', code: 1, error: e instanceof Error ? e.message : String(e) }])
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px 16px', gap: '8px', color: 'var(--content-primary-themed)', boxSizing: 'border-box' }}>
      <div style={{ fontSize: '11px', color: 'var(--content-secondary-themed)' }}>
        Runs in the project sandbox directory on the server.
      </div>
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', minHeight: '80px', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-divider-themed)', backgroundColor: 'var(--bg-primary-themed)' }}
      >
        {entries.length === 0 && <div style={{ ...mono, color: 'var(--content-secondary-themed)' }}>No output yet. Type a command below.</div>}
        {entries.map((e, i) => (
          <div key={i} style={{ marginBottom: '8px' }}>
            <pre style={{ ...mono, color: 'var(--blue-50)' }}>$ {e.command}</pre>
            {e.stdout && <pre style={mono}>{e.stdout}</pre>}
            {e.stderr && <pre style={{ ...mono, color: 'var(--red-50)' }}>{e.stderr}</pre>}
            {e.error && <pre style={{ ...mono, color: 'var(--red-50)' }}>error: {e.error}</pre>}
            {!e.error && e.code !== 0 && <pre style={{ ...mono, color: 'var(--content-secondary-themed)' }}>[exit {e.code}]</pre>}
          </div>
        ))}
        {running && <pre style={{ ...mono, color: 'var(--content-secondary-themed)' }}>running...</pre>}
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          value={command}
          onChange={e => setCommand(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void run() }}
          disabled={running}
          placeholder="command (Enter to run)"
          style={{ flex: 1, fontFamily: 'var(--font-family-monospace, monospace)', fontSize: '12px', padding: '7px 8px', borderRadius: '4px', border: '1px solid var(--border-divider-themed)', backgroundColor: 'var(--bg-primary-themed)', color: 'var(--content-primary-themed)', boxSizing: 'border-box' }}
        />
        <button
          type="button"
          onClick={() => void run()}
          disabled={running || !command.trim()}
          style={{ padding: '7px 12px', fontSize: '13px', fontWeight: 600, cursor: running || !command.trim() ? 'not-allowed' : 'pointer', backgroundColor: 'var(--blue-50)', color: '#fff', border: 'none', borderRadius: '4px', opacity: running || !command.trim() ? 0.6 : 1 }}
        >
          Run
        </button>
      </div>
    </div>
  )
}
