/**
 * Central model registry for Mastra-native agents.
 *
 * Mastra native agents use "ollama-cloud/*" names (the provider strips the
 * prefix before the Ollama API call).
 *
 * Claude SDK bridge agents (ClaudeSDKAgent / native coordinator) no longer
 * read from this registry — they take their model from the `ANTHROPIC_MODEL`
 * env var (bare name, hits Ollama /v1/messages directly), so they can run
 * against Ollama OR real Anthropic without code changes.
 *
 * Keep this file in sync with `ollama list` or `curl localhost:11434/v1/models`.
 */
export const MODELS = {
  // Mastra native agents (require ollama-cloud/ prefix)
  search: 'ollama-cloud/minimax-m3:cloud',
  extraction: 'ollama-cloud/minimax-m3:cloud',
  synthesis: 'ollama-cloud/minimax-m3:cloud',
  research: 'ollama-cloud/minimax-m3:cloud',
  writing: 'ollama-cloud/minimax-m3:cloud',
  supervisor: 'ollama-cloud/minimax-m3:cloud',
} as const
