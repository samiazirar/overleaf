// apply-edit.ts
// Applies an accepted AI suggestion as a single CodeMirror6 transaction,
// keeping OT history consistent.
//
// Two exports:
//   applyEdit(view, edit)  - pure function, call with a live EditorView
//   useApplyEdit()         - React hook; returns null when editor is not mounted
//
// NOTE on context reachability:
// The AI panel lives in the Rail, which is a sibling of the source editor in
// the React tree, not a descendant of CodeMirrorViewContext.Provider. Calling
// useCodeMirrorViewContext() from here would throw at runtime.
//
// The correct bridge is useEditorViewContext() from
// @/features/ide-react/context/editor-view-context, which is provided by
// EditorViewProvider at the react-context-root level (wrapping the whole IDE).
// CodeMirrorView syncs the live EditorView into that context via setView(view).
// The context value is EditorView | null (null until the editor mounts).

import { useCallback } from 'react'
import { EditorView } from '@codemirror/view'
import { useEditorViewContext } from '@/features/ide-react/context/editor-view-context'

export interface EditRange {
  /** Start offset in the document (inclusive). */
  from: number
  /** End offset in the document (exclusive). Use from === to for a pure insertion. */
  to: number
  /** Replacement text. Empty string deletes the range. */
  insert: string
}

/**
 * Dispatches a single replace/insert/delete transaction on the given view.
 * Safe to call with from === to (pure insertion) or insert === '' (deletion).
 */
export function applyEdit(view: EditorView, edit: EditRange): void {
  const docLen = view.state.doc.length
  const from = Math.max(0, Math.min(edit.from, docLen))
  const to = Math.max(from, Math.min(edit.to, docLen))
  view.dispatch({
    changes: { from, to, insert: edit.insert },
  })
}

/**
 * Replaces the entire document with newText in a single CodeMirror transaction.
 * Dispatches exactly one change: { from: 0, to: doc.length, insert: newText }.
 */
export function applyFullReplace(view: EditorView, newText: string): void {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: newText },
  })
}

/**
 * Inserts text at the current cursor, replacing any active selection, and moves
 * the cursor to the end of the inserted text. Used by the Vision / Plot / Search
 * tabs to drop generated LaTeX into the document.
 */
export function insertAtCursor(view: EditorView, text: string): void {
  const sel = view.state.selection.main
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: text },
    selection: { anchor: sel.from + text.length },
  })
}

/**
 * React hook that returns apply callbacks bound to the live EditorView,
 * or null when the editor has not yet mounted.
 *
 * Returns: { applyEdit, applyFullReplace } | null
 *
 * Usage:
 *   const apply = useApplyEdit()
 *   if (apply) apply.applyEdit({ from: 0, to: 5, insert: 'Hello' })
 *   if (apply) apply.applyFullReplace('Entire new document text.')
 */
export interface ApplyEditHookResult {
  applyEdit: (edit: EditRange) => void
  applyFullReplace: (newText: string) => void
  insertAtCursor: (text: string) => void
}

export function useApplyEdit(): ApplyEditHookResult | null {
  const { view } = useEditorViewContext()

  const boundApplyEdit = useCallback(
    (edit: EditRange) => {
      if (!view) return
      applyEdit(view, edit)
    },
    [view]
  )

  const boundApplyFullReplace = useCallback(
    (newText: string) => {
      if (!view) return
      applyFullReplace(view, newText)
    },
    [view]
  )

  const boundInsertAtCursor = useCallback(
    (text: string) => {
      if (!view) return
      insertAtCursor(view, text)
    },
    [view]
  )

  if (!view) return null
  return {
    applyEdit: boundApplyEdit,
    applyFullReplace: boundApplyFullReplace,
    insertAtCursor: boundInsertAtCursor,
  }
}
