import { expect } from 'chai'
import { extractDocContext } from '../../../../frontend/js/features/ide-redesign/components/ai-tutor/doc-context-extraction'
import type { DocumentContainer } from '../../../../frontend/js/features/ide-react/editor/document-container'
import type { EditorSelection } from '@codemirror/state'

// Minimal DocumentContainer stub for testing.
function makeDoc(text: string): DocumentContainer {
  return { getSnapshot: () => text } as unknown as DocumentContainer
}

// Minimal EditorSelection stub for testing.
function makeSelection(from: number, to: number): EditorSelection {
  return {
    main: { from, to, empty: from === to },
  } as unknown as EditorSelection
}

describe('extractDocContext', function () {
  it('returns full doc text and empty selection when no selection is provided', function () {
    const doc = makeDoc('hello world')
    const result = extractDocContext(doc, undefined)
    expect(result.docText).to.equal('hello world')
    expect(result.selectionText).to.equal('')
    expect(result.from).to.equal(0)
    expect(result.to).to.equal(0)
  })

  it('returns full doc text and empty selection when selection is empty (cursor)', function () {
    const doc = makeDoc('hello world')
    const sel = makeSelection(3, 3)
    const result = extractDocContext(doc, sel)
    expect(result.docText).to.equal('hello world')
    expect(result.selectionText).to.equal('')
    expect(result.from).to.equal(0)
    expect(result.to).to.equal(0)
  })

  it('returns selected text when a range is selected', function () {
    const doc = makeDoc('hello world')
    const sel = makeSelection(6, 11)
    const result = extractDocContext(doc, sel)
    expect(result.docText).to.equal('hello world')
    expect(result.selectionText).to.equal('world')
    expect(result.from).to.equal(6)
    expect(result.to).to.equal(11)
  })

  it('returns empty docText when currentDocument is null', function () {
    const sel = makeSelection(0, 5)
    const result = extractDocContext(null, sel)
    expect(result.docText).to.equal('')
    expect(result.selectionText).to.equal('')
  })

  it('returns empty docText when getSnapshot returns undefined', function () {
    const doc = { getSnapshot: () => undefined } as unknown as DocumentContainer
    const result = extractDocContext(doc, undefined)
    expect(result.docText).to.equal('')
  })

  it('handles a selection at the very start of the document', function () {
    const doc = makeDoc('TypeScript rules')
    const sel = makeSelection(0, 10)
    const result = extractDocContext(doc, sel)
    expect(result.selectionText).to.equal('TypeScript')
    expect(result.from).to.equal(0)
    expect(result.to).to.equal(10)
  })
})
