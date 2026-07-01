import { useEffect, useState } from 'react'
import getMeta from '@/utils/meta'

// One coding-agent backend as reported by GET /api/agent2/backends.
interface BackendInfo {
  id: string
  label: string
  available: { ok: boolean; reason?: string }
}

// Lets the AI Chat tab pick which coding agent drives the turn: opencode (GLM,
// the default), codex, or Claude Code. Backends that are not usable on the
// server right now are still listed but annotated with the reason (e.g. "run
// codex login"), so the user knows exactly how to enable them.
export default function BackendSelect({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (id: string) => void
  disabled?: boolean
}) {
  const base = getMeta('ol-sidecarUrl') ?? ''
  const [backends, setBackends] = useState<BackendInfo[]>([])

  useEffect(() => {
    let cancelled = false
    fetch(`${base}/api/agent2/backends`)
      .then(r => r.json())
      .then(d => {
        if (!cancelled && d?.ok && Array.isArray(d.backends)) {
          setBackends(d.backends as BackendInfo[])
        }
      })
      .catch(() => {
        /* selector falls back to the default option below */
      })
    return () => {
      cancelled = true
    }
  }, [base])

  const current = backends.find(b => b.id === value)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '11px', color: 'var(--content-secondary-themed)' }}>
          Agent
        </span>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          style={{
            flex: 1,
            fontSize: '12px',
            padding: '4px 6px',
            borderRadius: '4px',
            border: '1px solid var(--border-divider-themed)',
            backgroundColor: 'var(--bg-primary-themed)',
            color: 'var(--content-primary-themed)',
          }}
        >
          {backends.length === 0 && <option value="opencode">OpenCode (GLM)</option>}
          {backends.map(b => (
            <option key={b.id} value={b.id}>
              {b.label}
              {b.available.ok ? '' : ' — unavailable'}
            </option>
          ))}
        </select>
      </div>
      {current && !current.available.ok && current.available.reason && (
        <div style={{ fontSize: '11px', color: 'var(--red-50)' }}>
          {current.available.reason}
        </div>
      )}
    </div>
  )
}
