// use-apply-findings.ts
// Wires sidecar review findings to native Overleaf comment threads.
//
// Exports:
//   applyFindingsToDoc  - pure function (unit-testable without React)
//   useApplyFindings    - React hook that resolves addComment from
//                         ThreadsActionsContext and exposes apply()
//
// The sidecar NEVER writes the document directly. Every comment is created
// through Overleaf's native addComment API (threads-context.tsx), which posts
// to /project/:id/thread/:threadId/messages and submits the OT op.

import { useCallback } from 'react'
import { anchorFinding, SidecarFinding } from './anchor-mapper'
import { useThreadsActionsContext } from '@/features/review-panel/context/threads-context'

export interface ApplyResult {
  applied: number
  skipped: number
  errors: number
}

// Pure function exported for unit-testing without React.
// `addComment` matches the signature in ThreadsActionsContext:
//   addComment(pos: number, text: string, content: string) => Promise<void>
export async function applyFindingsToDoc(
  docText: string,
  findings: SidecarFinding[],
  addComment: (pos: number, text: string, content: string) => Promise<void>,
  opts: { minScore?: number } = {}
): Promise<ApplyResult> {
  const { minScore = 0.7 } = opts
  let applied = 0
  let skipped = 0
  let errors = 0
  for (const finding of findings) {
    const anchor = anchorFinding(docText, finding, { minScore })
    if (!anchor) {
      skipped++
      continue
    }
    try {
      await addComment(anchor.pos, anchor.text, finding.message)
      applied++
    } catch {
      errors++
    }
  }
  return { applied, skipped, errors }
}

// React hook: resolves addComment from context and exposes an apply() callback.
// Call apply(docText, findings) from any button handler in the AI panel.
export function useApplyFindings(): {
  apply: (
    docText: string,
    findings: SidecarFinding[],
    opts?: { minScore?: number }
  ) => Promise<ApplyResult>
} {
  const { addComment } = useThreadsActionsContext()

  const apply = useCallback(
    (
      docText: string,
      findings: SidecarFinding[],
      opts?: { minScore?: number }
    ) => applyFindingsToDoc(docText, findings, addComment, opts),
    [addComment]
  )

  return { apply }
}
