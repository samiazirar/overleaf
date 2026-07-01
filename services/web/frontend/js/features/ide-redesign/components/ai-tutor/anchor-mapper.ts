// anchor-mapper.ts
// Maps a sidecar review finding (quote + message) to a CodeMirror offset range
// in the current document text. Three strategies are tried in order:
//   1. Exact substring match (score 1.0)
//   2. Whitespace-normalised exact match (score 0.95)
//   3. Sliding-window Levenshtein similarity (score < 1.0, threshold configurable)
// Returns null when no anchor with sufficient confidence is found.

export interface SidecarFinding {
  quote: string
  message: string
}

export interface AnchorResult {
  pos: number
  text: string
  score: number
}

function levenshteinNorm(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0 || n === 0) return 0
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      dp[j] =
        a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = tmp
    }
  }
  return 1 - dp[n] / Math.max(m, n)
}

export function anchorFinding(
  docText: string,
  finding: SidecarFinding,
  opts: { minScore?: number; maxScanLen?: number } = {}
): AnchorResult | null {
  const { minScore = 0.5, maxScanLen = 5000 } = opts
  const { quote } = finding
  if (!docText || !quote) return null

  // Step 1: exact substring match
  let idx = docText.indexOf(quote)
  if (idx !== -1) return { pos: idx, text: quote, score: 1.0 }

  // Step 2: whitespace-normalised exact match
  const norm = quote.replace(/\s+/g, ' ').trim()
  idx = docText.indexOf(norm)
  if (idx !== -1) return { pos: idx, text: norm, score: 0.95 }

  // Step 3: sliding-window Levenshtein (bounded to maxScanLen)
  const wlen = quote.length
  const scanEnd = Math.min(docText.length, maxScanLen)
  let bestScore = 0
  let bestPos = -1
  let bestLen = wlen
  for (let i = 0; i <= scanEnd - Math.floor(wlen * 0.8); i++) {
    for (const delta of [0, Math.ceil(wlen * 0.2), -Math.ceil(wlen * 0.2)]) {
      const len = wlen + delta
      if (len <= 0 || i + len > docText.length) continue
      const window = docText.slice(i, i + len)
      const s = levenshteinNorm(quote, window)
      if (s > bestScore) {
        bestScore = s
        bestPos = i
        bestLen = len
      }
    }
  }
  if (bestScore >= minScore && bestPos !== -1) {
    return {
      pos: bestPos,
      text: docText.slice(bestPos, bestPos + bestLen),
      score: bestScore,
    }
  }
  return null
}
