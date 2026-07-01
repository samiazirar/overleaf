import { useState, useEffect, useCallback } from 'react'
import getMeta from '@/utils/meta'
import { useApplyEdit } from './apply-edit'

interface Skill {
  id: string
  name: string
  instructions: string
  createdAt?: string
}

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

const smallBtn = (bg: string) => ({
  padding: '4px 8px',
  fontSize: '12px',
  cursor: 'pointer',
  backgroundColor: bg,
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
})

export default function SkillsPanel() {
  const base = getMeta('ol-sidecarUrl') ?? ''
  const apply = useApplyEdit()

  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [instructions, setInstructions] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchSkills = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch(`${base}/api/skills`)
      const data = (await resp.json()) as { ok: boolean; skills?: Skill[]; error?: string }
      if (!data.ok) throw new Error(data.error || `HTTP ${resp.status}`)
      setSkills(data.skills || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [base])

  useEffect(() => {
    void fetchSkills()
  }, [fetchSkills])

  const addSkill = async () => {
    if (!name.trim() || !instructions.trim() || adding) return
    setAdding(true)
    setAddError(null)
    try {
      const resp = await fetch(`${base}/api/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), instructions: instructions.trim() }),
      })
      const data = (await resp.json()) as { ok: boolean; skill?: Skill; error?: string }
      if (!data.ok) throw new Error(data.error || `HTTP ${resp.status}`)
      setName('')
      setInstructions('')
      await fetchSkills()
    } catch (e) {
      setAddError(e instanceof Error ? e.message : String(e))
    } finally {
      setAdding(false)
    }
  }

  const deleteSkill = async (id: string) => {
    if (deletingId) return
    setDeletingId(id)
    setError(null)
    try {
      const resp = await fetch(`${base}/api/skills/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const data = (await resp.json()) as { ok: boolean; error?: string }
      if (!data.ok) throw new Error(data.error || `HTTP ${resp.status}`)
      await fetchSkills()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '12px 16px',
        color: 'var(--content-primary-themed)',
      }}
    >
      {/* Add skill form */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          paddingBottom: '10px',
          borderBottom: '1px solid var(--border-divider-themed)',
        }}
      >
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Skill name"
          disabled={adding}
          style={box}
        />
        <textarea
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          placeholder="Instructions…"
          rows={3}
          disabled={adding}
          style={{ ...box, resize: 'vertical' }}
        />
        <button
          type="button"
          onClick={() => void addSkill()}
          disabled={adding || !name.trim() || !instructions.trim()}
          style={{
            padding: '7px 12px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: adding || !name.trim() || !instructions.trim() ? 'not-allowed' : 'pointer',
            backgroundColor: 'var(--blue-50)',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            opacity: adding || !name.trim() || !instructions.trim() ? 0.6 : 1,
            alignSelf: 'flex-end',
          }}
        >
          {adding ? '…' : 'Add'}
        </button>
        {addError && (
          <div style={{ fontSize: '12px', color: 'var(--red-50)' }}>{addError}</div>
        )}
      </div>

      {/* List */}
      {loading && (
        <div style={{ fontSize: '12px', color: 'var(--content-secondary-themed)' }}>
          Loading…
        </div>
      )}
      {error && (
        <div style={{ fontSize: '12px', color: 'var(--red-50)' }}>{error}</div>
      )}
      {!loading && !error && skills.length === 0 && (
        <div style={{ fontSize: '12px', color: 'var(--content-secondary-themed)' }}>
          No skills yet. Add one above.
        </div>
      )}
      {skills.map(skill => (
        <div
          key={skill.id}
          style={{ borderTop: '1px solid var(--border-divider-themed)', paddingTop: '8px' }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600 }}>{skill.name}</div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--content-secondary-themed)',
              margin: '2px 0 5px',
              maxHeight: '48px',
              overflow: 'hidden',
            }}
          >
            {skill.instructions}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {apply && (
              <button
                type="button"
                onClick={() => apply.insertAtCursor(skill.instructions)}
                style={smallBtn('var(--green-50)')}
              >
                Insert instructions
              </button>
            )}
            <button
              type="button"
              disabled={deletingId === skill.id}
              onClick={() => void deleteSkill(skill.id)}
              style={{
                ...smallBtn('var(--red-50)'),
                opacity: deletingId === skill.id ? 0.6 : 1,
                cursor: deletingId === skill.id ? 'not-allowed' : 'pointer',
              }}
            >
              {deletingId === skill.id ? '…' : 'Delete'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
