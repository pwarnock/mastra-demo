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
| `fork_session` copies parent session for isolated continuation | Not applicable to native Mastra agents (stateless) | `createForkedDocAgent(firstSessionId)` — second `ClaudeSDKAgent` instance with `sdkOptions.resume` + `forkSession: true` |
| Parallel = independent sessions | `Promise.all` = independent agents | Same: both paradigms spawned independently |
| Fork = session copy, parallel = separate | Fork not meaningful for native | Fork creates session-copy isolation |
| **Verdict** | N/A for native | ✅ Literal fork demo via second SDK instance |

## Summary

- **Points 1, 2, 4, 5, 6**: Fully satisfied by both paradigms
- **Point 3 (structured Finding type)**: Native satisfies structurally; SDK requires normalization
- **Point 7 (fork_session)**: SDK literal demo; native uses parallel `Promise.all` for contrast
