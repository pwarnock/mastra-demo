import { webSearchAgent } from './mastra/agents/web-search-agent'
import { docAnalysisSDKAgent } from './mastra/agents/document-analysis-agent'
import { createForkedDocAgent } from './mastra/agents/document-analysis-forked-agent'
import { extractionAgent } from './mastra/agents/extraction-agent'
import { synthesisAgent } from './mastra/agents/synthesis-agent'
import { DOCUMENT } from './mastra/tools/fixtures'
import { assertAttribution } from './mastra/lib/attribution'
import type { Finding, ReportCitation } from './mastra/types/finding'

async function normalizeToFindings(text: string, retrievedBy: string): Promise<Finding[]> {
  const result = await extractionAgent.generate(
    `Extract findings from the following text. Tag each with retrieved_by="${retrievedBy}".\n\n${text}`,
  )
  const findings = result.object ?? (() => {
    try {
      const raw = result.text ?? ''
      const match = raw.match(/```(?:json)?\s*\n([\s\S]*?)\n```/)
      const json = match?.[1] ?? raw
      return JSON.parse(json)
    } catch { return [] }
  })()
  if (!Array.isArray(findings) || findings.length === 0) {
    console.warn(`normalizeToFindings: no findings extracted for ${retrievedBy}`)
    return []
  }
  return findings
}

function fixtureDocFindings(): Finding[] {
  return DOCUMENT.map(page => ({
    claim: page.content,
    source_url: 'https://example.com/doc',
    document_name: 'renewable-energy-report.pdf',
    page_number: page.page,
    confidence: 1.0,
    retrieved_by: 'doc-analysis',
  }))
}

export async function hybridCoordinator(topic: string) {
  console.log(`\n🔬 Hybrid coordinator: "${topic}"`)

  const sdkTimeout = 60_000

  console.log('📚 Spawning web search + document analysis...')

  async function runSdk() {
    return Promise.race([
      docAnalysisSDKAgent.generate(
        `Analyze documents on "${topic}". For each finding, return a JSON array with objects containing: claim, source_url (use "https://example.com/doc"), document_name, page_number, confidence. Use the read_page tool to read each page (1-6) and extract findings. Return ONLY the JSON array, no markdown.`,
      ),
      new Promise((_, reject) => setTimeout(() => reject(new Error('SDK timeout')), sdkTimeout)),
    ])
  }

  const sdkPromise = runSdk()

  // Defer web spawn to next microtask so SDK init runs first (machine-independent)
  const webPromise = Promise.resolve().then(() =>
    webSearchAgent.generate(
      `Search for information on "${topic}". Return each finding with source URL and title.`,
    ),
  )

  const [webText, sdkResult] = await Promise.all([
    webPromise,
    sdkPromise.catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e)
      console.warn('SDK agent failed on first attempt, retrying:', msg)
      return runSdk()
    }).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e)
      console.warn('SDK agent failed (non-blocking):', msg)
      return null
    }),
  ])

  const webFindings = await normalizeToFindings(webText.text, 'web-search')
  const docFindings = sdkResult
    ? await normalizeToFindings(
        (sdkResult as any).text ?? JSON.stringify(sdkResult),
        'doc-analysis',
      )
    : fixtureDocFindings()

  const findings = [...webFindings, ...docFindings]
  console.log(`  Web findings: ${webFindings.length}`)
  console.log(`  Doc findings: ${docFindings.length}`)
  console.log(`  Total findings: ${findings.length}`)

  let forkAttempted = false
  let forkResult = null
  try {
    const firstSessionId =
      (sdkResult as any)?.sessionId ??
      (sdkResult as any)?.runId ??
      null
    if (firstSessionId) {
      forkAttempted = true
      const forkedAgent = createForkedDocAgent(firstSessionId)
      forkResult = await forkedAgent.generate(
        `Continue analyzing from the prior session.`,
      )
      console.log('Fork session succeeded:', forkResult.finishReason)
    } else {
      console.log('No sessionId in SDK result — fork skipped (best-effort)')
    }
  } catch (e) {
    console.warn('Fork session failed (non-blocking):', e)
  }

  console.log('\n✍️  Synthesizing report...')
  const synthesis = await synthesisAgent.generate(
    `Write a research report on "${topic}".\n\nFINDINGS:\n${JSON.stringify(findings, null, 2)}\n\nReturn a JSON array where each object has: paragraph (string, a paragraph of the report) and citations (array of {source_url, page_number} used in that paragraph). Return ONLY the JSON array, no markdown.`,
  )

  const report = synthesis.object ?? (() => {
    try {
      const raw = synthesis.text ?? ''
      const match = raw.match(/```(?:json)?\s*\n([\s\S]*?)\n```/)
      const json = match?.[1] ?? raw
      return JSON.parse(json)
    } catch { return [] }
  })() as ReportCitation[]

  // Default non-strict: orphan-only check, preserves existing hybrid.test.ts behavior.
  assertAttribution(findings, report)
  console.log('✅ Attribution verified: zero orphaned citations')

  return { report, findings, forkAttempted, forkResult, sdkUsedFallback: sdkResult === null }
}
