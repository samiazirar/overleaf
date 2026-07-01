import { useState } from 'react'
import AiTutorPanel from './ai-tutor-panel'
import AiChatPanel from './ai-chat-panel'

type Tab = 'mentor' | 'chat'

export default function AiTutorRoot() {
  const [tab, setTab] = useState<Tab>('mentor')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-divider-themed)', padding: '0 8px', gap: '4px' }}>
        {(['mentor', 'chat'] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              background: 'none', border: 'none',
              borderBottom: tab === t ? '2px solid var(--blue-50)' : '2px solid transparent',
              padding: '8px 12px', cursor: 'pointer',
              fontWeight: tab === t ? 600 : 400,
              color: 'var(--content-primary-themed)', fontSize: '13px',
            }}
          >
            {t === 'mentor' ? 'Paper Mentor' : 'AI Chat'}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'mentor' ? <AiTutorPanel /> : <AiChatPanel />}
      </div>
    </div>
  )
}
