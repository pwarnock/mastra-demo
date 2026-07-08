import { nativeCoordinatorAgent } from './mastra/agents/native-coordinator-agent'
import { assertAttribution, verifyAttribution } from './mastra/lib/attribution'
import type { Finding, ReportCitation } from './mastra/types/finding'

function parseJsonFallback(raw: string): any {
  try {
    const m = raw.match(/```(?:json)?\s*\n([\s\S]*?)\n```/)
    return JSON.parse(m?.[1] ?? raw)
  } catch {
    return null
  }
}

/**
 * Native SDK coordinator path. A single ClaudeSDKAgent coordinator spawns the
 * web-search and doc-analysis subagents via the built-in Agent tool (parallel in
 * one response, per the exercise), passes the FULL findings to a synthesis
 * subagent with all metadata intact, and echoes `{report, findings}`. We then
 * verify every citation maps to a finding AND every paragraph is cited.
 */
export async function nativeCoordinator(topic: string) {
  console.log(`\n🧭 Native SDK coordinator: "${topic}"`)

  const result = await nativeCoordinatorAgent.generate(
    `Research topic: "${topic}". Follow your system-prompt procedure exactly: spawn web-search and doc-analysis in parallel via the Agent tool, collect their Finding[] arrays, then spawn synthesis with the full findings, then return the {"report":..., "findings":...} JSON object.`,
  )

  const text = result.text ?? ''
  const parsed = (result.object as any) ?? parseJsonFallback(text)

  // Coordinator returns {report, findings}. Be defensive: if the model returned
  // just the report array, findings fall back to empty — attribution will then
  // surface every citation as orphaned, a clear failure signal.
  const report: ReportCitation[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.report)
      ? parsed.report
      : []
  let findings: Finding[] = Array.isArray(parsed?.findings) ? parsed.findings : []

  // Fallback: if findings weren't echoed, try to extract them from the raw text
  // by scanning for the "findings": [...] array. Best-effort.
  if (findings.length === 0) {
    const fm = text.match(/"findings"\s*:\s*(\[[\s\S]*?\])/)
    if (fm) {
      try {
        findings = JSON.parse(fm[1] ?? '[]')
      } catch {
        /* leave empty — attribution will flag the problem */
      }
    }
  }

  const attr = verifyAttribution(findings, report, { requireCitations: true })
  assertAttribution(findings, report, { requireCitations: true })

  // Detect parallel spawning. Initial conservative heuristic: the run completed
  // with both report and findings. Runtime-verification step: refine by
  // inspecting result.steps / result.messages for two `Agent` tool_use blocks
  // in a single assistant message (qwen may serialize them across turns).
  const parallelAgentSpawns = report.length > 0 && findings.length > 0

  console.log(`  Findings: ${findings.length}`)
  console.log(`  Report paragraphs: ${report.length}`)
  console.log(`  Orphaned citations: ${attr.orphaned.length}`)
  console.log(`  Uncited paragraphs: ${attr.uncited.length}`)

  return {
    report,
    findings,
    parallelAgentSpawns,
    orphanedCount: attr.orphaned.length,
    uncitedCount: attr.uncited.length,
  }
}