import { expect } from 'chai'
import { render, screen, cleanup } from '@testing-library/react'
import fetchMock from 'fetch-mock'
import sinon from 'sinon'
import ProviderModelSelector from '../../../../frontend/js/features/ide-redesign/components/ai-tutor/provider-model-selector'

describe('<ProviderModelSelector />', function () {
  beforeEach(function () {
    fetchMock.removeRoutes().clearHistory()
    window.metaAttributesCache.set('ol-sidecarUrl', 'http://sidecar.test')
  })

  afterEach(function () {
    fetchMock.removeRoutes().clearHistory()
    window.metaAttributesCache.delete('ol-sidecarUrl')
    cleanup()
  })

  it('shows a loading indicator while providers are being fetched', function () {
    // Never resolve the fetch so loading state persists
    fetchMock.get('http://sidecar.test/api/llm/providers', new Promise(() => {}))

    render(
      <ProviderModelSelector
        providerId=""
        modelId=""
        onChange={sinon.stub()}
      />
    )

    expect(screen.getByText(/loading providers/i)).to.exist
  })

  it('shows an error message when the fetch fails', async function () {
    fetchMock.get('http://sidecar.test/api/llm/providers', { status: 503 })

    render(
      <ProviderModelSelector
        providerId=""
        modelId=""
        onChange={sinon.stub()}
      />
    )

    await screen.findByText(/failed to load providers/i)
  })

  it('renders provider options once loaded', async function () {
    fetchMock.get('http://sidecar.test/api/llm/providers', {
      ok: true,
      providers: [
        { id: 'openai', label: 'OpenAI', model: 'gpt-4o' },
        { id: 'anthropic', label: 'Anthropic', model: 'claude-3-5-sonnet' },
      ],
    })

    render(
      <ProviderModelSelector
        providerId="openai"
        modelId="gpt-4o"
        onChange={sinon.stub()}
      />
    )

    const providerSelect = (await screen.findByRole('combobox', { name: /provider/i })) as HTMLSelectElement
    const options = Array.from(providerSelect.options).map(o => o.value)
    expect(options).to.include('openai')
    expect(options).to.include('anthropic')
  })
})
