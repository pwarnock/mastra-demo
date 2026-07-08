import { ClaudeSDKAgent } from '@mastra/claude'
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { DOCUMENT } from '../tools/fixtures'

// Backend-driven model (standard Claude Code env var). Omit when unset so the
// SDK uses its default model resolution (real Anthropic via login/API key).
const docModel = process.env.ANTHROPIC_MODEL

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
    ...(docModel ? { model: docModel } : {}),
    cwd: process.cwd(),
    systemPrompt: [
      'You are a document-analysis agent. Use the mcp__docs__read_page tool to read pages 1-6 of the renewable-energy document.',
      'For each page, extract salient factual claims. Return ONLY a JSON array of Finding objects:',
      '{ "claim": string, "source_url": "https://example.com/doc", "document_name": "renewable-energy-report.pdf", "page_number": number, "confidence": number (0-1), "retrieved_by": "doc-analysis" }.',
      'Do not wrap the JSON in code fences. Do not include prose.',
    ].join('\n'),
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
