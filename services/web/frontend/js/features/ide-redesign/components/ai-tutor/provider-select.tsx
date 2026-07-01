import { useEffect } from 'react'
import { useSidecarProviders } from './use-sidecar-providers'

interface ProviderSelectProps {
  value: string
  onChange: (id: string) => void
  disabled?: boolean
  // Optional preference used to pick a default when none is selected yet
  // (e.g. prefer a vision-capable provider for the Vision tab).
  prefer?: (id: string, label: string) => boolean
}

const hint = { fontSize: '12px', color: 'var(--content-secondary-themed)' } as const

// Lightweight provider dropdown keyed by provider id. The backend maps the id to
// the real endpoint/key/model (resolveProviderById), so no keys touch the browser.
export default function ProviderSelect({ value, onChange, disabled, prefer }: ProviderSelectProps) {
  const { providers, loading, error } = useSidecarProviders()

  useEffect(() => {
    if (!value && providers.length) {
      const preferred = prefer ? providers.find(p => prefer(p.id, p.label)) : undefined
      onChange((preferred ?? providers[0]).id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providers, value])

  if (loading) return <div style={hint}>Loading providers...</div>
  if (error) return <div style={{ ...hint, color: 'var(--red-50)' }}>Providers error: {error}</div>
  if (!providers.length) return <div style={hint}>No providers configured.</div>

  return (
    <select
      aria-label="Provider"
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      style={{ fontSize: '13px' }}
    >
      {providers.map(p => (
        <option key={p.id} value={p.id}>
          {p.label}
        </option>
      ))}
    </select>
  )
}
