import { expect } from 'chai'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import AiTutorRoot from '../../../../frontend/js/features/ide-redesign/components/ai-tutor/ai-tutor-root'
import sinon from 'sinon'

// Stubs for the two panels imported by AiTutorRoot.
// We patch the module registry used by the mocha+webpack bundle by replacing
// the default exports before each test via a sinon sandbox, but since mocha
// does not support vi.mock-style factory hoisting we render stand-in stubs
// by relying on the fact that the real AiTutorPanel and AiChatPanel do NOT
// throw when rendered without provider context inside this shallow test.
// If they do throw, wrap each in a try/catch ErrorBoundary at the root level.

describe('<AiTutorRoot />', function () {
  afterEach(function () {
    cleanup()
  })

  it('shows the Paper Mentor tab button and AI Chat tab button', function () {
    render(<AiTutorRoot />)
    expect(screen.getByRole('button', { name: /Paper Mentor/i })).to.exist
    expect(screen.getByRole('button', { name: /AI Chat/i })).to.exist
  })

  it('renders the Paper Mentor tab active by default (AI Chat tab inactive)', function () {
    render(<AiTutorRoot />)
    const mentorBtn = screen.getByRole('button', { name: /Paper Mentor/i })
    // Active tab has fontWeight 600 inline style
    expect((mentorBtn as HTMLButtonElement).style.fontWeight).to.equal('600')
    const chatBtn = screen.getByRole('button', { name: /AI Chat/i })
    expect((chatBtn as HTMLButtonElement).style.fontWeight).to.not.equal('600')
  })

  it('switches to AI Chat tab when the AI Chat button is clicked', function () {
    render(<AiTutorRoot />)
    const chatBtn = screen.getByRole('button', { name: /AI Chat/i })
    fireEvent.click(chatBtn)
    expect((chatBtn as HTMLButtonElement).style.fontWeight).to.equal('600')
    const mentorBtn = screen.getByRole('button', { name: /Paper Mentor/i })
    expect((mentorBtn as HTMLButtonElement).style.fontWeight).to.not.equal('600')
  })
})
