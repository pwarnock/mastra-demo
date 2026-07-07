import { createScorer } from '@mastra/core/evals'

const EXPECTED_SUBTOPICS = [
  'solar', 'wind', 'geothermal', 'tidal', 'biomass', 'fusion',
]

export const taskCompleteScorer = createScorer({
  id: 'task-complete',
  name: 'Task Completeness',
  description: 'Checks if research output covers breadth of required subtopics',
}).generateScore(async context => {
  const text = (context.run.output || '').toString().toLowerCase()

  const hasSubstantialContent = text.length > 500
  const hasStructure = text.includes('\n\n')
  const hasContext = /\d{4}/.test(text)

  const coveredCount = EXPECTED_SUBTOPICS.filter(t => text.includes(t)).length
  const breadthRatio = coveredCount / EXPECTED_SUBTOPICS.length

  if (hasSubstantialContent && hasStructure && hasContext && breadthRatio >= 0.8) {
    return 1
  }

  return 0
})
