import { ClaudeSDKAgent } from '@mastra/claude'
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { DOCUMENT, SEARCH_RESULTS } from '../tools/fixtures'

// Model is backend-driven, not hardcoded: read ANTHROPIC_MODEL (the standard
// Claude Code env var). When unset, the SDK uses its default model resolution
// (real Anthropic via login/API key). Subagents omit `model` and inherit this.
const nativeModel = process.env.ANTHROPIC_MODEL

// Headless runs can't approve tool prompts. Bypass so the Agent tool and the
// subagents' MCP tools (search/read_page) execute without interactive prompts.
// Applied at both the coordinator and subagent level (subagents run their own
// tool-use loop and need their own permission grant).
const bypassPermissions = 'bypassPermissions' as const

// ---- Shared SDK MCP servers (registered at the coordinator level; subagents
//      access them via their scoped `tools` allowlist). ----

const readPageTool = tool(
  'read_page',
  'Read a specific page (1-6) from the renewable-energy document. Returns {page, title, content}.',
  { page_number: z.number().describe('Page number to read (1-6)') },
  async ({ page_number }) => {
    const page = DOCUMENT.find(p => p.page === page_number)
      ?? { page: page_number, title: 'Unknown', content: 'Page not found' }
    return { content: [{ type: 'text' as const, text: JSON.stringify(page) }] }
  },
)

const searchTool = tool(
  'search',
  'Search a cached web index for the query. Returns an array of {title, url, snippet}.',
  { query: z.string().describe('Search query') },
  async ({ query }) => {
    const q = query.toLowerCase()
    const hits = SEARCH_RESULTS.filter(
      r => r.snippet.toLowerCase().includes(q) || r.title.toLowerCase().includes(q),
    )
    return { content: [{ type: 'text' as const, text: JSON.stringify(hits.length > 0 ? hits : SEARCH_RESULTS) }] }
  },
)

const docsServer = createSdkMcpServer({ name: 'docs', version: '1.0.0', tools: [readPageTool] })
const searchServer = createSdkMcpServer({ name: 'search', version: '1.0.0', tools: [searchTool] })

// ---- Subagent definitions (the `agents` map). ----
// Per the Claude Agent SDK, `prompt` is the subagent's system prompt and `tools`
// scopes which tools it may call (inherited MCP servers are gated by this list).

const webSearchSubagent: AgentDefinition = {
  description:
    'Web research subagent. Searches a cached web index and returns structured Finding[] JSON. Invoke via the Agent tool with a prompt containing the research topic.',
  prompt: [
    'You are a web-research subagent. You will be given a research topic.',
    'Use the mcp__search__search tool to find relevant cached web results.',
    'Return ONLY a JSON array of Finding objects — no markdown, no prose. Each Finding has:',
    '{ "claim": string, "source_url": string, "document_name": string, "page_number": number, "confidence": number (0-1), "retrieved_by": "web-search" }.',
    'Rules:',
    '- source_url MUST be the result url from the search tool output.',
    '- document_name is the result title.',
    '- page_number is 1 for web results (no pagination).',
    '- confidence reflects how directly the snippet supports the claim (0.3-1.0).',
    '- Produce 3-6 findings; prefer claims directly supported by snippets.',
    '- Do not call any other tool. Do not wrap the JSON in code fences.',
  ].join('\n'),
  tools: ['mcp__search__search'],
  permissionMode: bypassPermissions,
}

const docAnalysisSubagent: AgentDefinition = {
  description:
    'Document-analysis subagent. Reads pages 1-6 of a fixed renewable-energy document via mcp__docs__read_page and returns structured Finding[] JSON. Invoke via the Agent tool with a prompt containing the research topic.',
  prompt: [
    'You are a document-analysis subagent. You will be given a research topic.',
    'Use the mcp__docs__read_page tool to read pages 1 through 6 of the document.',
    'Return ONLY a JSON array of Finding objects — no markdown, no prose. Each Finding has:',
    '{ "claim": string, "source_url": "https://example.com/doc", "document_name": "renewable-energy-report.pdf", "page_number": number (the page the claim came from), "confidence": number (0-1), "retrieved_by": "doc-analysis" }.',
    'Rules:',
    '- source_url is always "https://example.com/doc" (the fixed document URL).',
    '- page_number MUST be the page you read the claim from.',
    '- confidence reflects how directly the page text supports the claim (0.3-1.0).',
    '- Produce 4-8 findings across the pages; one per salient claim, attributed to the correct page.',
    '- Do not call any other tool. Do not wrap the JSON in code fences.',
  ].join('\n'),
  tools: ['mcp__docs__read_page'],
  permissionMode: bypassPermissions,
}

const synthesisSubagent: AgentDefinition = {
  description:
    'Synthesis subagent. Given the FULL combined Findings array (with all metadata), writes a cited research report as ReportCitation[] JSON. Invoke via the Agent tool with a prompt containing the findings JSON.',
  prompt: [
    'You are a synthesis subagent. You will be given a JSON array of Finding objects (each has claim, source_url, document_name, page_number, confidence, retrieved_by).',
    'Write a research report that attributes every claim. Return ONLY a JSON array of ReportCitation objects — no markdown, no prose. Each ReportCitation has:',
    '{ "paragraph": string, "citations": [{ "source_url": string, "page_number": number }] }.',
    'Rules:',
    '- Every paragraph MUST contain at least one citation. A paragraph with zero citations is forbidden.',
    '- Every factual claim in a paragraph must be backed by a citation whose source_url+page_number appears in the provided findings.',
    '- Use multiple citations per paragraph when the paragraph draws on multiple findings.',
    '- Do NOT invent source URLs or page numbers — only cite findings you were given.',
    '- Do not call any tool. Do not wrap the JSON in code fences.',
  ].join('\n'),
  // Explicitly scoped to no tools (omitting `tools` would inherit the parent's ['Agent']).
  tools: [],
  permissionMode: bypassPermissions,
}

// ---- Coordinator system prompt — encodes the exercise pattern: spawn the two
//      research subagents via parallel Agent tool calls in a single response,
//      then pass the FULL findings (all metadata preserved) to synthesis. ----

const coordinatorSystemPrompt = [
  'You are a research coordinator. You have exactly one tool: the Agent tool, which spawns a named subagent.',
  '',
  'For a given research topic, execute the following procedure EXACTLY:',
  '',
  'STEP 1 — Parallel research. In your VERY FIRST response, invoke the Agent tool TWICE in the SAME response (two parallel tool calls):',
  '  - One call with agent_name="web-search" and a prompt containing the research topic.',
  '  - One call with agent_name="doc-analysis" and a prompt containing the research topic.',
  'Do NOT wait for one to finish before issuing the other — both Agent tool calls MUST appear in the same assistant turn.',
  '',
  'STEP 2 — Collect findings. Each subagent returns a JSON array of Finding objects. After both calls return, concatenate the two arrays into one combined findings array. Do NOT strip any metadata fields (claim, source_url, document_name, page_number, confidence, retrieved_by must all be preserved).',
  '',
  'STEP 3 — Synthesis. Invoke the Agent tool a THIRD time with agent_name="synthesis", passing the FULL combined findings array (all metadata intact) in the prompt. The synthesis subagent will return a JSON array of ReportCitation objects.',
  '',
  'STEP 4 — Final output. Return a single JSON object with EXACTLY this shape:',
  '{',
  '  "report": <ReportCitation[] — the synthesis subagent\'s output>,',
  '  "findings": <Finding[] — the combined findings array from STEP 2>',
  '}',
  'No markdown, no code fences, no prose outside the JSON object.',
  '',
  'CRITICAL: returning BOTH "report" and "findings" in the final JSON object is required — the orchestrator needs the findings to verify attribution.',
].join('\n')

export const nativeCoordinatorAgent = new ClaudeSDKAgent({
  id: 'native-coordinator',
  name: 'Native SDK Coordinator',
  description:
    'Claude Agent SDK coordinator that spawns web-search, doc-analysis, and synthesis subagents via the built-in Agent tool.',
  sdkOptions: {
    // Backend-driven: omit when unset so the SDK uses its default (real Anthropic).
    ...(nativeModel ? { model: nativeModel } : {}),
    cwd: process.cwd(),
    permissionMode: bypassPermissions,
    systemPrompt: coordinatorSystemPrompt,
    allowedTools: ['Agent'],
    agents: {
      'web-search': webSearchSubagent,
      'doc-analysis': docAnalysisSubagent,
      synthesis: synthesisSubagent,
    },
    mcpServers: {
      search: searchServer,
      docs: docsServer,
    },
  },
})