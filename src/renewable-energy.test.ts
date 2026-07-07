import { describe, it, expect } from 'bun:test'
import { researchCoordinator, evaluateCoverage, decomposeTopic, coverageRatio } from './orchestrator'

const REQUIRED_ENERGY_TYPES = ['solar', 'wind', 'geothermal', 'tidal', 'biomass', 'fusion']

describe('Hub-and-Spoke Research Coordinator', () => {
  describe('decomposeTopic', () => {
    it('should return at least 5 subtopics for renewable energy', async () => {
      const subtopics = await decomposeTopic('renewable energy technologies')
      expect(subtopics.length).toBeGreaterThanOrEqual(5)
    })

    it('should include all 6 required energy types in decomposition', async () => {
      const subtopics = await decomposeTopic('renewable energy technologies')
      const combined = subtopics.join(' ').toLowerCase()
      for (const type of REQUIRED_ENERGY_TYPES) {
        expect(combined).toInclude(type)
      }
    })
  })

  describe('evaluateCoverage', () => {
    it('should detect fully covered, partially covered, and missing subtopics', () => {
      const texts = [
        'Solar energy is abundant. Solar panels convert sunlight. Solar power grows 20% yearly.',
        'Wind turbines generate electricity. Wind farms are expanding.',
        'Geothermal energy uses earth heat.',
      ]
      const subtopics = ['solar', 'wind', 'geothermal', 'tidal', 'biomass']

      const coverage = evaluateCoverage(texts, subtopics)

      expect(coverage.covered).toContain('solar')
      expect(coverage.missing).toContain('tidal')
      expect(coverage.missing).toContain('biomass')
    })

    it('should report all missing when nothing matches', () => {
      const coverage = evaluateCoverage(['nothing about energy here'], ['solar', 'wind', 'geothermal'])
      expect(coverage.missing.length).toBe(3)
    })
  })

  describe('coverageRatio', () => {
    it('should compute 100% for fully covered', () => {
      const r = coverageRatio({ covered: ['a', 'b'], partiallyCovered: [], missing: [] }, 2)
      expect(r).toBe(1)
    })

    it('should compute 50% for half-covered', () => {
      const r = coverageRatio({ covered: ['a'], partiallyCovered: [], missing: ['b'] }, 2)
      expect(r).toBe(0.5)
    })

    it('should credit partial coverage at half weight', () => {
      const r = coverageRatio({ covered: [], partiallyCovered: ['a'], missing: ['b'] }, 2)
      expect(r).toBe(0.25)
    })
  })

  describe('researchCoordinator (integration)', () => {
    it('should produce a report covering all 6 renewable energy types', async () => {
      const result = await researchCoordinator('renewable energy technologies')

      expect(result.subtopics.length).toBeGreaterThanOrEqual(5)
      expect(result.report.length).toBeGreaterThan(500)

      const lower = result.report.toLowerCase()
      for (const type of REQUIRED_ENERGY_TYPES) {
        expect(lower).toInclude(type)
      }

      expect(result.coverage.missing.length).toBe(0)
    }, 600_000)
  })
})
