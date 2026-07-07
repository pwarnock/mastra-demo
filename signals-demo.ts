import { Agent } from '@mastra/core/agent';
import { OpenAI } from 'openai';

// Mastra Signals Demo
// This demo shows:
// 1. sendMessage() - Send immediate messages to an agent
// 2. subscribeToThread() - Subscribe to receive agent responses
// 3. queueMessage() - Send messages for processing in the next turn
// 4. sendSignal() - Send system-level signals/notifications

console.log('Mastra Signals Demo');
console.log('====================\n');

async function runDemo() {
  let subscription = null;
  
  try {
    // Initialize OpenAI model (will need API key)
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'demo-key-for-local-testing'
    });
    
    // Create a simple agent
    const agent = new Agent({
      name: 'Signals Demo Agent',
      id: 'signals-demo-agent',
      model: openai.chat('gpt-3.5-turbo'),
      instructions: 'You are a helpful assistant that responds concisely to user messages.',
    });
    
    console.log('✓ Agent created successfully\n');
    
    // Define thread and resource IDs
    const resourceId = 'user_123';
    const threadId = 'thread_456';
    
    // Subscribe to thread for receiving responses
    console.log('📡 Subscribing to thread...');
    subscription = await agent.subscribeToThread({
      resourceId,
      threadId,
    });
    console.log('✓ Subscribed to thread\n');
    
    // Send an immediate message
    console.log('📤 Sending immediate message...');
    agent.sendMessage('Hello, how are you?', {
      resourceId,
      threadId,
    });
    console.log('✓ Immediate message sent\n');
    
    // Queue a message for next turn
    console.log('📋 Queueing message for next turn...');
    agent.queueMessage('This is a queued message that should appear after the immediate one is processed.', {
      resourceId,
      threadId,
    });
    console.log('✓ Queued message sent\n');
    
    // Send a system signal
    console.log('🔔 Sending system signal...');
    agent.sendSignal(
      {
        type: 'notification',
        contents: 'System notification: Demo is running successfully.',
      },
      {
        resourceId,
        threadId,
      }
    );
    console.log('✓ System signal sent\n');
    
    // Listen for responses
    console.log('👂 Waiting for responses...\n');
    let messageCount = 0;
    for await (const chunk of subscription.stream) {
      process.stdout.write(chunk);
      messageCount++;
      
      // Stop after receiving responses to avoid infinite loop
      if (messageCount > 15) break;
    }
    
    console.log('\n\n✓ Demo completed successfully');
  } catch (error) {
    console.error('\n✗ Error in demo:', error);
  } finally {
    // Clean up subscription
    if (subscription) {
      try {
        subscription.unsubscribe();
        console.log('✓ Subscription cleaned up');
      } catch (cleanupError) {
        console.error('✗ Error during cleanup:', cleanupError);
      }
    }
  }
}

runDemo().catch(console.error);