import { ClaudeSDKAgent } from '@mastra/claude'
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { DOCUMENT } from '../tools/fixtures'
import { MODELS } from '../models'

const fileReadFixtureTool = tool(
  'read_page',
  'Read a specific page from the document. Returns page content with title and page number.',
  { page_number: z.number().describe('The page number to read (1-6)') },
  async ({ page_number }) => {
    const page = DOCUMENT.find(p => p.page === page_number) ?? { page: page_number, title: 'Unknown', content: 'Page not found' }
    return { content: [{ type: 'text', text: JSON.stringify(page) }] }
  },
)

export const docAnalysisSDKAgent = new ClaudeSDKAgent({
  id: 'doc-analysis-sdk',
  name: 'Document Analysis (Claude SDK)',
  description: 'Analyzes documents with page references via Anthropic SDK.',
  sdkOptions: {
    model: MODELS.sdk,
    cwd: process.cwd(),
    mcpServers: {
      docs: createSdkMcpServer({
        name: 'docs',
        version: '1.0.0',
        tools: [fileReadFixtureTool],
      }),
    },
    allowedTools: ['mcp__docs__read_page'],
  },
})
