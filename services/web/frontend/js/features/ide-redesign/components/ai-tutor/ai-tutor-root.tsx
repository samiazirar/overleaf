import { useState } from 'react'
import AiTutorPanel from './ai-tutor-panel'
import AiChatPanel from './ai-chat-panel'
import VisionPanel from './vision-panel'
import PaperSearchPanel from './paper-search-panel'
import PlotPanel from './plot-panel'
import ReviewPanel from './review-panel'

type Tab = 'mentor' | 'chat' | 'vision' | 'search' | 'plot' | 'review'

const TABS: { id: Tab; label: string }[] = [
  { id: 'mentor', label: 'Paper Mentor' },
  { id: 'chat', label: 'AI Chat' },
  { id: 'vision', label: 'Vision' },
  { id: 'search', label: 'Search' },
  { id: 'plot', label: 'Plot' },
  { id: 'review', label: 'Review' },
]

export default function AiTutorRoot() {
  const [tab, setTab] = useState<Tab>('mentor')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', borderBottom: '1px solid var(--border-divider-themed)', padding: '0 8px', gap: '2px' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              background: 'none', border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--blue-50)' : '2px solid transparent',
              padding: '8px 10px', cursor: 'pointer',
              fontWeight: tab === t.id ? 600 : 400,
              color: 'var(--content-primary-themed)', fontSize: '13px',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'mentor' && <AiTutorPanel />}
        {tab === 'chat' && <AiChatPanel />}
        {tab === 'vision' && <VisionPanel />}
        {tab === 'search' && <PaperSearchPanel />}
        {tab === 'plot' && <PlotPanel />}
        {tab === 'review' && <ReviewPanel />}
      </div>
    </div>
  )
}
