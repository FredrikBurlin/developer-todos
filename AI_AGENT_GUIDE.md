# AI Agent Integration Guide

This guide explains how AI agents (like Claude, GitHub Copilot, or custom agents) can interact with the Developer Todos extension.

## Overview

The Developer Todos extension exposes a public API that AI agents can use to:
- Get the current git branch
- Retrieve todos for any branch
- Complete todos programmatically
- Refresh todos for changed files
- Access all todos across all branches

## Accessing the Extension API

### Step 1: Get the Extension Instance

```typescript
const todoExtension = vscode.extensions.getExtension('yourpublisher.developer-todos');

if (!todoExtension) {
  console.error('Developer Todos extension is not installed');
  return;
}

// Activate the extension if not already active
const api = await todoExtension.activate();
```

### Step 2: Use the API Methods

```typescript
// Get current git branch
const currentBranch = api.getCurrentBranch();
console.log(`Current branch: ${currentBranch}`);

// Get todos for current branch
const todos = api.getTodos();
console.log(`Found ${todos.length} todos on ${currentBranch}`);

// Get todos for a specific branch
const featureTodos = api.getTodos('feature/auth-flow');

// Complete a todo
await api.completeTodo('apex-permission:main/default/classes/MyController.cls');

// Refresh todos (scans changed/staged files)
await api.refreshTodos();

// Get all todos across all branches
const allBranchTodos = api.getAllBranchTodos();
for (const [branch, todos] of allBranchTodos) {
  console.log(`Branch ${branch}: ${todos.length} todos`);
}
```

## API Reference

### `getCurrentBranch(): string`

Returns the name of the current git branch.

**Returns:** Branch name as a string (e.g., `"feature/auth-flow"`)

**Example:**
```typescript
const branch = api.getCurrentBranch();
// Output: "feature/auth-flow"
```

---

### `getTodos(branch?: string): TodoInstance[]`

Gets all todos for a specific branch. If no branch is provided, uses current branch.

**Parameters:**
- `branch` (optional): Branch name to get todos for

**Returns:** Array of `TodoInstance` objects

**TodoInstance Interface:**
```typescript
interface TodoInstance {
  id: string;                    // Unique ID: "templateId:relativePath"
  templateId: string;            // Template that created this todo
  name: string;                  // Display name
  description: string;           // Full description
  filePath: string;              // Absolute file path
  relativePath: string;          // Workspace-relative path
  priority: 'high' | 'medium' | 'low';
  completed: boolean;            // Completion status
  completedAt?: string;          // ISO timestamp when completed
  branch: string;                // Branch this todo belongs to
}
```

**Example:**
```typescript
const todos = api.getTodos();
todos.forEach(todo => {
  console.log(`${todo.completed ? '✓' : '○'} ${todo.name}`);
  console.log(`  File: ${todo.relativePath}`);
  console.log(`  Priority: ${todo.priority}`);
});
```

---

### `completeTodo(id: string, branch?: string): Promise<void>`

Marks a todo as complete.

**Parameters:**
- `id` (required): Todo ID in format `"templateId:relativePath"`
- `branch` (optional): Branch name (defaults to current branch)

**Returns:** Promise that resolves when complete

**Example:**
```typescript
// Complete a specific todo
await api.completeTodo('apex-test-class:force-app/main/default/classes/MyClass.cls');

// Complete a todo on a different branch
await api.completeTodo('lwc-add-to-page:force-app/main/default/lwc/myComponent', 'feature/ui');
```

---

### `reopenTodo(id: string, branch?: string): Promise<void>`

Marks a completed todo as incomplete (reopens it).

**Parameters:**
- `id` (required): Todo ID in format `"templateId:relativePath"`
- `branch` (optional): Branch name (defaults to current branch)

**Returns:** Promise that resolves when complete

**Example:**
```typescript
// Reopen a completed todo
await api.reopenTodo('apex-test-class:force-app/main/default/classes/MyClass.cls');

// Reopen a todo on a different branch
await api.reopenTodo('lwc-add-to-page:force-app/main/default/lwc/myComponent', 'feature/ui');
```

---

### `refreshTodos(branch?: string): Promise<void>`

Scans changed/staged git files and creates todos for matching templates.

**Parameters:**
- `branch` (optional): Branch to refresh (defaults to current branch)

**Returns:** Promise that resolves when refresh is complete

**Example:**
```typescript
// Refresh current branch
await api.refreshTodos();

// Refresh specific branch
await api.refreshTodos('feature/auth-flow');
```

---

### `getAllBranchTodos(): Map<string, TodoInstance[]>`

Gets todos for all branches.

**Returns:** Map where keys are branch names and values are arrays of todos

**Example:**
```typescript
const allTodos = api.getAllBranchTodos();

for (const [branch, todos] of allTodos) {
  const incomplete = todos.filter(t => !t.completed).length;
  const completed = todos.filter(t => t.completed).length;

  console.log(`${branch}: ${incomplete} remaining, ${completed} completed`);
}
```

## Common AI Agent Workflows

### 1. Check Developer's Progress

```typescript
const api = await vscode.extensions.getExtension('yourpublisher.developer-todos').activate();

const currentBranch = api.getCurrentBranch();
const todos = api.getTodos();

const incomplete = todos.filter(t => !t.completed);
const completed = todos.filter(t => t.completed);

console.log(`Branch: ${currentBranch}`);
console.log(`Progress: ${completed.length}/${todos.length} tasks completed`);

if (incomplete.length > 0) {
  console.log('\nRemaining tasks:');
  incomplete.forEach(todo => {
    console.log(`- [${todo.priority}] ${todo.name}`);
    console.log(`  ${todo.description}`);
  });
}
```

### 2. Auto-Complete Todos When Work is Done

```typescript
// Agent detects that a test file was created
const testFileCreated = 'force-app/main/default/classes/MyControllerTest.cls';

// Find related todo
const todos = api.getTodos();
const testTodo = todos.find(t =>
  t.templateId === 'apex-test-class' &&
  t.relativePath.includes('MyController.cls') &&
  !t.completed
);

if (testTodo) {
  await api.completeTodo(testTodo.id);
  console.log(`✓ Automatically completed: ${testTodo.name}`);
}
```

### 3. Guide Developer on Next Steps

```typescript
const todos = api.getTodos();
const highPriority = todos
  .filter(t => t.priority === 'high' && !t.completed)
  .sort((a, b) => a.name.localeCompare(b.name));

if (highPriority.length > 0) {
  console.log('High priority tasks to complete:');
  highPriority.forEach((todo, index) => {
    console.log(`${index + 1}. ${todo.name}`);
    console.log(`   ${todo.description}`);
    console.log(`   File: ${todo.relativePath}\n`);
  });
} else {
  console.log('✓ All high priority tasks completed!');
}
```

### 4. Branch Comparison

```typescript
const allTodos = api.getAllBranchTodos();

console.log('Branch Health Report:\n');

for (const [branch, todos] of allTodos) {
  const incomplete = todos.filter(t => !t.completed).length;
  const high = todos.filter(t => t.priority === 'high' && !t.completed).length;

  const status = incomplete === 0 ? '✓ Ready' :
                 high > 0 ? '⚠️  High priority items' :
                 '○ In progress';

  console.log(`${status} ${branch}: ${incomplete} remaining`);
}
```

### 5. Generate Summary Report

```typescript
const currentBranch = api.getCurrentBranch();
const todos = api.getTodos();

const summary = {
  branch: currentBranch,
  total: todos.length,
  completed: todos.filter(t => t.completed).length,
  byPriority: {
    high: {
      total: todos.filter(t => t.priority === 'high').length,
      completed: todos.filter(t => t.priority === 'high' && t.completed).length
    },
    medium: {
      total: todos.filter(t => t.priority === 'medium').length,
      completed: todos.filter(t => t.priority === 'medium' && t.completed).length
    },
    low: {
      total: todos.filter(t => t.priority === 'low').length,
      completed: todos.filter(t => t.priority === 'low' && t.completed).length
    }
  }
};

console.log(JSON.stringify(summary, null, 2));
```

## Integration with Language Models (Claude, GPT, etc.)

### Providing Context to LLMs

```typescript
async function getTodoContextForLLM() {
  const api = await vscode.extensions.getExtension('yourpublisher.developer-todos').activate();

  const currentBranch = api.getCurrentBranch();
  const todos = api.getTodos();

  const context = {
    branch: currentBranch,
    todos: todos.map(t => ({
      name: t.name,
      description: t.description,
      file: t.relativePath,
      priority: t.priority,
      completed: t.completed
    }))
  };

  return `Current Development Context:
Branch: ${context.branch}

Pending Tasks:
${context.todos.filter(t => !t.completed).map(t =>
  `- [${t.priority.toUpperCase()}] ${t.name}\n  ${t.description}\n  File: ${t.file}`
).join('\n')}

Completed Tasks:
${context.todos.filter(t => t.completed).map(t =>
  `- ✓ ${t.name}`
).join('\n')}
`;
}

// Use in LLM prompt
const todoContext = await getTodoContextForLLM();
const llmPrompt = `${todoContext}\n\nWhat should I work on next?`;
```

## Best Practices for AI Agents

1. **Check Before Acting**: Always verify current state before making changes
   ```typescript
   const todos = api.getTodos();
   const exists = todos.some(t => t.id === todoId);
   if (exists) {
     await api.completeTodo(todoId);
   }
   ```

2. **Respect Branch Context**: Use branch-specific operations when working across branches
   ```typescript
   const currentBranch = api.getCurrentBranch();
   console.log(`Working on branch: ${currentBranch}`);
   ```

3. **Provide Feedback**: Inform the user when you complete todos on their behalf
   ```typescript
   await api.completeTodo(todoId);
   vscode.window.showInformationMessage(`AI completed: ${todo.name}`);
   ```

4. **Handle Errors Gracefully**:
   ```typescript
   try {
     await api.refreshTodos();
   } catch (error) {
     console.error('Failed to refresh todos:', error);
   }
   ```

5. **Use for Context, Not Control**: Use todos to understand what the developer needs to do, but let them maintain control

## Error Handling

```typescript
const todoExtension = vscode.extensions.getExtension('yourpublisher.developer-todos');

if (!todoExtension) {
  // Extension not installed
  vscode.window.showWarningMessage(
    'Developer Todos extension is not installed. Install it for better task tracking.'
  );
  return;
}

try {
  const api = await todoExtension.activate();

  // Extension doesn't have .todo.json
  const todos = api.getTodos();
  if (todos.length === 0) {
    console.log('No todos found. Make sure .todo.json exists in workspace root.');
  }

} catch (error) {
  console.error('Failed to access Developer Todos API:', error);
}
```

## Example: Full AI Agent Integration

```typescript
import * as vscode from 'vscode';

export class TodoAIAgent {
  private api: any;

  async initialize() {
    const extension = vscode.extensions.getExtension('yourpublisher.developer-todos');
    if (!extension) {
      throw new Error('Developer Todos extension not found');
    }
    this.api = await extension.activate();
  }

  async analyzeWorkload() {
    const branch = this.api.getCurrentBranch();
    const todos = this.api.getTodos();

    return {
      branch,
      totalTasks: todos.length,
      completedTasks: todos.filter(t => t.completed).length,
      criticalTasks: todos.filter(t => t.priority === 'high' && !t.completed),
      nextRecommendedTask: this.getNextTask(todos)
    };
  }

  private getNextTask(todos: any[]) {
    // Prioritize incomplete high-priority tasks
    const highPriority = todos.filter(t =>
      t.priority === 'high' && !t.completed
    );

    if (highPriority.length > 0) {
      return highPriority[0];
    }

    // Fall back to medium priority
    const mediumPriority = todos.filter(t =>
      t.priority === 'medium' && !t.completed
    );

    return mediumPriority[0] || null;
  }

  async completeTaskWhenDone(filePath: string, templateId: string) {
    const todos = this.api.getTodos();
    const todo = todos.find(t =>
      t.templateId === templateId &&
      t.filePath.includes(filePath) &&
      !t.completed
    );

    if (todo) {
      await this.api.completeTodo(todo.id);
      return true;
    }

    return false;
  }
}
```

## Summary

The Developer Todos extension provides a clean, branch-aware API for AI agents to:
- Understand what tasks are pending
- Track developer progress
- Provide contextual recommendations
- Automate task completion when appropriate
- Generate reports and summaries

This enables AI agents to be more context-aware and helpful in guiding developers through their work.
