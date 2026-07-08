import type { Finding, ReportCitation } from '../types/finding'

export interface AttributionResult {
  /** Citations whose source_url+page_number do not match any finding. */
  orphaned: Array<{ source_url: string; page_number: number; paragraphIndex: number }>
  /** Report paragraphs with zero citations (only populated in strict mode). */
  uncited: Array<{ paragraphIndex: number; paragraph: string }>
}

export interface AttributionOptions {
  /** When true, report paragraphs with zero citations are flagged as `uncited`. */
  requireCitations?: boolean
}

/**
 * Verify that every citation in the report maps back to a finding, and (optionally)
 * that every report paragraph carries at least one citation. Pure — no side effects.
 */
export function verifyAttribution(
  findings: Finding[],
  report: ReportCitation[],
  opts?: AttributionOptions,
): AttributionResult {
  const findingKeys = new Set(
    findings.map(f => `${f.source_url}|${f.page_number}`),
  )

  const orphaned: AttributionResult['orphaned'] = []
  const uncited: AttributionResult['uncited'] = []

  report.forEach((item, paragraphIndex) => {
    if (opts?.requireCitations && item.citations.length === 0) {
      uncited.push({ paragraphIndex, paragraph: item.paragraph })
    }
    for (const c of item.citations) {
      if (!findingKeys.has(`${c.source_url}|${c.page_number}`)) {
        orphaned.push({
          source_url: c.source_url,
          page_number: c.page_number,
          paragraphIndex,
        })
      }
    }
  })

  return { orphaned, uncited }
}

/**
 * Throwing wrapper over {@link verifyAttribution}. Throws if any orphaned
 * citation (or, in strict mode, any uncited paragraph) is found.
 */
export function assertAttribution(
  findings: Finding[],
  report: ReportCitation[],
  opts?: AttributionOptions,
): void {
  const { orphaned, uncited } = verifyAttribution(findings, report, opts)
  if (orphaned.length === 0 && uncited.length === 0) return

  const firstOrphaned = orphaned[0]
  const firstUncited = uncited[0]
  throw new Error(
    `Attribution failed: ${orphaned.length} orphaned citation(s), ${uncited.length} uncited paragraph(s).` +
      (firstOrphaned
        ? ` First orphaned: ${firstOrphaned.source_url} p.${firstOrphaned.page_number} (paragraph ${firstOrphaned.paragraphIndex}).`
        : '') +
      (firstUncited
        ? ` First uncited paragraph ${firstUncited.paragraphIndex}: "${firstUncited.paragraph.slice(0, 80)}".`
        : ''),
  )
}