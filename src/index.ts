import { researchCoordinator } from './orchestrator'
import { hybridCoordinator } from './hybrid-orchestrator'

async function main() {
  const raw = process.argv[2] ?? ''
  const topic = raw.startsWith('--topic=')
    ? raw.slice('--topic='.length)
    : raw === '--topic'
      ? process.argv[3] ?? 'renewable energy technologies'
      : raw || 'renewable energy technologies'

  if (process.env.HYBRID === '1') {
    console.log(`\n╔══════════════════════════════════════╗`)
    console.log(`║  Hybrid Anthropic↔Mastra Pipeline    ║`)
    console.log(`╚══════════════════════════════════════╝`)
    console.log(`\n📋 Topic: "${topic}"\n`)

    const { report, findings, forkAttempted } = await hybridCoordinator(topic)

    console.log(`\n${'═'.repeat(60)}`)
    console.log(`📝 FINAL REPORT\n`)
    console.log(report)
    console.log(`\n${'═'.repeat(60)}`)
    console.log(`\n📊 Summary:`)
    console.log(`  Findings: ${findings.length}`)
    console.log(`  Fork attempted: ${forkAttempted}`)
  } else {
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
}

main()
