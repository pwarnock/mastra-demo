import { describe, it, expect, afterEach } from 'bun:test'
import { Agent } from '@mastra/core/agent'
import type { AgentThreadSubscription } from '@mastra/core/agent'

describe('Mastra Signals', () => {
  let subscription: AgentThreadSubscription | null = null

  afterEach(() => {
    subscription?.unsubscribe()
  })

  it('should create an agent with string model ID', () => {
    const agent = new Agent({
      name: 'Test Agent',
      id: 'test-agent',
      model: 'openai/gpt-4o-mini',
      instructions: 'You are a helpful assistant.',
    })
    expect(agent).toBeDefined()
    expect(agent.id).toBe('test-agent')
  })

  it('should have signal-related methods', () => {
    const agent = new Agent({
      name: 'Test Agent',
      id: 'test-agent',
      model: 'openai/gpt-4o-mini',
      instructions: 'You are a helpful assistant.',
    })
    expect(typeof agent.sendMessage).toBe('function')
    expect(typeof agent.queueMessage).toBe('function')
    expect(typeof agent.sendSignal).toBe('function')
    expect(typeof agent.subscribeToThread).toBe('function')
  })

  it('should subscribe to a thread and return a valid subscription', async () => {
    const agent = new Agent({
      name: 'Test Agent',
      id: 'test-agent',
      model: 'openai/gpt-4o-mini',
      instructions: 'You are a helpful assistant.',
    })

    subscription = await agent.subscribeToThread({
      resourceId: 'test-user',
      threadId: 'test-thread',
    })

    expect(subscription).toBeDefined()
    expect(typeof subscription.stream).toBe('object')
    expect(typeof subscription.unsubscribe).toBe('function')
    expect(typeof subscription.abort).toBe('function')
    expect(typeof subscription.activeRunId).toBe('function')
  })

  it('should send a message and receive text-delta chunks', async () => {
    if (!process.env.OPENAI_API_KEY) {
      console.log('  ⏭️  Skipping — OPENAI_API_KEY not set')
      return
    }

    const agent = new Agent({
      name: 'Test Agent',
      id: 'test-agent',
      model: 'openai/gpt-4o-mini',
      instructions: 'You are a helpful assistant that responds concisely.',
    })

    subscription = await agent.subscribeToThread({
      resourceId: 'test-user-2',
      threadId: 'test-thread-2',
    })

    // Start consuming the stream in the background
    const textParts: string[] = []
    const streamDone = (async () => {
      for await (const chunk of subscription!.stream) {
        if (chunk.type === 'text-delta') {
          textParts.push(chunk.payload.text)
        }
      }
    })()

    // Send a message
    await agent.sendMessage('Say hello in one sentence.', {
      resourceId: 'test-user-2',
      threadId: 'test-thread-2',
    })

    // Wait briefly for stream to produce chunks, then unsubscribe
    await new Promise(resolve => setTimeout(resolve, 15_000))
    subscription.unsubscribe()
    await streamDone

    expect(textParts.length).toBeGreaterThan(0)
    const fullText = textParts.join('')
    expect(fullText.toLowerCase()).toContain('hello')
  }, 30_000)

  it('should send a message with ollama-cloud/gpt-oss model', async () => {
    if (!process.env.OLLAMA_API_KEY) {
      console.log('  ⏭️  Skipping — OLLAMA_API_KEY not set')
      return
    }

    const agent = new Agent({
      name: 'Test Agent',
      id: 'test-agent',
      model: 'ollama-cloud/gpt-oss:20b',
      instructions: 'You are a helpful assistant that responds concisely.',
    })

    subscription = await agent.subscribeToThread({
      resourceId: 'test-user-3',
      threadId: 'test-thread-3',
    })

    const textParts: string[] = []
    const streamDone = (async () => {
      for await (const chunk of subscription!.stream) {
        if (chunk.type === 'text-delta') {
          textParts.push(chunk.payload.text)
        }
      }
    })()

    await agent.sendMessage('Say hello in one sentence.', {
      resourceId: 'test-user-3',
      threadId: 'test-thread-3',
    })

    await new Promise(resolve => setTimeout(resolve, 15_000))
    subscription.unsubscribe()
    await streamDone

    expect(textParts.length).toBeGreaterThan(0)
    const fullText = textParts.join('')
    expect(fullText.toLowerCase()).toContain('hello')
  }, 30_000)
})
