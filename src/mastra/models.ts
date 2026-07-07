/**
 * Central model registry.
 *
 * Two naming conventions coexist:
 * - "ollama-cloud/*" — Mastra native agents (provider strips prefix before Ollama API)
 * - bare names — Claude SDK bridge agents (passes directly to Ollama /v1/messages)
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

  // Claude SDK bridge agents (bare name, hits Ollama directly)
  sdk: 'qwen3.5:cloud',
} as const
