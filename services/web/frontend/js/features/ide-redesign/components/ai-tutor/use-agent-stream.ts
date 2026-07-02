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
  seq?: number
}

export interface SendPayload {
  sessionId: string
  text: string
  selection?: string
  wholeDoc?: string
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

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

interface StoredSession {
  sessionId: string
  lastSeq: number
}

function lsKey(workdir: string, backend: string): string {
  return `openprism.agent2.${workdir}.${backend}`
}

function readStored(workdir: string, backend: string): StoredSession | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(lsKey(workdir, backend))
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Record<string, unknown>).sessionId === 'string' &&
      typeof (parsed as Record<string, unknown>).lastSeq === 'number'
    ) {
      return parsed as StoredSession
    }
    return null
  } catch {
    return null
  }
}

function writeStored(
  workdir: string,
  backend: string,
  value: StoredSession
): void {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(lsKey(workdir, backend), JSON.stringify(value))
  } catch {
    // quota exceeded or private mode – silently ignore
  }
}

function clearStored(workdir: string, backend: string): void {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(lsKey(workdir, backend))
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------

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
  const lastSeqRef = useRef<number>(0)

  const base = getMeta('ol-sidecarUrl') ?? ''

  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  const openEventSource = useCallback(
    (sid: string, fromSeq = 0) => {
      closeEventSource()
      const enc = encodeURIComponent
      const url = `${base}/api/agent2/events?workdir=${enc(workdir)}&sessionId=${enc(sid)}&backend=${enc(backend)}&from=${fromSeq}`
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
        if (typeof event.seq === 'number') {
          lastSeqRef.current = Math.max(lastSeqRef.current, event.seq)
          writeStored(workdir, backend, {
            sessionId: sid,
            lastSeq: lastSeqRef.current,
          })
        }
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
    [base, workdir, backend, closeEventSource]
  )

  // -------------------------------------------------------------------------
  // Re-attach effect: on mount and whenever workdir/backend changes, reset the
  // visible state for the (new) view, then try to restore a persisted session
  // for this workdir+backend. If one exists on the server we replay its full
  // buffered transcript (from=0 — safe because we just cleared events, so it
  // cannot duplicate) and resume live, so a refresh / reopen / backend-switch
  // shows the ongoing or last conversation. Guarded against React StrictMode
  // double-mount via a cancelled flag.
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false

    // Reset the visible state for this (workdir, backend) view up front so a
    // backend switch or a reload never shows another session's events.
    closeEventSource()
    setEvents([])
    setRunning(false)
    setSessionId(null)
    sessionIdRef.current = null
    lastSeqRef.current = 0

    async function tryReattach() {
      const stored = readStored(workdir, backend)
      if (!stored) return

      try {
        const enc = encodeURIComponent
        const resp = await fetch(
          `${base}/api/agent2/session/${enc(stored.sessionId)}?backend=${enc(backend)}&workdir=${enc(workdir)}`
        )
        if (!resp.ok) throw new Error(`status ${resp.status}`)
        const data = (await resp.json()) as {
          exists: boolean
          status: 'idle' | 'running' | 'done' | 'error'
          lastSeq: number
        }

        if (cancelled) return

        if (!data.exists) {
          // Server GC'd or restarted; drop the stale entry and start fresh.
          clearStored(workdir, backend)
          return
        }

        // Restore and replay the FULL buffered transcript. events was just
        // cleared above, so from=0 restores everything the server still holds
        // without duplicating. lastSeqRef is advanced by openEventSource as the
        // replayed events arrive.
        sessionIdRef.current = stored.sessionId
        setSessionId(stored.sessionId)
        setRunning(data.status === 'running')
        openEventSource(stored.sessionId, 0)
      } catch {
        // Network error or unexpected shape – leave the stored entry intact and
        // stay fresh; a later send() will reuse or recreate the session.
      }
    }

    void tryReattach()

    return () => {
      cancelled = true
      closeEventSource()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workdir, backend]) // openEventSource/closeEventSource stable via useCallback; excluded to avoid double-fire

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
    lastSeqRef.current = 0
    writeStored(workdir, backend, { sessionId: data.sessionId, lastSeq: 0 })
    return data.sessionId
  }, [base, workdir, backend])

  const send = useCallback(
    async (payload: SendPayload) => {
      const sid = await ensureSession()
      openEventSource(sid, lastSeqRef.current)
      setRunning(true)

      const body: Record<string, unknown> = {
        workdir,
        sessionId: sid,
        text: payload.text,
        backend,
      }
      if (payload.selection) body.selection = payload.selection
      if (payload.wholeDoc) body.wholeDoc = payload.wholeDoc
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
    // Do NOT delete the stored session: aborting ends the turn, not the session.
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

  return { events, running, sessionId, send, abort, clearStream }
}
