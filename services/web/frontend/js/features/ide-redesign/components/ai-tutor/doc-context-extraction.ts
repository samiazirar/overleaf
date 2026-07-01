import type { DocumentContainer } from '@/features/ide-react/editor/document-container'
import type { EditorSelection } from '@codemirror/state'

export function extractDocContext(
  currentDocument: DocumentContainer | null,
  editorSelection: EditorSelection | undefined
): { docText: string; selectionText: string; from: number; to: number } {
  const docText = currentDocument?.getSnapshot() ?? ''
  if (!editorSelection || editorSelection.main.empty) {
    return { docText, selectionText: '', from: 0, to: 0 }
  }
  const { from, to } = editorSelection.main
  return { docText, selectionText: docText.slice(from, to), from, to }
}
