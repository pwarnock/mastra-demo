import { ClaudeSDKAgent } from '@mastra/claude'
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { DOCUMENT } from '../tools/fixtures'

// Backend-driven model (standard Claude Code env var). Omit when unset so the
// SDK uses its default model resolution (real Anthropic via login/API key).
const docModel = process.env.ANTHROPIC_MODEL

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
      ...(docModel ? { model: docModel } : {}),
      cwd: process.cwd(),
      systemPrompt: [
        'You are a forked continuation of a document-analysis session. Continue reading pages with mcp__docs__read_page and extracting findings.',
        'Return ONLY a JSON array of Finding objects with the same shape:',
        '{ "claim": string, "source_url": "https://example.com/doc", "document_name": "renewable-energy-report.pdf", "page_number": number, "confidence": number (0-1), "retrieved_by": "doc-analysis" }.',
        'No code fences, no prose.',
      ].join('\n'),
      mcpServers: {
        docs: createSdkMcpServer({ name: 'docs', version: '1.0.0', tools: [fileReadFixtureTool] }),
      },
      allowedTools: ['mcp__docs__read_page'],
      resume: parentSessionId,
      forkSession: true,
    },
  })
}
