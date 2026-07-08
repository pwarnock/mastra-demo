import { Agent } from '@mastra/core/agent'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { SEARCH_RESULTS } from '../tools/fixtures'
import { MODELS } from '../models'

const searchFixtureTool = createTool({
  id: 'search-fixture',
  description: 'Search for information on a topic. Returns cached results with URLs and titles.',
  inputSchema: z.object({ query: z.string() }),
  execute: async (input) => {
    const query = input.query.toLowerCase()
    const results = SEARCH_RESULTS.filter(r =>
      r.snippet.toLowerCase().includes(query) ||
      r.title.toLowerCase().includes(query)
    )
    return { content: [{ type: 'text', text: JSON.stringify(results.length > 0 ? results : SEARCH_RESULTS) }] }
  },
})

export const webSearchAgent = new Agent({
  id: 'web-search-agent',
  name: 'Web Search (Fixture)',
  description: 'Searches web results and returns text findings.',
  instructions: 'Given a topic, return factual claims with source URLs. Each claim must include the URL and title. Use the search tool to find relevant results.',
  model: MODELS.search,
  tools: { 'search-fixture': searchFixtureTool },
})
