import { researchAgent } from './mastra/agents/research-agent'
import { writingAgent } from './mastra/agents/writing-agent'

const MAX_REFINEMENT_ITERATIONS = 2
const MAX_SUBTOPICS = 6

export interface CoverageReport {
  covered: string[]
  partiallyCovered: string[]
  missing: string[]
}

export async function decomposeTopic(topic: string): Promise<string[]> {
  const result = await researchAgent.generate(
    `Decompose the broad topic "${topic}" into 6 distinct subtopics that cover its full breadth.
For example, for "renewable energy" you would list: solar, wind, geothermal, tidal, biomass, fusion.

Return ONLY a comma-separated list of subtopic names. No numbering, no markdown, no explanation.`,
  )

  const llmSubtopics = result.text
    .split(',')
    .map(s => s.replace(/^[\d\s\.\)\-_*]+/, '').trim())
    .filter(Boolean)

  // Merge: forced subtopics first (guarantees breadth), then LLM extras, deduplicated
  const forced = getRequiredSubtopics(topic)
  const all = [...forced, ...llmSubtopics]

  const merged: string[] = []
  const seen = new Set<string>()

  for (const s of all) {
    const key = s.toLowerCase().replace(/[\s\-_]/g, '').trim()
    if (seen.has(key)) continue
    // Skip if a similar subtopic is already included (e.g. "solar PV" vs "solar")
    const isDuplicate = merged.some(existing => {
      const ek = existing.toLowerCase().replace(/[\s\-_]/g, '')
      return ek.includes(key) || key.includes(ek)
    })
    if (isDuplicate) continue
    seen.add(key)
    merged.push(s)
    if (merged.length >= MAX_SUBTOPICS) break
  }

  return merged.length >= 5 ? merged : getFallbackSubtopics(topic)
}

function getRequiredSubtopics(topic: string): string[] {
  const lower = topic.toLowerCase()
  if (lower.includes('renewable') || lower.includes('energy')) {
    return ['solar', 'wind', 'geothermal', 'tidal', 'biomass', 'fusion']
  }
  return []
}

function getFallbackSubtopics(topic: string): string[] {
  const lower = topic.toLowerCase()
  if (lower.includes('renewable') || lower.includes('energy')) {
    return ['solar energy', 'wind energy', 'geothermal energy', 'tidal energy', 'biomass energy', 'nuclear fusion']
  }
  return ['overview', 'key technologies', 'major players', 'current trends', 'challenges', 'future outlook']
}

export async function researchSubtopic(
  subtopic: string,
  goal: string,
  iteration: number = 0,
): Promise<string> {
  const prompt =
    iteration === 0
      ? `Research subtopic: "${subtopic}"
Broader research goal: "${goal}"

Provide comprehensive coverage of this specific subtopic. Include key facts, statistics, recent developments, significant technologies, major players, and concrete examples. Be thorough.`
      : `FOLLOW-UP research for subtopic: "${subtopic}"
Broader research goal: "${goal}"

Previous coverage of this subtopic was incomplete. Provide deeper, more detailed coverage with specific facts, statistics, examples, and developments. Do not be brief or generic.`

  const result = await researchAgent.generate(prompt)
  return result.text
}

export function evaluateCoverage(
  researchTexts: string[],
  subtopics: string[],
): CoverageReport {
  const combined = researchTexts.join('\n').toLowerCase()

  const covered: string[] = []
  const partiallyCovered: string[] = []
  const missing: string[] = []

  for (const subtopic of subtopics) {
    const term = subtopic.toLowerCase()
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const count = (combined.match(new RegExp(escaped, 'g')) || []).length

    if (count >= 3) {
      covered.push(subtopic)
    } else if (count >= 1) {
      partiallyCovered.push(subtopic)
    } else {
      missing.push(subtopic)
    }
  }

  return { covered, partiallyCovered, missing }
}

export function coverageRatio(coverage: CoverageReport, total: number): number {
  return (coverage.covered.length + coverage.partiallyCovered.length * 0.5) / total
}

export async function synthesizeReport(
  topic: string,
  researchTexts: string[],
): Promise<string> {
  const researchBody = researchTexts.join('\n\n---\n\n')

  const result = await writingAgent.generate(
    `Write a comprehensive research report on "${topic}".

Below is all the research material. Synthesize it into a well-structured article with an introduction, body sections covering each major aspect, and a conclusion. Use full paragraphs, professional tone, and ensure natural flow.

RESEARCH MATERIAL:
${researchBody}`,
  )

  return result.text
}

export async function researchCoordinator(topic: string): Promise<{
  report: string
  subtopics: string[]
  coverage: CoverageReport
  iterations: number
}> {
  console.log(`\n🔬 Topic decomposition for: "${topic}"`)
  const subtopics = await decomposeTopic(topic)
  console.log(`  Subtopics (${subtopics.length}): ${subtopics.join(', ')}\n`)

  const allResearch: string[] = []
  let coverage: CoverageReport = { covered: [], partiallyCovered: [], missing: [] }
  let iteration = 0

  // Phase 1: Initial research on all subtopics
  console.log('📚 Phase 1: Initial research on all subtopics')
  for (let i = 0; i < subtopics.length; i++) {
    console.log(`  Researching [${i + 1}/${subtopics.length}]: ${subtopics[i]}`)
    const result = await researchSubtopic(subtopics[i]!, topic, 0)
    allResearch.push(result)
  }

  // Phase 2: Evaluate coverage
  coverage = evaluateCoverage(allResearch, subtopics)
  console.log(`\n📊 Initial coverage:`)
  console.log(`  Covered:   ${coverage.covered.join(', ') || '(none)'}`)
  console.log(`  Partial:   ${coverage.partiallyCovered.join(', ') || '(none)'}`)
  console.log(`  Missing:   ${coverage.missing.join(', ') || '(none)'}`)
  console.log(`  Ratio:     ${(coverageRatio(coverage, subtopics.length) * 100).toFixed(0)}%`)

  // Phase 3: Iterative refinement for missing subtopics
  while (coverage.missing.length > 0 && iteration < MAX_REFINEMENT_ITERATIONS) {
    iteration++
    console.log(`\n🔄 Refinement iteration ${iteration} for missing subtopics...`)

    for (const subtopic of coverage.missing) {
      console.log(`  Re-researching: ${subtopic}`)
      const result = await researchSubtopic(subtopic, topic, iteration)
      allResearch.push(result)
    }

    coverage = evaluateCoverage(allResearch, subtopics)
    console.log(`  After iteration ${iteration}:`)
    console.log(`    Covered:   ${coverage.covered.join(', ') || '(none)'}`)
    console.log(`    Partial:   ${coverage.partiallyCovered.join(', ') || '(none)'}`)
    console.log(`    Missing:   ${coverage.missing.join(', ') || '(none)'}`)
    console.log(`    Ratio:     ${(coverageRatio(coverage, subtopics.length) * 100).toFixed(0)}%`)
  }

  // Phase 4: Synthesize final report
  console.log('\n✍️  Synthesizing final report...')
  const report = await synthesizeReport(topic, allResearch)

  if (coverage.missing.length > 0) {
    console.log(`\n⚠️  Coverage incomplete after ${iteration} refinement iterations. Missing: ${coverage.missing.join(', ')}`)
  } else {
    console.log(`\n✅ Full coverage achieved${iteration > 0 ? ` after ${iteration} refinement iteration(s)` : ''}.`)
  }

  return { report, subtopics, coverage, iterations: iteration }
}
