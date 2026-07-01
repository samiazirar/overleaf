import { expect } from 'chai'
import { renderHook, waitFor, cleanup } from '@testing-library/react'
import fetchMock from 'fetch-mock'
import { useSidecarProviders } from '../../../../frontend/js/features/ide-redesign/components/ai-tutor/use-sidecar-providers'

describe('useSidecarProviders', function () {
  beforeEach(function () {
    fetchMock.removeRoutes().clearHistory()
    window.metaAttributesCache.set('ol-sidecarUrl', 'http://sidecar.test')
  })

  afterEach(function () {
    fetchMock.removeRoutes().clearHistory()
    window.metaAttributesCache.delete('ol-sidecarUrl')
    cleanup()
  })

  it('fetches providers from the sidecar URL and maps them to SidecarProvider shape', async function () {
    fetchMock.get('http://sidecar.test/api/llm/providers', {
      ok: true,
      providers: [
        { id: 'openai', label: 'OpenAI', model: 'gpt-4o' },
        { id: 'anthropic', label: 'Anthropic', model: 'claude-3-5-sonnet' },
      ],
    })

    const { result } = renderHook(() => useSidecarProviders())

    await waitFor(() => expect(result.current.loading).to.be.false)
    expect(result.current.error).to.be.null
    expect(result.current.providers).to.have.length(2)
    expect(result.current.providers[0]).to.deep.equal({
      id: 'openai',
      label: 'OpenAI',
      models: ['gpt-4o'],
    })
    expect(result.current.providers[1]).to.deep.equal({
      id: 'anthropic',
      label: 'Anthropic',
      models: ['claude-3-5-sonnet'],
    })
  })

  it('sets error when the fetch fails', async function () {
    fetchMock.get('http://sidecar.test/api/llm/providers', { status: 500 })

    const { result } = renderHook(() => useSidecarProviders())

    await waitFor(() => expect(result.current.loading).to.be.false)
    expect(result.current.error).to.include('HTTP 500')
    expect(result.current.providers).to.have.length(0)
  })

  it('uses empty string base when ol-sidecarUrl is not set', async function () {
    window.metaAttributesCache.delete('ol-sidecarUrl')
    fetchMock.get('/api/llm/providers', { ok: true, providers: [] })

    const { result } = renderHook(() => useSidecarProviders())

    await waitFor(() => expect(result.current.loading).to.be.false)
    expect(result.current.error).to.be.null
    expect(result.current.providers).to.have.length(0)
  })
})
