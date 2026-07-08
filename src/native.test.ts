import { describe, it, expect } from 'bun:test'
import { nativeCoordinator } from './native-orchestrator'

const TIMEOUT = 300_000

/*
 * Backend-agnostic: runs against whatever the Claude Agent SDK is configured
 * for — set ANTHROPIC_BASE_URL + ANTHROPIC_MODEL for Ollama, or
 * ANTHROPIC_API_KEY (+ optional ANTHROPIC_MODEL) for real Anthropic.
 *
 * Model-risk notes (re-run before assuming a code bug):
 * - Local/Ollama models may not emit two Agent tool_use blocks in one turn;
 *   the SDK serializes them across turns — the run still completes, only the
 *   `parallelAgentSpawns` flag detection is affected.
 * - Models may not perfectly follow the {report, findings} echo shape; the
 *   orchestrator has a fallback parse, but if findings come back empty every
 *   citation surfaces as orphaned. Re-run once before treating it as a bug.
 */

async function backendReachable(): Promise<boolean> {
  const baseUrl = process.env.ANTHROPIC_BASE_URL
  if (baseUrl) {
    // Custom endpoint (e.g. Ollama) — probe it; any response means reachable.
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 3000)
    try {
      await fetch(baseUrl, { signal: ctrl.signal })
      return true
    } catch {
      return false
    } finally {
      clearTimeout(t)
    }
  }
  // No custom base URL → real Anthropic, via API key (OAuth login can't be
  // probed here; set ANTHROPIC_API_KEY for CI).
  return !!process.env.ANTHROPIC_API_KEY
}

const reachable = await backendReachable()
const maybeIt = reachable ? it : it.skip

describe('Native SDK Coordinator Attribution Pipeline', () => {
  maybeIt(
    'produces a report with zero orphaned citations and zero uncited paragraphs',
    async () => {
      const { report, findings, orphanedCount, uncitedCount } =
        await nativeCoordinator('renewable energy technologies')

      expect(report).toBeDefined()
      expect(Array.isArray(report)).toBe(true)
      expect(report.length).toBeGreaterThan(0)
      expect(findings.length).toBeGreaterThan(0)
      expect(orphanedCount).toBe(0)
      expect(uncitedCount).toBe(0)
    },
    TIMEOUT,
  )

  maybeIt(
    'both subagent finding types are present',
    async () => {
      const { findings } = await nativeCoordinator('renewable energy technologies')
      expect(findings.filter(f => f.retrieved_by === 'web-search').length).toBeGreaterThan(0)
      expect(findings.filter(f => f.retrieved_by === 'doc-analysis').length).toBeGreaterThan(0)
    },
    TIMEOUT,
  )
})

if (!reachable) {
  console.log(
    '\n[native.test.ts] Skipped — no reachable backend (set ANTHROPIC_BASE_URL for Ollama, or ANTHROPIC_API_KEY for real Anthropic).',
  )
}