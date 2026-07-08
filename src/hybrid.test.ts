import { describe, it, expect } from 'bun:test'
import { hybridCoordinator } from './hybrid-orchestrator'

const TIMEOUT = 300_000

describe('Hybrid Anthropic↔Mastra Attribution Pipeline', () => {
  it('SDK agent ran without falling back to fixtures', async () => {
    const { sdkUsedFallback } = await hybridCoordinator('renewable energy technologies')
    expect(sdkUsedFallback).toBe(false)
  }, TIMEOUT)

  it('produces a report with zero orphaned citations', async () => {
    const { report, findings } = await hybridCoordinator('renewable energy technologies')

    expect(report).toBeDefined()
    expect(Array.isArray(report)).toBe(true)
    expect(report.length).toBeGreaterThan(0)

    const findingMap = new Map(
      findings.map(f => [`${f.source_url}|${f.page_number}`, f]),
    )

    for (const item of report) {
      for (const citation of item.citations) {
        const key = `${citation.source_url}|${citation.page_number}`
        expect(findingMap.has(key)).toBe(true)
      }
    }
  }, TIMEOUT)

  it('both subagents produced findings', async () => {
    const { findings } = await hybridCoordinator('renewable energy technologies')
    const webFindings = findings.filter(f => f.retrieved_by === 'web-search')
    const docFindings = findings.filter(f => f.retrieved_by === 'doc-analysis')
    expect(webFindings.length).toBeGreaterThan(0)
    expect(docFindings.length).toBeGreaterThan(0)
  }, TIMEOUT)
})
