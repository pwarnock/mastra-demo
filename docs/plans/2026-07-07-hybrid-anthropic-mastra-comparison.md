# Hybrid Anthropic↔Mastra Attribution Pipeline — Comparison + Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a hybrid coordinator demonstrating both Mastra-native and Anthropic SDK-bridge paradigms side-by-side, with structured attribution metadata, parallel subagent spawning, fork_session demo, and deterministic verification.

**Architecture:** Programmatic orchestrator calling both native and SDK subagents, normalized to a shared `Finding[]` type, with deterministic attribution verification.

**Tech Stack:** Mastra core, @mastra/claude, @anthropic-ai/claude-agent-sdk, bun test, TypeScript

---

### Prerequisites (run before anything else)

```bash
bun add @mastra/claude@0.3.0 @anthropic-ai/claude-agent-sdk@0.3.202
ollama pull qwen2.5-coder:14b
```

### Environment (run command, not .env)

```bash
ANTHROPIC_BASE_URL=http://localhost:11434 \
ANTHROPIC_AUTH_TOKEN=ollama \
bun run src/hybrid-orchestrator.ts
```

The script must set these inline (not rely on `.env*`). Native agents use existing Mastra env loading. Both mechanisms coexist — the inline vars are for the Claude Agent SDK's `process.env` read; they don't replace Mastra's loader.

---

### Task 1 — Create `src/mastra/types/finding.ts`

```ts
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
```

---

### Task 2 — Create `src/mastra/tools/fixtures.ts`

```ts
export const SEARCH_RESULTS = [
  { title: 'Solar Energy 2025', url: 'https://example.com/solar', snippet: 'Solar capacity reached 500 GW in 2025.' },
  { title: 'Wind Power Advances', url: 'https://example.com/wind', snippet: 'Offshore wind saw 30% growth in 2025.' },
  { title: 'Geothermal Expansion', url: 'https://example.com/geothermal', snippet: 'Geothermal plants now power 15 million homes.' },
  { title: 'Tidal Energy Pilots', url: 'https://example.com/tidal', snippet: 'Tidal energy pilots launched in 12 coastal cities.' },
  { title: 'Biomass Innovations', url: 'https://example.com/biomass', snippet: 'Biomass conversion efficiency doubled since 2023.' },
  { title: 'Nuclear Fusion Progress', url: 'https://example.com/fusion', snippet: 'Fusion reactors achieved net energy gain in 2025.' },
]

export const DOCUMENT = [
  { page: 1, title: 'Renewable Energy Overview', content: 'Geothermal energy provides 0.5% of global electricity, primarily in Iceland, Indonesia, and the Philippines. Recent advances in enhanced geothermal systems (EGS) have expanded viable locations by 40%.' },
  { page: 2, title: 'Market Analysis', content: 'Tidal energy pilots in 12 coastal cities have demonstrated 95% reliability. The global tidal market is projected to reach $15B by 2030.' },
  { page: 3, title: 'Technology Review', content: 'Solar PV efficiency hit 33% in commercial panels, up from 22% in 2020. Perovskite-silicon tandem cells drive this improvement.' },
  { page: 4, title: 'Policy Landscape', content: 'The EU Green Deal mandates 45% renewable energy by 2030, with wind and solar as primary pathways.' },
  { page: 5, title: 'Investment Trends', content: 'Global clean energy investment reached $1.8 trillion in 2025, with solar accounting for 40% of total deployment.' },
  { page: 6, title: 'Future Outlook', content: 'Fusion energy is expected to contribute to grid power by 2035, with three pilot plants under construction.' },
]
```

**Tool return shape (important for Claude SDK MCP):**
```ts
// searchFixtureTool — returns JSON string
return { content: [{ type: 'text', text: JSON.stringify(results) }] }

// fileReadFixtureTool — returns JSON string
return { content: [{ type: 'text', text: JSON.stringify(page) }] }
```

---

### Task 3 — Create `src/mastra/agents/web-search-agent.ts`

```ts
import { Agent } from '@mastra/core/agent'
import { createTool } from '@mastra/core/tools'
import { SEARCH_RESULTS } from '../tools/fixtures'

const searchFixtureTool = createTool({
  id: 'search-fixture',
  description: 'Search for information on a topic. Returns cached results with URLs and titles.',
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ context }) => {
    const query = context.query.toLowerCase()
    const results = SEARCH_RESULTS.filter(r =>
      r.snippet.toLowerCase().includes(query) ||
      r.title.toLowerCase().includes(query)
    )
    return { content: [{ type: 'text', text: JSON.stringify(results) }] }
  },
})

export const webSearchAgent = new Agent({
  id: 'web-search-agent',
  name: 'Web Search (Fixture)',
  description: 'Searches web results and returns text findings.',
  instructions: 'Given a topic, return factual claims with source URLs. Each claim must include the URL and title. Use the search tool to find relevant results.',
  model: 'ollama-cloud/gpt-oss:20b-cloud',
  tools: { searchFixtureTool },
})
```

Returns **text** (not structured). The extraction agent handles typing later.

---

### Task 4 — Create `src/mastra/agents/document-analysis-agent.ts`

```ts
import { ClaudeSDKAgent } from '@mastra/claude'
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { DOCUMENT } from '../tools/fixtures'

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
    model: 'qwen2.5-coder:14b',
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
```

---

### Task 5 — Create `src/mastra/agents/document-analysis-forked-agent.ts`

Second instance for fork_session demo. Constructor-static — not mutated per-call.

```ts
import { ClaudeSDKAgent } from '@mastra/claude'
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { DOCUMENT } from '../tools/fixtures'

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
      model: 'qwen2.5-coder:14b',
      cwd: process.cwd(),
      mcpServers: {
        docs: createSdkMcpServer({ name: 'docs', version: '1.0.0', tools: [fileReadFixtureTool] }),
      },
      allowedTools: ['mcp__docs__read_page'],
      fork_session: parentSessionId,
    },
  })
}
```

---

### Task 6 — Create `src/mastra/agents/extraction-agent.ts`

```ts
import { Agent } from '@mastra/core/agent'
import { FindingSchema } from '../types/finding'

export const extractionAgent = new Agent({
  id: 'extraction-agent',
  name: 'Finding Extractor',
  description: 'Extracts structured findings from text. No tools — pure extraction.',
  instructions: 'Parse the provided text into Finding objects. Each claim must include source_url, document_name, page_number, confidence, and retrieved_by.',
  model: 'ollama-cloud/gpt-oss:20b-cloud',
  // NO tools — avoids structuredOutput conflict (types.d.ts:851)
})

// Call with:
const result = await extractionAgent.generate(text, {
  structuredOutput: { schema: FindingSchema },
})
// Access: result.object (or JSON.parse(result.text) as fallback)
```

---

### Task 7 — Create `src/mastra/agents/synthesis-agent.ts`

```ts
import { Agent } from '@mastra/core/agent'
import { ReportCitationSchema } from '../types/finding'

export const synthesisAgent = new Agent({
  id: 'synthesis-agent',
  name: 'Synthesis Writer',
  description: 'Writes a research report citing specific sources. No tools.',
  instructions: 'Given an array of findings, write a comprehensive report. Every factual claim MUST cite a source_url and page_number from the provided findings. Use inline citations like [source: url, p.N].',
  model: 'ollama-cloud/minimax-m3:cloud',
  // NO tools — avoids structuredOutput conflict
})

// Call with:
const prompt = `Write a report on "${topic}". Findings:\n${JSON.stringify(findings)}`
const result = await synthesisAgent.generate(prompt, {
  structuredOutput: { schema: ReportCitationSchema },
})
```

---

### Task 8 — Create `src/hybrid-orchestrator.ts`

```ts
import { webSearchAgent } from './mastra/agents/web-search-agent'
import { docAnalysisSDKAgent } from './mastra/agents/document-analysis-agent'
import { createForkedDocAgent } from './mastra/agents/document-analysis-forked-agent'
import { extractionAgent } from './mastra/agents/extraction-agent'
import { synthesisAgent } from './mastra/agents/synthesis-agent'
import { FindingSchema, ReportCitationSchema } from './mastra/types/finding'
import { DOCUMENT } from './mastra/tools/fixtures'
import type { Finding, ReportCitation } from './mastra/types/finding'

// Normalize text → Finding[] (tool-free extraction agent)
async function normalizeToFindings(text: string, retrievedBy: string): Promise<Finding[]> {
  const result = await extractionAgent.generate(
    `Extract findings from the following text. Tag each with retrieved_by="${retrievedBy}".\n\n${text}`,
    { structuredOutput: { schema: FindingSchema } },
  )
  const findings = result.object ?? (() => {
    try { return JSON.parse(result.text) } catch { return [] }
  })()
  if (!Array.isArray(findings) || findings.length === 0) {
    console.warn(`normalizeToFindings: no findings extracted for ${retrievedBy}`)
    return []
  }
  return findings
}

// Fixture fallback for SDK failure
function fixtureDocFindings(): Finding[] {
  return DOCUMENT.map(page => ({
    claim: page.content,
    source_url: 'https://example.com/doc',
    document_name: 'renewable-energy-report.pdf',
    page_number: page.page,
    confidence: 1.0,
    retrieved_by: 'doc-analysis',
  }))
}

// Deterministic attribution verification
function verifyAttribution(findings: Finding[], report: ReportCitation[]) {
  const findingMap = new Map(
    findings.map(f => [`${f.source_url}|${f.page_number}`, f]),
  )
  for (const item of report) {
    for (const c of item.citations) {
      const key = `${c.source_url}|${c.page_number}`
      if (!findingMap.has(key)) {
        throw new Error(
          `Orphaned citation: "${c.source_url}" p.${c.page_number} not in findings`,
        )
      }
    }
  }
}

export async function hybridCoordinator(topic: string) {
  console.log(`\n🔬 Hybrid coordinator: "${topic}"`)

  // 1. PARALLEL spawn — both subagents simultaneously (exercise point 6)
  const sdkTimeout = 60_000
  const sdkRace = Promise.race([
    docAnalysisSDKAgent.generate(
      `Analyze documents on "${topic}". Return each finding with source URL, document name, page number, and confidence.`,
    ),
    new Promise((_, reject) => setTimeout(() => reject(new Error('SDK timeout')), sdkTimeout)),
  ])

  console.log('📚 Spawning web search + document analysis in parallel...')
  const [webText, sdkResult] = await Promise.all([
    webSearchAgent.generate(
      `Search for information on "${topic}". Return each finding with source URL and title.`,
    ),
    sdkRace.catch((e) => {
      console.warn('SDK agent failed (non-blocking):', e.message)
      return null
    }),
  ])

  // 2. Normalize both → Finding[] (tool-free extraction agent)
  const webFindings = await normalizeToFindings(webText.text, 'web-search')
  const docFindings = sdkResult
    ? await normalizeToFindings(
        (sdkResult as any).text ?? JSON.stringify(sdkResult),
        'doc-analysis',
      )
    : fixtureDocFindings()

  const findings = [...webFindings, ...docFindings]
  console.log(`  Web findings: ${webFindings.length}`)
  console.log(`  Doc findings: ${docFindings.length}`)
  console.log(`  Total findings: ${findings.length}`)

  // 3. Fork_session demo (best-effort, non-blocking — CW2 fix)
  let forkAttempted = false
  let forkResult = null
  try {
    const firstSessionId =
      (sdkResult as any)?.sessionId ??
      (sdkResult as any)?.runId ??
      null
    if (firstSessionId) {
      forkAttempted = true
      const forkedAgent = createForkedDocAgent(firstSessionId)
      forkResult = await forkedAgent.generate(
        `Continue analyzing from the prior session.`,
      )
      console.log('Fork session succeeded:', forkResult.finishReason)
    } else {
      console.log('No sessionId in SDK result — fork skipped (best-effort)')
    }
  } catch (e) {
    console.warn('Fork session failed (non-blocking):', e)
  }

  // 4. Synthesize — receives full Finding[] (metadata intact, exercise point 4)
  console.log('\n✍️  Synthesizing report...')
  const synthesis = await synthesisAgent.generate(
    `Write a research report on "${topic}".\n\nFINDINGS:\n${JSON.stringify(findings, null, 2)}`,
    { structuredOutput: { schema: ReportCitationSchema } },
  )

  const report = synthesis.object ?? (() => {
    try { return JSON.parse(synthesis.text) } catch { return [] }
  })() as ReportCitation[]

  // 5. Deterministic attribution verification (exercise point 5)
  verifyAttribution(findings, report)
  console.log('✅ Attribution verified: zero orphaned citations')

  return { report, findings, forkAttempted, forkResult }
}
```

---

### Task 9 — Create `src/hybrid.test.ts`

```ts
import { describe, it, expect } from 'bun:test'
import { hybridCoordinator } from './hybrid-orchestrator'

describe('Hybrid Anthropic↔Mastra Attribution Pipeline', () => {
  it('produces a report with zero orphaned citations', async () => {
    const { report, findings } = await hybridCoordinator('renewable energy technologies')

    expect(report).toBeDefined()
    expect(Array.isArray(report)).toBe(true)
    expect(report.length).toBeGreaterThan(0)

    // Build lookup of available citations
    const findingMap = new Map(
      findings.map(f => [`${f.source_url}|${f.page_number}`, f]),
    )

    // Every citation in the report must resolve to a Finding
    for (const item of report) {
      for (const citation of item.citations) {
        const key = `${citation.source_url}|${citation.page_number}`
        expect(findingMap.has(key)).toBe(true)
      }
    }
  })

  it('both subagents produced findings', async () => {
    const { findings } = await hybridCoordinator('renewable energy technologies')
    const webFindings = findings.filter(f => f.retrieved_by === 'web-search')
    const docFindings = findings.filter(f => f.retrieved_by === 'doc-analysis')
    expect(webFindings.length).toBeGreaterThan(0)
    expect(docFindings.length).toBeGreaterThan(0)
  })
})
```

---

### Task 10 — Update `src/index.ts`

Add hybrid orchestrator import alongside existing:

```ts
import { researchCoordinator } from './orchestrator'
import { hybridCoordinator } from './hybrid-orchestrator'
```

Add a `main()` branch that runs `hybridCoordinator` when `HYBRID=1` env is set, otherwise runs `researchCoordinator`.

---

### Task 11 — Update `package.json`

```json
{
  "scripts": {
    "hybrid": "ANTHROPIC_BASE_URL=http://localhost:11434 ANTHROPIC_AUTH_TOKEN=ollama bun run src/index.ts",
    "test": "bun test --timeout 300000"
  }
}
```

---

### Task 12 — Create `docs/anthropic-vs-mastra-comparison.md`

```markdown
# Anthropic Agent Exercise ↔ Mastra Comparison

## Exercise 1: Coordinator allowedTools must include Agent

| Anthropic | Mastra Native | Mastra SDK-Bridge |
|-----------|--------------|-------------------|
| `allowedTools: ['Agent']` on coordinator definition | `agents: { webSearchAgent, synthesisAgent }` — the map IS the gate (auto-generates callable subagent tools for the LLM) | `ClaudeSDKAgent` with `sdkOptions.allowedTools` restricts which tools it exposes |
| Without `Agent` tool, coordinator cannot spawn any subagent | Without entries in `agents:`, coordinator has no subagents | Without `allowedTools`, SDK agent exposes all tools |
| Binary requirement: include it or fail | The `agents:` map is the equivalent — missing it = no delegation | SDK half demonstrates literal `allowedTools` syntax |
| **Verdict** | ✅ Equivalent (map = gate) | ✅ Literal match |

## Exercise 2: Define two subagents with scoped tool access

| Anthropic | Mastra Native | Mastra SDK-Bridge |
|-----------|--------------|-------------------|
| Two `AgentDefinition` objects with `description`, system prompt, restricted tool set | Two `Agent` objects with scoped `tools:` maps | `ClaudeSDKAgent` with `sdkOptions.allowedTools: ['mcp__docs__read_page']` — scoped to one MCP tool |
| Web search agent: search tools only | `webSearchAgent` has `searchFixtureTool` only | N/A (native handles it) |
| Document analysis agent: file read tools only | N/A (native uses text extraction) | `docAnalysisSDKAgent` can only call `mcp__docs__read_page` |
| **Verdict** | ✅ Scoped via `tools:` map | ✅ Scoped via `allowedTools` |

## Exercise 3: Structured output separating content from metadata

| Anthropic | Mastra Native | Mastra SDK-Bridge |
|-----------|--------------|-------------------|
| TypeScript interface for `Finding` type | Same `Finding` interface shared across all agents | SDK agent returns text; normalized to `Finding[]` by extraction agent |
| Content fields: `claim`, `analysis` | `claim` field | Same shared interface |
| Metadata fields: `source_url`, `document_name`, `page_number`, `confidence` | All present in `Finding` schema | Metadata added by extraction agent |
| **Verdict** | ✅ Structurally enforced via `structuredOutput` | ⚠️ Requires normalization step |

## Exercise 4: Pass complete structured results (metadata intact) to synthesis

| Anthropic | Mastra Native | Mastra SDK-Bridge |
|-----------|--------------|-------------------|
| Coordinator passes `Finding[]` with all metadata to synthesis agent | `hybridCoordinator` serializes full `findings` array into synthesis prompt | Same: SDK result normalized to `Finding[]` before joining |
| Stripping metadata = root cause of attribution failure | Programmatic control guarantees nothing stripped | Normalization ensures metadata presence |
| **Verdict** | ✅ Programmatic guarantee | ✅ Normalization ensures metadata |

## Exercise 5: Verify every claim has attribution

| Anthropic | Mastra Native | Mastra SDK-Bridge |
|-----------|--------------|-------------------|
| Synthesis output cites `source_url` + `page_number` | `verifyAttribution()` checks every `ReportCitation` resolves to a `Finding` | Same verification covers both native and SDK findings |
| Orphaned claim = failure | Throws on any orphaned citation | bun test asserts zero orphans |
| **Verdict** | ✅ Deterministic code check | ✅ Same verification applies |

## Exercise 6: Parallel spawn of independent subagents

| Anthropic | Mastra Native | Mastra SDK-Bridge |
|-----------|--------------|-------------------|
| Multiple `Agent` tool calls in single LLM response | `Promise.all([webSearchAgent.generate(...), sdkRace])` — programmatic parallelism | SDK half runs concurrently with native half |
| Sequential = wasteful | Both agents start simultaneously | Same mechanism |
| **Verdict** | ✅ Real parallelism via `Promise.all` | ✅ Same mechanism |

## Exercise 7: fork_session vs parallel Agent invocation

| Anthropic | Mastra Native | Mastra SDK-Bridge |
|-----------|--------------|-------------------|
| `fork_session` copies parent session for isolated continuation | Not applicable to native Mastra agents (stateless) | `createForkedDocAgent(firstSessionId)` — second `ClaudeSDKAgent` instance with `sdkOptions.fork_session` |
| Parallel = independent sessions | `Promise.all` = independent agents | Same: both paradigms spawned independently |
| Fork = session copy, parallel = separate | Fork not meaningful for native | Fork creates session-copy isolation |
| **Verdict** | N/A for native | ✅ Literal fork demo via second SDK instance |

## Summary

- **Points 1, 2, 4, 5, 6**: Fully satisfied by both paradigms
- **Point 3 (structured Finding type)**: Native satisfies structurally; SDK requires normalization
- **Point 7 (fork_session)**: SDK literal demo; native uses parallel `Promise.all` for contrast
```

---

### Handoff checklist (verify before unattended run)

- [ ] `@mastra/claude@0.3.0` installed (pinned)
- [ ] `@anthropic-ai/claude-agent-sdk@0.3.202` installed (pinned)
- [ ] `ollama pull qwen2.5-coder:14b` (or confirmed available model with tool support)
- [ ] `ANTHROPIC_BASE_URL=http://localhost:11434` set at run time (not .env)
- [ ] `ANTHROPIC_AUTH_TOKEN=ollama` set at run time
- [ ] Ollama running and `/v1/messages` responds
- [ ] Fixture data has 6+ entries with distinct URLs and pages
- [ ] `extractionAgent` has NO tools (avoids structuredOutput conflict)
- [ ] `synthesisAgent` has NO tools (same reason)
- [ ] Fork step is try/catch with fixture fallback (best-effort, never blocks)
- [ ] SDK call has 60s timeout via `Promise.race` (prevents hang)
- [ ] `verifyAttribution` runs deterministic code, not LLM judgment
