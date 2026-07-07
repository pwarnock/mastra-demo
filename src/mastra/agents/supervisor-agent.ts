import { Agent } from '@mastra/core/agent'
import { Memory } from '@mastra/memory'
import { LibSQLStore } from '@mastra/libsql'
import { researchAgent } from './research-agent'
import { writingAgent } from './writing-agent'
import { taskCompleteScorer } from '../scorers/task-complete-scorer'
import { MODELS } from '../models'

export const supervisorAgent = new Agent({
  id: 'supervisor-agent',
  name: 'Research Coordinator',
  instructions: `You coordinate research and writing tasks using specialized agents.

Available resources:
- research-agent: Gathers factual data and sources (returns bullet points)
- writing-agent: Transforms research into well-structured articles (returns full paragraphs)

Task decomposition:
Before delegating, break the topic into at least 5 distinct subtopics that cover the full breadth of the subject. Research each subtopic individually before synthesizing.

Delegation strategy:
1. Decompose the topic into 5+ subtopics covering the full breadth of the subject
2. For each subtopic: Delegate to research-agent to gather facts
3. For writing requests: Delegate to writing-agent with the complete research context
4. Always ensure you have gathered sufficient information before producing final output

Success criteria:
- All aspects of the user's request are addressed
- Information is accurate and well-sourced
- Final output is well-formatted and complete
- If anything is missing or uncertain, continue gathering information`,
  model: MODELS.supervisor,
  agents: {
    researchAgent,
    writingAgent,
  },
  memory: new Memory({
    storage: new LibSQLStore({
      id: 'mastra-storage',
      url: 'file:mastra.db',
    })
  }),
  defaultOptions: {
    maxSteps: 10,

    onIterationComplete: async context => {
      console.log(`\n✓ Iteration ${context.iteration} complete`)
      console.log(`  Finish reason: ${context.finishReason}`)
      console.log(`  Response length: ${context.text.length} chars\n`)
      return { continue: true }
    },

    delegation: {
      onDelegationStart: async context => {
        console.log(`→ Delegating to: ${context.primitiveId}`)

        if (context.primitiveId === 'research-agent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nFocus on recent developments (2024-2025) and include statistics.`,
          }
        }

        return { proceed: true }
      },

      onDelegationComplete: async context => {
        console.log(`✓ Completed: ${context.primitiveId}\n`)

        if (context.error) {
          console.error('Delegation failed:', context.error)
          context.bail() // Stop further delegations
          return {
            feedback: `Delegation to ${context.primitiveId} failed: ${context.error}. Try a different approach.`,
          }
        }
      },

      messageFilter: ({ messages }) => {
        return messages.slice(-10)
      },
    },

    // Validate task completion
    isTaskComplete: {
      scorers: [taskCompleteScorer],
      strategy: 'all',
      onComplete: async result => {
        console.log('\n🎯 Completion Check:')
        console.log(`  Complete: ${result.complete}`)
        console.log(`  Score: ${result.scorers[0]?.score}\n`)
      },
    },
  },
})