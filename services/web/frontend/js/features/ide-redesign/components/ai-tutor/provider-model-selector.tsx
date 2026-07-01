import { useSidecarProviders } from './use-sidecar-providers'

interface ProviderModelSelectorProps {
  providerId: string
  modelId: string
  onChange: (providerId: string, modelId: string) => void
  disabled?: boolean
}

export default function ProviderModelSelector({
  providerId,
  modelId,
  onChange,
  disabled = false,
}: ProviderModelSelectorProps) {
  const { providers, loading, error } = useSidecarProviders()

  if (loading) {
    return (
      <div style={{ fontSize: '12px', color: 'var(--content-secondary-themed)' }}>
        Loading providers...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ fontSize: '12px', color: 'var(--red-50)' }}>
        Failed to load providers: {error}
      </div>
    )
  }

  const selectedProvider = providers.find(p => p.id === providerId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <select
        aria-label="Provider"
        value={providerId}
        disabled={disabled}
        onChange={e => {
          const next = providers.find(p => p.id === e.target.value)
          onChange(e.target.value, next?.models[0] ?? '')
        }}
        style={{ fontSize: '13px' }}
      >
        {providers.map(p => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      {selectedProvider && selectedProvider.models.length > 0 && (
        <select
          aria-label="Model"
          value={modelId}
          disabled={disabled}
          onChange={e => onChange(providerId, e.target.value)}
          style={{ fontSize: '13px' }}
        >
          {selectedProvider.models.map(m => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
