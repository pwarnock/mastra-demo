import { Agent } from '@mastra/core/agent'
import { ReportCitationSchema } from '../types/finding'
import { MODELS } from '../models'

export const synthesisAgent = new Agent({
  id: 'synthesis-agent',
  name: 'Synthesis Writer',
  description: 'Writes a research report citing specific sources. No tools.',
  instructions: 'You are a JSON report writer. Given an array of findings, return a JSON array where each object has: paragraph (a paragraph citing findings) and citations (array of {source_url, page_number} used). Every factual claim MUST cite a source. Return ONLY the JSON array. No markdown, no explanation.',
  model: MODELS.synthesis,
})

// Call with:
// const prompt = `Write a report on "${topic}". Findings:\n${JSON.stringify(findings)}`
// const result = await synthesisAgent.generate(prompt, {
//   structuredOutput: { schema: ReportCitationSchema },
// })
