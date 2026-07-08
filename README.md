# mastra-signals-demo

A multi-paradigm research pipeline demo built with [Mastra](https://mastra.ai) and the [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk). Compares three orchestration approaches for multi-agent research systems, plus a beginner-friendly signal methods demo.

## Project Structure

```
src/
├── index.ts                          # CLI entrypoint
├── orchestrator.ts                   # Default hub-and-spoke (Mastra-native agents)
├── hybrid-orchestrator.ts            # Hybrid Mastra + Claude SDK bridge
├── native-orchestrator.ts            # Pure Claude SDK coordinator
├── signals-demo.ts                   # Standalone signals demo
├── mastra/
│   ├── index.ts                      # Mastra instance setup
│   ├── models.ts                     # Model registry
│   ├── agents/                       # All agent definitions
│   │   ├── research-agent.ts
│   │   ├── writing-agent.ts
│   │   ├── web-search-agent.ts
│   │   ├── extraction-agent.ts
│   │   ├── synthesis-agent.ts
│   │   ├── supervisor-agent.ts
│   │   ├── document-analysis-agent.ts
│   │   ├── document-analysis-forked-agent.ts
│   │   └── native-coordinator-agent.ts
│   ├── lib/attribution.ts            # Citation verification utilities
│   ├── scorers/task-complete-scorer.ts
│   ├── tools/fixtures.ts             # Test fixture data
│   └── types/finding.ts              # Shared types & Zod schemas
├── *.test.ts                         # Tests for each orchestrator + attribution + signals
infra/                                # Azure AI Foundry deployment (Kimi-K2.6)
docs/                                 # Plans and comparison write-up
```

## Orchestration Modes

Set `MODE` env var (or `HYBRID=1` as legacy alias) to select the pipeline:

| Mode | Description | Agents | Verification |
|------|-------------|--------|-------------|
| `default` | Programmatic hub-and-spoke — decompose topic, research sequentially, evaluate coverage, refine | `researchAgent`, `writingAgent` | Coverage ratio |
| `hybrid` | Parallel Mastra-native + Claude SDK bridge, normalized to shared schema | `webSearchAgent`, `docAnalysisSDKAgent`, `extractionAgent`, `synthesisAgent` | Attribution (orphan check) |
| `native` | Single Claude SDK agent spawning subagents via parallel `Agent` tool calls | `nativeCoordinatorAgent` (with 3 subagent defs) | Attribution (orphan + uncited, strict) |

## Quick Start

```bash
# Signals demo (standalone, requires OPENAI_API_KEY)
bun start

# Default hub-and-spoke (requires Anthropic-compatible backend)
bun run dev --topic="renewable energy"

# Hybrid pipeline
bun run hybrid --topic="renewable energy"

# Native SDK pipeline
bun run native --topic="renewable energy"
```

## Tests

```bash
bun test --timeout 300000 --verbose
```

All tests use fixture data (no external search APIs) with optional real LLM backend. Backend-gated tests skip gracefully when not configured.

## Requirements

- [Bun](https://bun.sh) runtime
- An LLM backend (Anthropic API, Ollama, or OpenAI-compatible) configured via env vars
- `OPENAI_API_KEY` for the signals demo
