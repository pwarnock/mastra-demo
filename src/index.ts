import { researchCoordinator } from './orchestrator'

async function main() {
  const topic = 'renewable energy technologies'
  console.log(`\n╔══════════════════════════════════════╗`)
  console.log(`║  Research Coordinator — Hub & Spoke  ║`)
  console.log(`╚══════════════════════════════════════╝`)
  console.log(`\n📋 Topic: "${topic}"\n`)

  const { report, subtopics, coverage, iterations } = await researchCoordinator(topic)

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`📝 FINAL REPORT\n`)
  console.log(report)
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`\n📊 Summary:`)
  console.log(`  Subtopics: ${subtopics.length}`)
  console.log(`  Covered:   ${coverage.covered.length}`)
  console.log(`  Partial:   ${coverage.partiallyCovered.length}`)
  console.log(`  Missing:   ${coverage.missing.length}`)
  console.log(`  Refinements: ${iterations}`)
}

main()
