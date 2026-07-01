import { useState, useEffect } from 'react'
import getMeta from '@/utils/meta'

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

const smallBtn = (bg: string, disabled = false) => ({
  padding: '4px 10px',
  fontSize: '12px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  backgroundColor: bg,
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  opacity: disabled ? 0.55 : 1,
})

type Quest = Record<string, unknown>
type HistoryEntry = Record<string, unknown>

function questLabel(q: Quest): string {
  if (typeof q.title === 'string' && q.title) return q.title
  if (typeof q.name === 'string' && q.name) return q.name
  return JSON.stringify(q)
}

function questId(q: Quest): string {
  return String(q.id ?? q._id ?? q.quest_id ?? '')
}

function historyText(h: HistoryEntry): string {
  if (typeof h.message === 'string') return h.message
  if (typeof h.content === 'string') return h.content
  if (typeof h.text === 'string') return h.text
  return JSON.stringify(h)
}

function historyRole(h: HistoryEntry): string {
  if (typeof h.role === 'string') return h.role
  if (typeof h.sender === 'string') return h.sender
  return ''
}

export default function ResearchPanel() {
  const base = getMeta('ol-sidecarUrl') ?? ''

  const [configured, setConfigured] = useState<boolean | null>(null)
  const [health, setHealth] = useState<unknown>(null)
  const [healthErr, setHealthErr] = useState<string | null>(null)

  const [quests, setQuests] = useState<Quest[]>([])
  const [questsLoading, setQuestsLoading] = useState(false)
  const [questsErr, setQuestsErr] = useState<string | null>(null)

  const [newTitle, setNewTitle] = useState('')
  const [newGoal, setNewGoal] = useState('')
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)

  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyErr, setHistoryErr] = useState<string | null>(null)

  const [chatMsg, setChatMsg] = useState('')
  const [chatting, setChatting] = useState(false)
  const [chatErr, setChatErr] = useState<string | null>(null)

  // On mount: check health / configured state
  useEffect(() => {
    void (async () => {
      try {
        const resp = await fetch(`${base}/api/research/health`)
        const data = (await resp.json()) as { ok: boolean; health?: unknown; error?: string }
        if (!data.ok && typeof data.error === 'string' && data.error.includes('not configured')) {
          setConfigured(false)
          return
        }
        setConfigured(true)
        if (data.ok) {
          setHealth(data.health)
        } else {
          setHealthErr(data.error ?? 'Health check failed')
        }
      } catch (e) {
        setConfigured(true) // reachable but errored — still show UI
        setHealthErr(e instanceof Error ? e.message : String(e))
      }
    })()
  }, [base])

  // Load quests once confirmed configured
  useEffect(() => {
    if (!configured) return
    void loadQuests()
  }, [configured]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadQuests() {
    setQuestsLoading(true)
    setQuestsErr(null)
    try {
      const resp = await fetch(`${base}/api/research/quests`)
      const data = (await resp.json()) as { ok: boolean; quests?: unknown; error?: string }
      if (!data.ok) throw new Error(data.error || 'Failed to load quests')
      const raw = data.quests
      setQuests(Array.isArray(raw) ? (raw as Quest[]) : raw && typeof raw === 'object' ? [raw as Quest] : [])
    } catch (e) {
      setQuestsErr(e instanceof Error ? e.message : String(e))
    } finally {
      setQuestsLoading(false)
    }
  }

  async function createQuest() {
    if (!newTitle.trim() || creating) return
    setCreating(true)
    setCreateErr(null)
    try {
      const resp = await fetch(`${base}/api/research/quests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), goal: newGoal.trim() }),
      })
      const data = (await resp.json()) as { ok: boolean; quest?: Quest; error?: string }
      if (!data.ok) throw new Error(data.error || 'Failed to create quest')
      setNewTitle('')
      setNewGoal('')
      await loadQuests()
    } catch (e) {
      setCreateErr(e instanceof Error ? e.message : String(e))
    } finally {
      setCreating(false)
    }
  }

  async function selectQuest(q: Quest) {
    setSelectedQuest(q)
    setHistory([])
    setHistoryErr(null)
    setChatErr(null)
    setChatMsg('')
    const id = questId(q)
    if (!id) {
      setHistoryErr('Quest has no id — cannot load history.')
      return
    }
    setHistoryLoading(true)
    try {
      const resp = await fetch(`${base}/api/research/quests/${id}/history`)
      const data = (await resp.json()) as { ok: boolean; history?: unknown; error?: string }
      if (!data.ok) throw new Error(data.error || 'Failed to load history')
      const raw = data.history
      setHistory(Array.isArray(raw) ? (raw as HistoryEntry[]) : raw && typeof raw === 'object' ? [raw as HistoryEntry] : [])
    } catch (e) {
      setHistoryErr(e instanceof Error ? e.message : String(e))
    } finally {
      setHistoryLoading(false)
    }
  }

  async function sendChat() {
    if (!chatMsg.trim() || chatting || !selectedQuest) return
    const id = questId(selectedQuest)
    if (!id) { setChatErr('Quest has no id.'); return }
    setChatting(true)
    setChatErr(null)
    const sent = chatMsg.trim()
    setChatMsg('')
    try {
      const resp = await fetch(`${base}/api/research/quests/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: sent }),
      })
      const data = (await resp.json()) as { ok: boolean; error?: string; [k: string]: unknown }
      if (!data.ok) throw new Error(data.error || 'Chat failed')
      // Reload history to show latest exchange
      await selectQuest(selectedQuest)
    } catch (e) {
      setChatErr(e instanceof Error ? e.message : String(e))
    } finally {
      setChatting(false)
    }
  }

  // --- render states ---

  if (configured === null) {
    return (
      <div style={{ padding: '16px', color: 'var(--content-secondary-themed)', fontSize: '13px' }}>
        Connecting to DeepScientist...
      </div>
    )
  }

  if (configured === false) {
    return (
      <div style={{ padding: '16px', fontSize: '13px', color: 'var(--content-secondary-themed)', lineHeight: 1.5 }}>
        DeepScientist not configured. Set{' '}
        <code style={{ fontSize: '12px', backgroundColor: 'var(--bg-secondary-themed)', padding: '1px 4px', borderRadius: '3px' }}>
          OPENPRISM_DEEPSCIENTIST_URL
        </code>{' '}
        on the sidecar.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 16px', color: 'var(--content-primary-themed)' }}>
      {/* Health indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--content-secondary-themed)' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: healthErr ? 'var(--red-50)' : 'var(--green-50)', display: 'inline-block' }} />
        {healthErr ? `Service error: ${healthErr}` : 'DeepScientist connected'}
      </div>

      {/* Quests list */}
      <div style={{ borderTop: '1px solid var(--border-divider-themed)', paddingTop: '8px' }}>
        <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '6px', color: 'var(--content-secondary-themed)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Quests
        </div>
        {questsLoading && <div style={{ fontSize: '12px', color: 'var(--content-secondary-themed)' }}>Loading...</div>}
        {questsErr && <div style={{ fontSize: '12px', color: 'var(--red-50)' }}>{questsErr}</div>}
        {!questsLoading && quests.length === 0 && !questsErr && (
          <div style={{ fontSize: '12px', color: 'var(--content-secondary-themed)' }}>No quests yet.</div>
        )}
        {quests.map((q, i) => {
          const id = questId(q)
          const isSelected = selectedQuest && questId(selectedQuest) === id
          return (
            <div
              key={id || i}
              onClick={() => void selectQuest(q)}
              style={{
                fontSize: '13px',
                padding: '5px 7px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '2px',
                backgroundColor: isSelected ? 'var(--bg-secondary-themed)' : 'transparent',
                fontWeight: isSelected ? 600 : 400,
              }}
            >
              {questLabel(q)}
            </div>
          )
        })}
      </div>

      {/* Create quest form */}
      <div style={{ borderTop: '1px solid var(--border-divider-themed)', paddingTop: '8px' }}>
        <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '6px', color: 'var(--content-secondary-themed)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          New Quest
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void createQuest() }}
            disabled={creating}
            placeholder="Title..."
            style={box}
          />
          <input
            value={newGoal}
            onChange={e => setNewGoal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void createQuest() }}
            disabled={creating}
            placeholder="Goal (optional)..."
            style={box}
          />
          <button
            type="button"
            onClick={() => void createQuest()}
            disabled={creating || !newTitle.trim()}
            style={smallBtn('var(--blue-50)', creating || !newTitle.trim())}
          >
            {creating ? '...' : 'Create'}
          </button>
          {createErr && <div style={{ fontSize: '12px', color: 'var(--red-50)' }}>{createErr}</div>}
        </div>
      </div>

      {/* Selected quest: history + chat */}
      {selectedQuest && (
        <div style={{ borderTop: '1px solid var(--border-divider-themed)', paddingTop: '8px' }}>
          <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '6px', color: 'var(--content-secondary-themed)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {questLabel(selectedQuest)}
          </div>
          {historyLoading && <div style={{ fontSize: '12px', color: 'var(--content-secondary-themed)' }}>Loading history...</div>}
          {historyErr && <div style={{ fontSize: '12px', color: 'var(--red-50)' }}>{historyErr}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto', marginBottom: '8px' }}>
            {history.map((h, i) => {
              const role = historyRole(h)
              const isUser = role === 'user' || role === 'human'
              return (
                <div
                  key={i}
                  style={{
                    fontSize: '12px',
                    padding: '5px 7px',
                    borderRadius: '4px',
                    backgroundColor: isUser ? 'var(--bg-secondary-themed)' : 'transparent',
                    color: 'var(--content-primary-themed)',
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '90%',
                    border: '1px solid var(--border-divider-themed)',
                  }}
                >
                  {role && <span style={{ fontSize: '10px', color: 'var(--content-secondary-themed)', marginRight: '4px' }}>{role}:</span>}
                  {historyText(h)}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              value={chatMsg}
              onChange={e => setChatMsg(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void sendChat() }}
              disabled={chatting}
              placeholder="Message..."
              style={{ ...box, flex: 1 }}
            />
            <button
              type="button"
              onClick={() => void sendChat()}
              disabled={chatting || !chatMsg.trim()}
              style={smallBtn('var(--blue-50)', chatting || !chatMsg.trim())}
            >
              {chatting ? '...' : 'Send'}
            </button>
          </div>
          {chatErr && <div style={{ fontSize: '12px', color: 'var(--red-50)', marginTop: '4px' }}>{chatErr}</div>}
        </div>
      )}
    </div>
  )
}
