import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import getMeta from '@/utils/meta'
import { EditorOpenDocContext } from '@/features/ide-react/context/editor-open-doc-context'
import { EditorSelectionContext } from '@/shared/context/editor-selection-context'
import ProviderModelSelector from './provider-model-selector'
import BackendSelect from './backend-select'
import StreamEventList from './stream-event-list'
import { useAgentStream } from './use-agent-stream'
import { extractDocContext } from './doc-context-extraction'
import { useApplyEdit, EditRange } from './apply-edit'

// Parse a @@edit JSON block from a message text if present.
// The sidecar agent can emit a message containing a block like:
//   @@edit {"from":10,"to":20,"insert":"replacement text"}
// This is purely optional: if absent the panel renders normally.
function parseEditBlock(text: string): EditRange | null {
  const match = text.match(/@@edit\s+(\{[^}]+\})/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[1]) as unknown
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Record<string, unknown>).from === 'number' &&
      typeof (parsed as Record<string, unknown>).to === 'number' &&
      typeof (parsed as Record<string, unknown>).insert === 'string'
    ) {
      const p = parsed as Record<string, unknown>
      return {
        from: p.from as number,
        to: p.to as number,
        insert: p.insert as string,
      }
    }
  } catch {
    // malformed JSON: ignore
  }
  return null
}

export default function AiChatPanel() {
  const projectId = getMeta('ol-project_id') ?? 'unknown'
  const [backend, setBackend] = useState('opencode')
  const stream = useAgentStream(projectId, backend)

  const [prompt, setPrompt] = useState('')
  const [providerId, setProviderId] = useState('')
  const [modelId, setModelId] = useState('')
  // appliedEdits tracks which stream event indices have already been applied
  // so the Apply button becomes disabled after first use.
  const [appliedEdits, setAppliedEdits] = useState<Set<number>>(new Set())

  // useApplyEdit reads EditorViewContext (the cross-tree bridge available
  // anywhere inside EditorViewProvider). It returns null when the editor
  // is not yet mounted, in which case the Apply button is hidden.
  const applyHook = useApplyEdit()

  // Read editor context via useContext so they return undefined outside a
  // provider rather than throwing. This makes the panel safe to render in
  // tests and standalone pages where the provider tree is absent.
  const editorOpenDocCtx = useContext(EditorOpenDocContext)
  const editorSelectionCtx = useContext(EditorSelectionContext)

  const currentDocument = editorOpenDocCtx?.currentDocument ?? null
  const editorSelection = editorSelectionCtx?.editorSelection

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(async () => {
    const text = prompt.trim()
    if (!text || stream.running) return

    const { selectionText } = extractDocContext(currentDocument, editorSelection)

    const payload = {
      sessionId: stream.sessionId ?? '',
      text,
      selection: selectionText || undefined,
      model:
        providerId && modelId
          ? { providerID: providerId, modelID: modelId }
          : undefined,
    }

    setPrompt('')
    try {
      await stream.send(payload)
    } catch (err) {
      console.error('[AiChatPanel] send error:', err)
    }
  }, [prompt, stream, currentDocument, editorSelection, providerId, modelId])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        void handleSend()
      }
    },
    [handleSend]
  )

  // Re-focus textarea after send finishes
  useEffect(() => {
    if (!stream.running && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [stream.running])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '12px 16px',
        gap: '10px',
        color: 'var(--content-primary-themed)',
        boxSizing: 'border-box',
      }}
    >
      {/* Coding-agent backend selector (opencode / codex / claude) */}
      <BackendSelect
        value={backend}
        onChange={setBackend}
        disabled={stream.running}
      />

      {/* Provider + model selector */}
      <ProviderModelSelector
        providerId={providerId}
        modelId={modelId}
        onChange={(pid, mid) => {
          setProviderId(pid)
          setModelId(mid)
        }}
        disabled={stream.running}
      />

      {/* Stream event output */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: '60px',
        }}
      >
        <StreamEventList events={stream.events} running={stream.running} />
        {/* Apply buttons: rendered for each message event that carries an @@edit block */}
        {stream.events.map((event, idx) => {
          if (event.kind !== 'message' || !event.text) return null
          const editRange = parseEditBlock(event.text)
          if (!editRange || !applyHook) return null
          const alreadyApplied = appliedEdits.has(idx)
          return (
            <div key={`apply-${idx}`} style={{ margin: '4px 0' }}>
              <button
                type="button"
                disabled={alreadyApplied}
                onClick={() => {
                  applyHook.applyEdit(editRange)
                  setAppliedEdits(prev => new Set([...prev, idx]))
                }}
                style={{
                  padding: '5px 10px',
                  fontSize: '12px',
                  cursor: alreadyApplied ? 'not-allowed' : 'pointer',
                  backgroundColor: alreadyApplied
                    ? 'var(--bg-secondary-themed)'
                    : 'var(--green-50)',
                  color: alreadyApplied
                    ? 'var(--content-secondary-themed)'
                    : '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  opacity: alreadyApplied ? 0.6 : 1,
                }}
              >
                {alreadyApplied ? 'Applied' : 'Apply edit'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Prompt input area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={stream.running}
          placeholder="Ask a question... (Ctrl+Enter to send)"
          rows={4}
          style={{
            width: '100%',
            resize: 'vertical',
            fontSize: '13px',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid var(--border-divider-themed)',
            backgroundColor: 'var(--bg-primary-themed)',
            color: 'var(--content-primary-themed)',
            boxSizing: 'border-box',
          }}
        />

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={stream.running || !prompt.trim()}
            style={{
              flex: 1,
              padding: '7px 12px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: stream.running || !prompt.trim() ? 'not-allowed' : 'pointer',
              backgroundColor: 'var(--blue-50)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              opacity: stream.running || !prompt.trim() ? 0.6 : 1,
            }}
          >
            Send
          </button>

          {stream.running && (
            <button
              type="button"
              onClick={stream.abort}
              style={{
                padding: '7px 12px',
                fontSize: '13px',
                cursor: 'pointer',
                backgroundColor: 'var(--red-50)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
              }}
            >
              Stop
            </button>
          )}

          {stream.events.length > 0 && !stream.running && (
            <button
              type="button"
              onClick={stream.clearStream}
              style={{
                padding: '7px 12px',
                fontSize: '13px',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                color: 'var(--content-secondary-themed)',
                border: '1px solid var(--border-divider-themed)',
                borderRadius: '4px',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
