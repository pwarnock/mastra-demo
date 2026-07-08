import { describe, it, expect } from 'bun:test'
import { verifyAttribution, assertAttribution } from './mastra/lib/attribution'
import type { Finding, ReportCitation } from './mastra/types/finding'

const findings: Finding[] = [
  { claim: 'a', source_url: 'https://example.com/doc', document_name: 'd', page_number: 1, confidence: 1, retrieved_by: 'doc-analysis' },
  { claim: 'b', source_url: 'https://example.com/solar', document_name: 'Solar Energy 2025', page_number: 1, confidence: 1, retrieved_by: 'web-search' },
]

describe('verifyAttribution', () => {
  it('detects orphaned citations', () => {
    const report: ReportCitation[] = [
      { paragraph: 'p', citations: [{ source_url: 'https://nope', page_number: 9 }] },
    ]
    const r = verifyAttribution(findings, report)
    expect(r.orphaned).toHaveLength(1)
    expect(r.orphaned[0]!.source_url).toBe('https://nope')
    expect(r.orphaned[0]!.paragraphIndex).toBe(0)
  })

  it('detects uncited paragraphs only in strict mode', () => {
    const report: ReportCitation[] = [
      { paragraph: 'uncited para', citations: [] },
    ]
    expect(verifyAttribution(findings, report).uncited).toHaveLength(0)
    expect(verifyAttribution(findings, report, { requireCitations: true }).uncited).toHaveLength(1)
  })

  it('passes a clean report', () => {
    const report: ReportCitation[] = [
      { paragraph: 'p1', citations: [{ source_url: 'https://example.com/doc', page_number: 1 }] },
      { paragraph: 'p2', citations: [{ source_url: 'https://example.com/solar', page_number: 1 }] },
    ]
    const r = verifyAttribution(findings, report, { requireCitations: true })
    expect(r.orphaned).toHaveLength(0)
    expect(r.uncited).toHaveLength(0)
  })
})

describe('assertAttribution', () => {
  it('throws on orphaned', () => {
    const report: ReportCitation[] = [
      { paragraph: 'p', citations: [{ source_url: 'https://nope', page_number: 9 }] },
    ]
    expect(() => assertAttribution(findings, report)).toThrow(/orphaned/)
  })

  it('throws on uncited only in strict mode', () => {
    const report: ReportCitation[] = [{ paragraph: 'x', citations: [] }]
    expect(() => assertAttribution(findings, report)).not.toThrow()
    expect(() => assertAttribution(findings, report, { requireCitations: true })).toThrow(/uncited/)
  })

  it('does not throw on a clean report', () => {
    const report: ReportCitation[] = [
      { paragraph: 'p1', citations: [{ source_url: 'https://example.com/doc', page_number: 1 }] },
    ]
    expect(() => assertAttribution(findings, report, { requireCitations: true })).not.toThrow()
  })
})