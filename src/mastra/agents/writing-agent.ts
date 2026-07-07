import { Agent } from '@mastra/core/agent'

export const writingAgent = new Agent({
  id: 'writing-agent',
  name: 'Writing Specialist',
  description:
    'Transforms research material into well-structured written content. ' +
    'Produces full paragraphs and complete articles with proper flow. ' +
    'Best used after research has been gathered.',
  instructions:
    'You are a writing specialist. Transform research and information into ' +
    'well-written articles. Use complete paragraphs, clear structure, and ' +
    'engaging language. Maintain a professional yet accessible tone. ' +
    'Ensure the content flows naturally from introduction to conclusion.',
  model: 'ollama-cloud/minimax-m3:cloud',
})