import { expect } from 'chai'
import sinon from 'sinon'
import { applyFindingsToDoc } from '../../../../frontend/js/features/ide-redesign/components/ai-tutor/use-apply-findings'
import { SidecarFinding } from '../../../../frontend/js/features/ide-redesign/components/ai-tutor/anchor-mapper'

describe('applyFindingsToDoc', function () {
  const doc = 'The quick brown fox jumps over the lazy dog.'

  let addComment: sinon.SinonStub

  beforeEach(function () {
    addComment = sinon.stub().resolves()
  })

  it('calls addComment with correct pos, text, and content for an exact match', async function () {
    const findings: SidecarFinding[] = [
      { quote: 'brown fox', message: 'Consider rephrasing this.' },
    ]
    const result = await applyFindingsToDoc(doc, findings, addComment)
    expect(addComment.calledOnce).to.be.true
    const [pos, text, content] = addComment.firstCall.args
    expect(pos).to.equal(10)
    expect(text).to.equal('brown fox')
    expect(content).to.equal('Consider rephrasing this.')
    expect(result.applied).to.equal(1)
    expect(result.skipped).to.equal(0)
    expect(result.errors).to.equal(0)
  })

  it('skips findings that do not anchor', async function () {
    const findings: SidecarFinding[] = [
      { quote: 'purple elephant parade', message: 'Not found.' },
    ]
    const result = await applyFindingsToDoc(doc, findings, addComment, {
      minScore: 0.9,
    })
    expect(addComment.called).to.be.false
    expect(result.applied).to.equal(0)
    expect(result.skipped).to.equal(1)
    expect(result.errors).to.equal(0)
  })

  it('handles a mix of anchored and unanchored findings', async function () {
    const findings: SidecarFinding[] = [
      { quote: 'quick brown', message: 'Good phrase.' },
      { quote: 'xxxxxxxxxxxxxx', message: 'Not found.' },
      { quote: 'lazy dog', message: 'Another note.' },
    ]
    const result = await applyFindingsToDoc(doc, findings, addComment, {
      minScore: 0.9,
    })
    expect(addComment.callCount).to.equal(2)
    expect(result.applied).to.equal(2)
    expect(result.skipped).to.equal(1)
    expect(result.errors).to.equal(0)
  })

  it('counts errors when addComment rejects', async function () {
    addComment = sinon.stub().rejects(new Error('network failure'))
    const findings: SidecarFinding[] = [
      { quote: 'brown fox', message: 'This will error.' },
    ]
    const result = await applyFindingsToDoc(doc, findings, addComment)
    expect(result.applied).to.equal(0)
    expect(result.skipped).to.equal(0)
    expect(result.errors).to.equal(1)
  })

  it('returns all zeros for an empty findings list', async function () {
    const result = await applyFindingsToDoc(doc, [], addComment)
    expect(addComment.called).to.be.false
    expect(result).to.deep.equal({ applied: 0, skipped: 0, errors: 0 })
  })

  it('processes findings sequentially (preserves call order)', async function () {
    const findings: SidecarFinding[] = [
      { quote: 'quick brown', message: 'first' },
      { quote: 'lazy dog', message: 'second' },
    ]
    await applyFindingsToDoc(doc, findings, addComment, { minScore: 0.9 })
    expect(addComment.getCall(0).args[2]).to.equal('first')
    expect(addComment.getCall(1).args[2]).to.equal('second')
  })
})
