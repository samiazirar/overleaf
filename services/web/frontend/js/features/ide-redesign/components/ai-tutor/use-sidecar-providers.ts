import { useEffect, useState } from 'react'
import getMeta from '@/utils/meta'

export interface SidecarProvider {
  id: string
  label: string
  models: string[]
}

export function useSidecarProviders() {
  const [providers, setProviders] = useState<SidecarProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const base = getMeta('ol-sidecarUrl') ?? ''
    fetch(`${base}/api/llm/providers`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: { ok: boolean; providers: { id: string; label: string; model: string }[] }) => {
        if (cancelled) return
        setProviders(
          (data.providers ?? []).map(p => ({
            id: p.id,
            label: p.label || p.id,
            models: p.model ? [p.model] : [],
          }))
        )
      })
      .catch((e: Error) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { providers, loading, error }
}
