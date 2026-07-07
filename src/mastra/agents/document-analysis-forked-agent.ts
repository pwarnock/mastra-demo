import { ClaudeSDKAgent } from '@mastra/claude'
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { DOCUMENT } from '../tools/fixtures'
import { MODELS } from '../models'

const fileReadFixtureTool = tool(
  'read_page',
  'Read a specific page from the document.',
  { page_number: z.number().describe('The page number to read (1-6)') },
  async ({ page_number }) => {
    const page = DOCUMENT.find(p => p.page === page_number) ?? { page: page_number, title: 'Unknown', content: 'Page not found' }
    return { content: [{ type: 'text', text: JSON.stringify(page) }] }
  },
)

export function createForkedDocAgent(parentSessionId: string) {
  return new ClaudeSDKAgent({
    id: 'doc-analysis-forked',
    name: 'Document Analysis (Forked)',
    description: 'Forked continuation from a prior document analysis session.',
    sdkOptions: {
      model: MODELS.sdk,
      cwd: process.cwd(),
      mcpServers: {
        docs: createSdkMcpServer({ name: 'docs', version: '1.0.0', tools: [fileReadFixtureTool] }),
      },
      allowedTools: ['mcp__docs__read_page'],
      resume: parentSessionId,
      forkSession: true,
    },
  })
}
