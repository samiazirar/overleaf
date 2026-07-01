import { expect } from 'chai'
import {
  anchorFinding,
  SidecarFinding,
} from '../../../../frontend/js/features/ide-redesign/components/ai-tutor/anchor-mapper'

describe('anchorFinding', function () {
  const doc = 'The quick brown fox jumps over the lazy dog.'

  it('returns null when doc is empty', function () {
    const result = anchorFinding('', { quote: 'anything', message: '' })
    expect(result).to.be.null
  })

  it('returns null when quote is empty', function () {
    const result = anchorFinding(doc, { quote: '', message: 'fix' })
    expect(result).to.be.null
  })

  it('exact match returns score 1.0 and correct pos', function () {
    const result = anchorFinding(doc, { quote: 'brown fox', message: 'fix' })
    expect(result).not.to.be.null
    expect(result!.score).to.equal(1.0)
    expect(result!.pos).to.equal(10)
    expect(result!.text).to.equal('brown fox')
  })

  it('pos + text.length never exceeds doc length', function () {
    const result = anchorFinding(doc, { quote: 'lazy dog.', message: '' })
    expect(result).not.to.be.null
    expect(result!.pos + result!.text.length).to.be.lte(doc.length)
  })

  it('whitespace-normalised match returns score >= 0.9', function () {
    // 'brown  fox' has a double space: normalised to 'brown fox' which is in doc
    const result = anchorFinding(doc, { quote: 'brown  fox', message: 'fix' })
    expect(result).not.to.be.null
    expect(result!.score).to.be.gte(0.9)
    expect(result!.pos).to.equal(10)
  })

  it('returns null when quote is absent and minScore threshold is high', function () {
    const result = anchorFinding(
      doc,
      { quote: 'purple elephant parade', message: 'fix' },
      { minScore: 0.9 }
    )
    expect(result).to.be.null
  })

  it('sliding-window fuzzy finds near-miss with default threshold', function () {
    // 'quikc brown fox' is a typo of 'quick brown fox'
    const result = anchorFinding(
      doc,
      { quote: 'quikc brown fox', message: 'fix' },
      { minScore: 0.7 }
    )
    expect(result).not.to.be.null
    expect(result!.score).to.be.gt(0.7)
  })

  it('exact match at start of doc returns pos 0', function () {
    const result = anchorFinding(doc, { quote: 'The quick', message: '' })
    expect(result).not.to.be.null
    expect(result!.pos).to.equal(0)
    expect(result!.score).to.equal(1.0)
  })

  it('exact match at end of doc is found correctly', function () {
    const result = anchorFinding(doc, { quote: 'lazy dog.', message: '' })
    expect(result).not.to.be.null
    expect(result!.score).to.equal(1.0)
    expect(result!.pos).to.equal(doc.indexOf('lazy dog.'))
  })
})
