import { Agent } from '@mastra/core/agent'

// Mastra Signals Demo
// This demo shows:
// 1. sendMessage() - Send immediate messages to an agent
// 2. subscribeToThread() - Subscribe to receive agent responses
// 3. queueMessage() - Send messages for processing in the next turn
// 4. sendSignal() - Send system-level signals/notifications

console.log('Mastra Signals Demo')
console.log('====================\n')

async function runDemo() {
  let subscription: Awaited<ReturnType<Agent['subscribeToThread']>> | null = null

  try {
    // Create a simple agent using a model string (not openai.chat())
    const agent = new Agent({
      name: 'Signals Demo Agent',
      id: 'signals-demo-agent',
      model: 'openai/gpt-4o-mini',
      instructions: 'You are a helpful assistant that responds concisely to user messages.',
    })

    console.log('✓ Agent created successfully\n')

    // Define thread and resource IDs
    const resourceId = 'user_123'
    const threadId = 'thread_456'

    // Subscribe to thread for receiving responses
    console.log('📡 Subscribing to thread...')
    subscription = await agent.subscribeToThread({
      resourceId,
      threadId,
    })
    console.log('✓ Subscribed to thread\n')

    // Send an immediate message — signature: sendMessage(message, target)
    console.log('📤 Sending immediate message...')
    await agent.sendMessage('Hello, how are you?', {
      resourceId,
      threadId,
    })
    console.log('✓ Immediate message sent\n')

    // Queue a message for next turn — signature: queueMessage(message, target)
    console.log('📋 Queueing message for next turn...')
    await agent.queueMessage(
      'This is a queued message that should appear after the immediate one is processed.',
      { resourceId, threadId },
    )
    console.log('✓ Queued message sent\n')

    // Send a system signal — signature: sendSignal(signal, target)
    console.log('🔔 Sending system signal...')
    await agent.sendSignal(
      { type: 'user-message', contents: 'System notification: Demo is running successfully.' },
      { resourceId, threadId },
    )
    console.log('✓ System signal sent\n')

    // Listen for responses — iterate over stream chunks, pick out text-delta
    console.log('👂 Waiting for responses...\n')
    let messageCount = 0
    for await (const chunk of subscription.stream) {
      if (chunk.type === 'text-delta') {
        process.stdout.write(chunk.payload.text)
      }
      messageCount++

      // Stop after receiving responses to avoid infinite loop
      if (messageCount > 15) break
    }

    console.log('\n\n✓ Demo completed successfully')
  } catch (error) {
    console.error('\n✗ Error in demo:', error)
  } finally {
    // Clean up subscription
    if (subscription) {
      try {
        subscription.unsubscribe()
        console.log('✓ Subscription cleaned up')
      } catch (cleanupError) {
        console.error('✗ Error during cleanup:', cleanupError)
      }
    }
  }
}

runDemo().catch(console.error)
