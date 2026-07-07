# Hub-and-Spoke Research Coordinator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the Mastra research coordinator from LLM-driven delegation to programmatic hub-and-spoke orchestration with explicit subtopic decomposition, coverage evaluation, and iterative refinement.

**Architecture:** A standalone `researchCoordinator()` function in `src/orchestrator.ts` that calls `researchAgent.generate()` and `writingAgent.generate()` directly (bypassing the supervisor's internal tool-calling), plus a coverage evaluator and refinement loop.

**Tech Stack:** Mastra core agents, bun test, TypeScript

---

### Task 1: Create `src/orchestrator.ts` — programmatic coordinator

**Files:**
- Create: `src/orchestrator.ts`
- Modify: `src/index.ts`

Key functions:
- `decomposeTopic(topic)` → returns 5+ subtopics via LLM with fallback
- `researchSubtopic(subtopic, goal, iteration)` → calls `researchAgent.generate()` with explicit context
- `evaluateCoverage(results, subtopics)` → returns `{ covered, partiallyCovered, missing }`
- `researchCoordinator(topic)` → full loop: decompose → research all → evaluate → refine → synthesize → return report
- `synthesizeReport(topic, aggregatedResearch)` → calls `writingAgent.generate()`

### Task 2: Update `src/index.ts` to use orchestrator

Replace direct `supervisorAgent.stream()` with `researchCoordinator()` call.

### Task 3: Create `src/renewable-energy.test.ts`

**Files:**
- Create: `src/renewable-energy.test.ts`
- Modify: `package.json` (add test script)

Assert that `researchCoordinator('renewable energy technologies')` output contains all 6 terms: solar, wind, geothermal, tidal, biomass, fusion.

### Task 4: Update `task-complete-scorer.ts` to be subtopic-aware

Replace generic content checks with coverage-awareness (checks proportion of expected subtopics present).
