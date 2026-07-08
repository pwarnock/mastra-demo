import { Agent } from '@mastra/core/agent'
import { FindingSchema } from '../types/finding'
import { MODELS } from '../models'

export const extractionAgent = new Agent({
  id: 'extraction-agent',
  name: 'Finding Extractor',
  description: 'Extracts structured findings from text. No tools — pure extraction.',
  instructions: 'You are a JSON extraction engine. Given text, return a JSON array of Finding objects. Each object must have: claim (string), source_url (string), document_name (string), page_number (number), confidence (number 0-1), retrieved_by ("web-search" or "doc-analysis"). Return ONLY the JSON array. No markdown, no explanation, no tables.',
  model: MODELS.extraction,
})

// Call with:
// const result = await extractionAgent.generate(text, {
//   structuredOutput: { schema: FindingSchema },
// })
// Access: result.object (or JSON.parse(result.text) as fallback)
