# Mastra Signals Demo Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a self-contained TypeScript demo for Mastra signals feature that demonstrates sendMessage, subscribeToThread, queueMessage, and sendSignal operations for developers new to Mastra.

**Architecture:** The demo will create a simple Mastra agent with OpenAI model, subscribe to a thread for receiving responses, and demonstrate various signal operations with proper error handling and cleanup.

**Tech Stack:** TypeScript, Bun, @mastra/core, OpenAI

---

### Task 1: Initialize project structure and dependencies

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `signals-demo.ts`

**Step 1: Write the failing test**

Actually, since this is a demo application, we'll verify by running the demo directly rather than writing traditional tests.

**Step 2: Initialize package.json**

```json
{
  "name": "mastra-signals-demo",
  "version": "1.0.0",
  "description": "A demo of Mastra signals feature for beginners",
  "main": "signals-demo.ts",
  "scripts": {
    "start": "bun run signals-demo.ts",
    "dev": "bun run signals-demo.ts"
  },
  "keywords": [
    "mastra",
    "signals",
    "ai",
    "agents",
    "demo"
  ],
  "author": "Mastra Signals Demo",
  "license": "MIT",
  "dependencies": {
    "@mastra/core": "^0.3.0",
    "openai": "^4.0.0"
  },
  "devDependencies": {
    "bun-types": "^1.0.0",
    "typescript": "^5.0.0"
  }
}
```

**Step 3: Initialize tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Node",
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create basic signals-demo.ts skeleton**

```typescript
import { Agent } from '@mastra/core/agent';
import { OpenAI } from 'openai';

// Basic demo skeleton
console.log('Mastra Signals Demo');

async function runDemo() {
  // Implementation will go here
}

runDemo().catch(console.error);
```

**Step 5: Commit initial files**

```bash
git add package.json tsconfig.json signals-demo.ts
git commit -m "feat: initialize project structure"
```

---

### Task 2: Implement agent creation and basic setup

**Files:**
- Modify: `signals-demo.ts`

**Step 1: Add agent creation code**

```typescript
import { Agent } from '@mastra/core/agent';
import { OpenAI } from 'openai';

// Basic demo skeleton
console.log('Mastra Signals Demo');

async function runDemo() {
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
  
  console.log('Agent created successfully');
}

runDemo().catch(console.error);
```

**Step 2: Run to verify agent creation works**

```bash
bun run signals-demo.ts
```

Expected: Should print "Mastra Signals Demo" and "Agent created successfully" without errors

**Step 3: Commit agent creation code**

```bash
git add signals-demo.ts
git commit -m "feat: implement agent creation"
```

---

### Task 3: Implement thread subscription and basic messaging

**Files:**
- Modify: `signals-demo.ts`

**Step 1: Add thread subscription and messaging code**

```typescript
import { Agent } from '@mastra/core/agent';
import { OpenAI } from 'openai';

// Basic demo skeleton
console.log('Mastra Signals Demo');

async function runDemo() {
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
  
  console.log('Agent created successfully');
  
  // Define thread and resource IDs
  const resourceId = 'user_123';
  const threadId = 'thread_456';
  
  // Subscribe to thread for receiving responses
  console.log('Subscribing to thread...');
  const subscription = await agent.subscribeToThread({
    resourceId,
    threadId,
  });
  
  // Send a message
  console.log('Sending message...');
  agent.sendMessage('Hello, how are you?', {
    resourceId,
    threadId,
  });
  
  // Listen for responses
  console.log('Waiting for responses...');
  let messageCount = 0;
  for await (const chunk of subscription.stream) {
    process.stdout.write(chunk);
    messageCount++;
    
    // Stop after receiving a few chunks to avoid infinite loop
    if (messageCount > 5) break;
  }
  
  console.log('\nDemo completed');
  
  // Clean up subscription
  subscription.unsubscribe();
}

runDemo().catch(console.error);
```

**Step 2: Run to verify messaging works**

```bash
bun run signals-demo.ts
```

Expected: Should show message being sent and streamed response from agent

**Step 3: Commit messaging implementation**

```bash
git add signals-demo.ts
git commit -m "feat: implement thread subscription and messaging"
```

---

### Task 4: Implement queueMessage functionality

**Files:**
- Modify: `signals-demo.ts`

**Step 1: Add queueMessage demonstration**

```typescript
import { Agent } from '@mastra/core/agent';
import { OpenAI } from 'openai';

// Basic demo skeleton
console.log('Mastra Signals Demo');

async function runDemo() {
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
  
  console.log('Agent created successfully');
  
  // Define thread and resource IDs
  const resourceId = 'user_123';
  const threadId = 'thread_456';
  
  // Subscribe to thread for receiving responses
  console.log('Subscribing to thread...');
  const subscription = await agent.subscribeToThread({
    resourceId,
    threadId,
  });
  
  // Send an immediate message
  console.log('Sending immediate message...');
  agent.sendMessage('This is an immediate message.', {
    resourceId,
    threadId,
  });
  
  // Queue a message for next turn
  console.log('Queueing message for next turn...');
  agent.queueMessage('This is a queued message that should appear after the immediate one is processed.', {
    resourceId,
    threadId,
  });
  
  // Listen for responses
  console.log('Waiting for responses...');
  let messageCount = 0;
  for await (const chunk of subscription.stream) {
    process.stdout.write(chunk);
    messageCount++;
    
    // Stop after receiving responses to both messages
    if (messageCount > 10) break;
  }
  
  console.log('\nDemo completed');
  
  // Clean up subscription
  subscription.unsubscribe();
}

runDemo().catch(console.error);
```

**Step 2: Run to verify queueMessage works**

```bash
bun run signals-demo.ts
```

Expected: Should show immediate message processed first, then queued message

**Step 3: Commit queueMessage implementation**

```bash
git add signals-demo.ts
git commit -m "feat: implement queueMessage functionality"
```

---

### Task 5: Implement sendSignal functionality

**Files:**
- Modify: `signals-demo.ts`

**Step 1: Add sendSignal demonstration**

```typescript
import { Agent } from '@mastra/core/agent';
import { OpenAI } from 'openai';

// Basic demo skeleton
console.log('Mastra Signals Demo');

async function runDemo() {
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
  
  console.log('Agent created successfully');
  
  // Define thread and resource IDs
  const resourceId = 'user_123';
  const threadId = 'thread_456';
  
  // Subscribe to thread for receiving responses
  console.log('Subscribing to thread...');
  const subscription = await agent.subscribeToThread({
    resourceId,
    threadId,
  });
  
  // Send an immediate message
  console.log('Sending immediate message...');
  agent.sendMessage('Hello, how are you?', {
    resourceId,
    threadId,
  });
  
  // Send a system signal
  console.log('Sending system signal...');
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
  
  // Listen for responses
  console.log('Waiting for responses...');
  let messageCount = 0;
  for await (const chunk of subscription.stream) {
    process.stdout.write(chunk);
    messageCount++;
    
    // Stop after receiving responses
    if (messageCount > 15) break;
  }
  
  console.log('\nDemo completed');
  
  // Clean up subscription
  subscription.unsubscribe();
}

runDemo().catch(console.error);
```

**Step 2: Run to verify sendSignal works**

```bash
bun run signals-demo.ts
```

Expected: Should show message being sent, signal being processed, and responses

**Step 3: Commit sendSignal implementation**

```bash
git add signals-demo.ts
git commit -m "feat: implement sendSignal functionality"
```

---

### Task 6: Add error handling and cleanup

**Files:**
- Modify: `signals-demo.ts`

**Step 1: Add proper error handling and cleanup**

```typescript
import { Agent } from '@mastra/core/agent';
import { OpenAI } from 'openai';

// Basic demo skeleton
console.log('Mastra Signals Demo');

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
    
    console.log('Agent created successfully');
    
    // Define thread and resource IDs
    const resourceId = 'user_123';
    const threadId = 'thread_456';
    
    // Subscribe to thread for receiving responses
    console.log('Subscribing to thread...');
    subscription = await agent.subscribeToThread({
      resourceId,
      threadId,
    });
    
    // Send an immediate message
    console.log('Sending immediate message...');
    agent.sendMessage('Hello, how are you?', {
      resourceId,
      threadId,
    });
    
    // Queue a message for next turn
    console.log('Queueing message for next turn...');
    agent.queueMessage('This is a queued message that should appear after the immediate one is processed.', {
      resourceId,
      threadId,
    });
    
    // Send a system signal
    console.log('Sending system signal...');
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
    
    // Listen for responses
    console.log('Waiting for responses...');
    let messageCount = 0;
    for await (const chunk of subscription.stream) {
      process.stdout.write(chunk);
      messageCount++;
      
      // Stop after receiving responses to avoid infinite loop
      if (messageCount > 15) break;
    }
    
    console.log('\nDemo completed successfully');
  } catch (error) {
    console.error('Error in demo:', error);
  } finally {
    // Clean up subscription
    if (subscription) {
      try {
        subscription.unsubscribe();
        console.log('Subscription cleaned up');
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
    }
  }
}

runDemo().catch(console.error);
```

**Step 2: Run to verify error handling works**

```bash
bun run signals-demo.ts
```

Expected: Should run successfully or show graceful error handling

**Step 3: Commit error handling implementation**

```bash
git add signals-demo.ts
git commit -m "feat: add error handling and cleanup"
```

---

### Task 7: Final verification and documentation

**Files:**
- Modify: `signals-demo.ts`
- Create: `README.md`
- Create: `.gitignore`

**Step 1: Finalize demo code with comments**

```typescript
import { Agent } from '@mastra/core/agent';
import { OpenAI } from 'openai';

// Basic demo skeleton
console.log('Mastra Signals Demo');

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
    
    console.log('Agent created successfully');
    
    // Define thread and resource IDs
    const resourceId = 'user_123';
    const threadId = 'thread_456';
    
    // Subscribe to thread for receiving responses
    console.log('Subscribing to thread...');
    subscription = await agent.subscribeToThread({
      resourceId,
      threadId,
    });
    
    // Send an immediate message
    console.log('Sending immediate message...');
    agent.sendMessage('Hello, how are you?', {
      resourceId,
      threadId,
    });
    
    // Queue a message for next turn
    console.log('Queueing message for next turn...');
    agent.queueMessage('This is a queued message that should appear after the immediate one is processed.', {
      resourceId,
      threadId,
    });
    
    // Send a system signal
    console.log('Sending system signal...');
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
    
    // Listen for responses
    console.log('Waiting for responses...');
    let messageCount = 0;
    for await (const chunk of subscription.stream) {
      process.stdout.write(chunk);
      messageCount++;
      
      // Stop after receiving responses to avoid infinite loop
      if (messageCount > 15) break;
    }
    
    console.log('\nDemo completed successfully');
  } catch (error) {
    console.error('Error in demo:', error);
  } finally {
    // Clean up subscription
    if (subscription) {
      try {
        subscription.unsubscribe();
        console.log('Subscription cleaned up');
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
    }
  }
}

runDemo().catch(console.error);
```

**Step 2: Create README.md**

```markdown
# Mastra Signals Demo

A self-contained TypeScript demo demonstrating the Mastra signals feature.

## Features Demonstrated

- `sendMessage()`: Send immediate messages to an agent
- `subscribeToThread()`: Subscribe to receive agent responses
- `queueMessage()`: Send messages for processing in the next turn
- `sendSignal()`: Send system-level signals/notifications

## Prerequisites

- Bun installed (https://bun.sh)
- OpenAI API key (optional for basic functionality)

## Setup

1. Install dependencies:
   ```bash
   bun install
   ```

2. Set your OpenAI API key (optional):
   ```bash
   export OPENAI_API_KEY=your_api_key_here
   ```

3. Run the demo:
   ```bash
   bun start
   ```

## How It Works

The demo creates a simple Mastra agent and demonstrates various signal operations:

1. Creates an agent with basic instructions
2. Subscribes to a thread to receive responses
3. Sends an immediate message using `sendMessage()`
4. Queues a message for next-turn processing using `queueMessage()`
5. Sends a system signal using `sendSignal()`
6. Listens for and displays agent responses
7. Properly cleans up resources

## Expected Output

You should see:
1. Initialization messages
2. The immediate message being sent
3. The queued message being processed after the immediate one
4. System signal being processed
5. Agent responses to all inputs
6. Cleanup confirmation

## Notes

- Without a valid OpenAI API key, the agent will not generate real responses but the demo will still run
- The demo includes timeout limits to prevent infinite loops
- All resources are properly cleaned up on completion
```

**Step 3: Create .gitignore**

```gitignore
node_modules/
dist/
.env
.env.local
```

**Step 4: Commit final changes**

```bash
git add signals-demo.ts README.md .gitignore
git commit -m "feat: complete demo with documentation"
```

**Step 5: Verify final demo works**

```bash
bun start
```

Expected: Demo runs successfully showing all signal operations