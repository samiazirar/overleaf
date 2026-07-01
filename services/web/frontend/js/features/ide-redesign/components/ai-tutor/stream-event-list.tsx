import { useEffect, useRef, useState } from 'react'
import type { Agent2Event } from './use-agent-stream'

interface StreamEventListProps {
  events: Agent2Event[]
  running: boolean
}

function ElapsedTimer({ running }: { running: boolean }) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (running) {
      startRef.current = Date.now()
      const tick = () => {
        if (startRef.current !== null) {
          setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } else {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      startRef.current = null
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [running])

  if (!running) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: 'var(--blue-50)',
        padding: '4px 8px',
        backgroundColor: 'var(--bg-secondary-themed)',
        borderRadius: '4px',
        marginTop: '4px',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 'var(--blue-50)',
          animation: 'pulse 1.2s ease-in-out infinite',
        }}
      />
      Running... {elapsed}s
    </div>
  )
}

function ReasoningBlock({ event }: { event: Agent2Event }) {
  return (
    <details
      className="reasoning-block"
      style={{
        fontSize: '12px',
        color: 'var(--content-secondary-themed)',
        margin: '4px 0',
        padding: '4px 8px',
        backgroundColor: 'var(--bg-secondary-themed)',
        borderRadius: '4px',
        borderLeft: '3px solid var(--border-divider-themed)',
      }}
    >
      <summary style={{ cursor: 'pointer', userSelect: 'none' }}>
        Reasoning
      </summary>
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          margin: '6px 0 0 0',
          fontFamily: 'inherit',
          fontSize: '12px',
        }}
      >
        {event.text ?? ''}
      </pre>
    </details>
  )
}

function ToolBlock({ event }: { event: Agent2Event }) {
  const phaseColor =
    event.phase === 'error'
      ? 'var(--red-50)'
      : event.phase === 'done'
        ? 'var(--green-50)'
        : 'var(--blue-50)'

  return (
    <details
      style={{
        fontSize: '12px',
        color: 'var(--content-secondary-themed)',
        margin: '4px 0',
        padding: '4px 8px',
        backgroundColor: 'var(--bg-secondary-themed)',
        borderRadius: '4px',
        borderLeft: `3px solid ${phaseColor}`,
      }}
    >
      <summary style={{ cursor: 'pointer', userSelect: 'none' }}>
        Tool: {event.name ?? 'unknown'}{' '}
        <span style={{ color: phaseColor }}>[{event.phase ?? 'running'}]</span>
      </summary>
      {event.summary && (
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: '6px 0 0 0',
            fontFamily: 'inherit',
            fontSize: '12px',
          }}
        >
          {event.summary}
        </pre>
      )}
    </details>
  )
}

function MessageBlock({ event }: { event: Agent2Event }) {
  return (
    <div
      style={{
        fontSize: '13px',
        color: 'var(--content-primary-themed)',
        margin: '4px 0',
        padding: '8px 10px',
        backgroundColor: 'var(--bg-secondary-themed)',
        borderRadius: '6px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        lineHeight: '1.5',
      }}
    >
      {event.text ?? ''}
    </div>
  )
}

function StatusBlock({ event }: { event: Agent2Event }) {
  return (
    <div
      style={{
        fontSize: '12px',
        color: 'var(--content-secondary-themed)',
        margin: '4px 0',
        padding: '4px 8px',
        fontStyle: 'italic',
      }}
    >
      Status: {event.state ?? 'unknown'}
    </div>
  )
}

function ErrorBlock({ event }: { event: Agent2Event }) {
  return (
    <div
      style={{
        fontSize: '13px',
        color: 'var(--red-50)',
        margin: '4px 0',
        padding: '8px 10px',
        backgroundColor: 'var(--bg-secondary-themed)',
        borderRadius: '6px',
        borderLeft: '3px solid var(--red-50)',
      }}
    >
      Error: {event.message ?? 'Unknown error'}
    </div>
  )
}

export default function StreamEventList({
  events,
  running,
}: StreamEventListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [events])

  if (events.length === 0 && !running) return null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        padding: '8px 0',
      }}
    >
      {events.map((event, idx) => {
        if (event.kind === 'reasoning') {
          return <ReasoningBlock key={idx} event={event} />
        }
        if (event.kind === 'tool') {
          return <ToolBlock key={idx} event={event} />
        }
        if (event.kind === 'message') {
          return <MessageBlock key={idx} event={event} />
        }
        if (event.kind === 'status') {
          return <StatusBlock key={idx} event={event} />
        }
        if (event.kind === 'error') {
          return <ErrorBlock key={idx} event={event} />
        }
        // done events: no visible block needed
        return null
      })}
      <ElapsedTimer running={running} />
      <div ref={bottomRef} />
    </div>
  )
}
