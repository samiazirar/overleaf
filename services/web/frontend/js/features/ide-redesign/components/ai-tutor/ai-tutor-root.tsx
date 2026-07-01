import { useState } from 'react'
import AiTutorPanel from './ai-tutor-panel'
import AiChatPanel from './ai-chat-panel'
import VisionPanel from './vision-panel'
import PaperSearchPanel from './paper-search-panel'
import PlotPanel from './plot-panel'
import ReviewPanel from './review-panel'
import SkillsPanel from './skills-panel'
import WebSearchPanel from './websearch-panel'
import GitPanel from './git-panel'
import ResearchPanel from './research-panel'
import TerminalPanel from './terminal-panel'

type Tab =
  | 'mentor'
  | 'chat'
  | 'vision'
  | 'search'
  | 'plot'
  | 'review'
  | 'skills'
  | 'websearch'
  | 'git'
  | 'research'
  | 'terminal'

const TABS: { id: Tab; label: string }[] = [
  { id: 'mentor', label: 'Paper Mentor' },
  { id: 'chat', label: 'AI Chat' },
  { id: 'vision', label: 'Vision' },
  { id: 'search', label: 'Search' },
  { id: 'plot', label: 'Plot' },
  { id: 'review', label: 'Review' },
  { id: 'skills', label: 'Skills' },
  { id: 'websearch', label: 'Web' },
  { id: 'git', label: 'Git' },
  { id: 'research', label: 'Research' },
  { id: 'terminal', label: 'Terminal' },
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
              padding: '8px 9px', cursor: 'pointer',
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
        {tab === 'skills' && <SkillsPanel />}
        {tab === 'websearch' && <WebSearchPanel />}
        {tab === 'git' && <GitPanel />}
        {tab === 'research' && <ResearchPanel />}
        {tab === 'terminal' && <TerminalPanel />}
      </div>
    </div>
  )
}
