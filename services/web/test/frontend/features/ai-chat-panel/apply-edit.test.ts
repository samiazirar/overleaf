import { expect } from 'chai'
import sinon from 'sinon'
import {
  applyEdit,
  applyFullReplace,
  EditRange,
} from '../../../../frontend/js/features/ide-redesign/components/ai-tutor/apply-edit'

// Minimal EditorView stub that records dispatch calls.
function makeView(docLength: number) {
  const dispatchStub = sinon.stub()
  return {
    state: { doc: { length: docLength } },
    dispatch: dispatchStub,
    _stub: dispatchStub,
  }
}

describe('applyEdit', function () {
  it('dispatches exactly one transaction for a mid-document replacement', function () {
    const view = makeView(100)
    const edit: EditRange = { from: 10, to: 20, insert: 'hello' }
    applyEdit(view as any, edit)
    expect(view._stub.calledOnce).to.be.true
    const [spec] = view._stub.firstCall.args
    expect(spec).to.deep.equal({ changes: { from: 10, to: 20, insert: 'hello' } })
  })

  it('dispatches a pure insertion when from === to', function () {
    const view = makeView(50)
    const edit: EditRange = { from: 5, to: 5, insert: 'inserted' }
    applyEdit(view as any, edit)
    expect(view._stub.calledOnce).to.be.true
    const [spec] = view._stub.firstCall.args
    expect(spec.changes.from).to.equal(5)
    expect(spec.changes.to).to.equal(5)
    expect(spec.changes.insert).to.equal('inserted')
  })

  it('dispatches a deletion when insert is empty string', function () {
    const view = makeView(80)
    const edit: EditRange = { from: 0, to: 10, insert: '' }
    applyEdit(view as any, edit)
    expect(view._stub.calledOnce).to.be.true
    const [spec] = view._stub.firstCall.args
    expect(spec.changes.insert).to.equal('')
    expect(spec.changes.to).to.equal(10)
  })

  it('clamps from to [0, docLen] when from is negative', function () {
    const view = makeView(30)
    const edit: EditRange = { from: -5, to: 10, insert: 'x' }
    applyEdit(view as any, edit)
    const [spec] = view._stub.firstCall.args
    expect(spec.changes.from).to.equal(0)
  })

  it('clamps to to [from, docLen] when to exceeds document length', function () {
    const view = makeView(20)
    const edit: EditRange = { from: 5, to: 999, insert: 'end' }
    applyEdit(view as any, edit)
    const [spec] = view._stub.firstCall.args
    expect(spec.changes.to).to.equal(20)
    expect(spec.changes.from).to.equal(5)
  })

  it('clamps to to from when to < from after clamping', function () {
    // from 25 on a 20-length doc: both clamp to 20
    const view = makeView(20)
    const edit: EditRange = { from: 25, to: 30, insert: 'z' }
    applyEdit(view as any, edit)
    const [spec] = view._stub.firstCall.args
    expect(spec.changes.from).to.equal(20)
    expect(spec.changes.to).to.equal(20)
  })

  it('handles a full-document replacement (from 0 to docLen)', function () {
    const doc = 'Hello, world!'
    const view = makeView(doc.length)
    const edit: EditRange = { from: 0, to: doc.length, insert: 'Goodbye.' }
    applyEdit(view as any, edit)
    expect(view._stub.calledOnce).to.be.true
    const [spec] = view._stub.firstCall.args
    expect(spec.changes).to.deep.equal({
      from: 0,
      to: doc.length,
      insert: 'Goodbye.',
    })
  })

  it('dispatches only one transaction even for a zero-length document', function () {
    const view = makeView(0)
    const edit: EditRange = { from: 0, to: 0, insert: 'start' }
    applyEdit(view as any, edit)
    expect(view._stub.calledOnce).to.be.true
  })
})

describe('applyFullReplace', function () {
  it('dispatches exactly one transaction replacing the entire document', function () {
    const docLength = 42
    const view = makeView(docLength)
    applyFullReplace(view as any, 'replacement text')
    expect(view._stub.calledOnce).to.be.true
    const [spec] = view._stub.firstCall.args
    expect(spec).to.deep.equal({
      changes: { from: 0, to: docLength, insert: 'replacement text' },
    })
  })

  it('dispatches from 0 to 0 with the new text on an empty document', function () {
    const view = makeView(0)
    applyFullReplace(view as any, 'hello')
    expect(view._stub.calledOnce).to.be.true
    const [spec] = view._stub.firstCall.args
    expect(spec).to.deep.equal({ changes: { from: 0, to: 0, insert: 'hello' } })
  })

  it('dispatches an empty insert to clear the entire document', function () {
    const view = makeView(100)
    applyFullReplace(view as any, '')
    expect(view._stub.calledOnce).to.be.true
    const [spec] = view._stub.firstCall.args
    expect(spec).to.deep.equal({ changes: { from: 0, to: 100, insert: '' } })
  })

  it('always uses from: 0 regardless of document content', function () {
    const view = makeView(999)
    applyFullReplace(view as any, 'new content')
    const [spec] = view._stub.firstCall.args
    expect(spec.changes.from).to.equal(0)
    expect(spec.changes.to).to.equal(999)
  })
})
