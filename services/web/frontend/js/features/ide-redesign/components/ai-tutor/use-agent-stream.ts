import { useCallback, useEffect, useRef, useState } from 'react'
import getMeta from '@/utils/meta'

// This interface is the RUNTIME parsing shape (see parseAgent2Event below).
// agent2-event-schema.ts holds a Zod version of the same contract used only for
// type derivation, and it diverges slightly (its `message` variant requires
// `text` where this one makes it optional). Keep the two in sync when the
// sidecar's normalized event kinds change.
export interface Agent2Event {
  kind: 'reasoning' | 'message' | 'tool' | 'status' | 'done' | 'error'
  id?: string
  text?: string
  role?: string
  name?: string
  phase?: 'start' | 'running' | 'done' | 'error'
  summary?: string
  state?: string
  message?: string
}

export interface SendPayload {
  sessionId: string
  text: string
  selection?: string
  model?: { providerID: string; modelID: string }
}

function parseAgent2Event(raw: string): Agent2Event | null {
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    if (typeof parsed.kind !== 'string') return null
    return parsed as Agent2Event
  } catch {
    return null
  }
}

export interface UseAgentStreamResult {
  events: Agent2Event[]
  running: boolean
  sessionId: string | null
  send: (payload: SendPayload) => Promise<void>
  abort: () => void
  clearStream: () => void
}

export function useAgentStream(
  workdir: string,
  backend: string = 'opencode'
): UseAgentStreamResult {
  const [events, setEvents] = useState<Agent2Event[]>([])
  const [running, setRunning] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  const base = getMeta('ol-sidecarUrl') ?? ''

  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  // Sessions belong to a specific backend (opencode/codex/claude). When the user
  // switches agent, drop the cached session so the next send starts a fresh one
  // on the chosen backend rather than reusing an id the new backend never made.
  useEffect(() => {
    closeEventSource()
    sessionIdRef.current = null
    setSessionId(null)
    setRunning(false)
  }, [backend, closeEventSource])

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current

    const resp = await fetch(`${base}/api/agent2/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workdir, backend }),
    })
    if (!resp.ok) {
      throw new Error(`Session creation failed: HTTP ${resp.status}`)
    }
    const data = (await resp.json()) as { sessionId: string }
    sessionIdRef.current = data.sessionId
    setSessionId(data.sessionId)
    return data.sessionId
  }, [base, workdir, backend])

  const openEventSource = useCallback(
    (sid: string) => {
      closeEventSource()
      const enc = encodeURIComponent
      const url = `${base}/api/agent2/events?workdir=${enc(workdir)}&sessionId=${enc(sid)}&backend=${enc(backend)}`
      const es = new EventSource(url)

      // We listen on the DEFAULT 'message' event, which EventSource fires only
      // for SSE frames that have NO `event:` line. The sidecar therefore MUST
      // emit bare `data: {...}` frames and dispatch by the JSON `kind` field.
      // If it ever emits named frames (event: reasoning, etc.) they are silently
      // dropped here and the panel spins forever. See agentStream.js send().
      es.addEventListener('message', (ev: MessageEvent) => {
        const event = parseAgent2Event(ev.data)
        if (!event) return
        setEvents(prev => [...prev, event])
        if (event.kind === 'done' || event.kind === 'error') {
          setRunning(false)
        }
      })

      // On a transport error we stop the spinner and drop this EventSource, but
      // deliberately DO NOT clear sessionIdRef: the backend session may still be
      // alive, so a subsequent send() reuses it rather than orphaning the turn.
      es.addEventListener('error', () => {
        setRunning(false)
        es.close()
        if (eventSourceRef.current === es) {
          eventSourceRef.current = null
        }
      })

      eventSourceRef.current = es
    },
    [base, workdir, closeEventSource]
  )

  const send = useCallback(
    async (payload: SendPayload) => {
      const sid = await ensureSession()
      openEventSource(sid)
      setRunning(true)

      const body: Record<string, unknown> = {
        workdir,
        sessionId: sid,
        text: payload.text,
        backend,
      }
      if (payload.selection) body.selection = payload.selection
      if (payload.model) body.model = payload.model

      const resp = await fetch(`${base}/api/agent2/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!resp.ok) {
        setRunning(false)
        throw new Error(`Message failed: HTTP ${resp.status}`)
      }
    },
    [base, workdir, backend, ensureSession, openEventSource]
  )

  const abort = useCallback(() => {
    closeEventSource()
    setRunning(false)
    if (sessionIdRef.current) {
      void fetch(`${base}/api/agent2/abort`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workdir,
          sessionId: sessionIdRef.current,
          backend,
        }),
      }).catch(() => {
        // best-effort; ignore errors
      })
    }
  }, [base, workdir, backend, closeEventSource])

  const clearStream = useCallback(() => {
    setEvents([])
  }, [])

  useEffect(() => {
    return () => {
      closeEventSource()
    }
  }, [closeEventSource])

  return { events, running, sessionId, send, abort, clearStream }
}
