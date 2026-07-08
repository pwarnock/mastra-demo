import { z } from 'zod'

export interface Finding {
  claim: string
  source_url: string
  document_name: string
  page_number: number
  confidence: number
  retrieved_by: 'web-search' | 'doc-analysis'
}

export interface ReportCitation {
  paragraph: string
  citations: Array<{ source_url: string; page_number: number }>
}

export const FindingSchema = z.array(z.object({
  claim: z.string(),
  source_url: z.string(),
  document_name: z.string(),
  page_number: z.number(),
  confidence: z.number().min(0).max(1),
  retrieved_by: z.enum(['web-search', 'doc-analysis']),
}))

export const ReportCitationSchema = z.array(z.object({
  paragraph: z.string(),
  citations: z.array(z.object({
    source_url: z.string(),
    page_number: z.number(),
  })),
}))
