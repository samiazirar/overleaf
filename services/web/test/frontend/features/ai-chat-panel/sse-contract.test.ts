import { expect } from 'chai'
import { Agent2EventSchema } from '../../../../frontend/js/features/ide-redesign/components/ai-tutor/agent2-event-schema'

// Contract tests: verify that well-formed sidecar SSE event payloads satisfy
// the Agent2EventSchema, and that malformed payloads are rejected.

const VALID_SAMPLES = [
  {
    label: 'reasoning',
    raw: JSON.stringify({ kind: 'reasoning', id: 'r1', text: 'Thinking about it...' }),
  },
  {
    label: 'message',
    raw: JSON.stringify({ kind: 'message', id: 'm1', role: 'assistant', text: 'Hello!' }),
  },
  {
    label: 'message without role',
    raw: JSON.stringify({ kind: 'message', text: 'Hi.' }),
  },
  {
    label: 'tool start',
    raw: JSON.stringify({ kind: 'tool', name: 'bash', phase: 'start' }),
  },
  {
    label: 'tool done with summary',
    raw: JSON.stringify({ kind: 'tool', name: 'read_file', phase: 'done', summary: 'Read 200 lines' }),
  },
  {
    label: 'status running',
    raw: JSON.stringify({ kind: 'status', state: 'running' }),
  },
  {
    label: 'status idle',
    raw: JSON.stringify({ kind: 'status', state: 'idle' }),
  },
  {
    label: 'done',
    raw: JSON.stringify({ kind: 'done' }),
  },
  {
    label: 'error',
    raw: JSON.stringify({ kind: 'error', message: 'Something went wrong' }),
  },
]

const INVALID_SAMPLES = [
  {
    label: 'missing kind',
    raw: JSON.stringify({ text: 'no kind field' }),
  },
  {
    label: 'unknown kind',
    raw: JSON.stringify({ kind: 'unknown_type', text: 'whatever' }),
  },
  {
    label: 'tool missing name',
    raw: JSON.stringify({ kind: 'tool', phase: 'start' }),
  },
  {
    label: 'tool invalid phase',
    raw: JSON.stringify({ kind: 'tool', name: 'bash', phase: 'pending' }),
  },
  {
    label: 'status invalid state',
    raw: JSON.stringify({ kind: 'status', state: 'busy' }),
  },
  {
    label: 'error missing message',
    raw: JSON.stringify({ kind: 'error' }),
  },
  {
    label: 'reasoning missing text',
    raw: JSON.stringify({ kind: 'reasoning' }),
  },
  {
    label: 'message missing text',
    raw: JSON.stringify({ kind: 'message', role: 'assistant' }),
  },
]

function parseSseData(raw: string): unknown {
  return JSON.parse(raw)
}

describe('Agent2EventSchema SSE contract', function () {
  describe('valid sidecar events', function () {
    for (const sample of VALID_SAMPLES) {
      it(`accepts ${sample.label}`, function () {
        const parsed = parseSseData(sample.raw)
        const result = Agent2EventSchema.safeParse(parsed)
        expect(result.success, `Expected success for: ${sample.label}; got error: ${!result.success ? JSON.stringify((result as any).error?.issues) : ''}`).to.be.true
      })
    }
  })

  describe('invalid sidecar events', function () {
    for (const sample of INVALID_SAMPLES) {
      it(`rejects ${sample.label}`, function () {
        const parsed = parseSseData(sample.raw)
        const result = Agent2EventSchema.safeParse(parsed)
        expect(result.success, `Expected failure for: ${sample.label}`).to.be.false
      })
    }
  })

  describe('Agent2Event shape assertions', function () {
    it('normalizes a reasoning event to the correct kind', function () {
      const raw = { kind: 'reasoning', text: 'Let me think...' }
      const result = Agent2EventSchema.safeParse(raw)
      expect(result.success).to.be.true
      if (result.success) {
        expect(result.data.kind).to.equal('reasoning')
        expect((result.data as any).text).to.equal('Let me think...')
      }
    })

    it('normalizes a tool event with all optional fields', function () {
      const raw = { kind: 'tool', id: 'tool-1', name: 'search', phase: 'done', summary: 'Found 5 results' }
      const result = Agent2EventSchema.safeParse(raw)
      expect(result.success).to.be.true
      if (result.success) {
        const data = result.data as any
        expect(data.kind).to.equal('tool')
        expect(data.name).to.equal('search')
        expect(data.phase).to.equal('done')
        expect(data.summary).to.equal('Found 5 results')
      }
    })

    it('normalizes a done event with no extra fields', function () {
      const raw = { kind: 'done' }
      const result = Agent2EventSchema.safeParse(raw)
      expect(result.success).to.be.true
      if (result.success) {
        expect(result.data.kind).to.equal('done')
      }
    })

    it('normalizes an error event with a message', function () {
      const raw = { kind: 'error', message: 'timeout' }
      const result = Agent2EventSchema.safeParse(raw)
      expect(result.success).to.be.true
      if (result.success) {
        const data = result.data as any
        expect(data.kind).to.equal('error')
        expect(data.message).to.equal('timeout')
      }
    })
  })
})
