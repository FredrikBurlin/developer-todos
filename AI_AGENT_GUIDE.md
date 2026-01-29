# AI Agent Integration Guide

This guide explains how AI agents (like Claude, GitHub Copilot, or custom agents) can interact with the Developer Todos extension.

## Overview

The Developer Todos extension provides native integration with AI assistants through VS Code's Language Model Tools API. This allows AI assistants like GitHub Copilot to directly interact with your developer tasks.

---

## VS Code Language Model Tools

The extension registers Language Model Tools that are automatically available to AI assistants in VS Code 1.93.0+.

### Available Tools

| Tool Name | Reference | Description |
|-----------|-----------|-------------|
| `developerTodos_getRemainingTasks` | `#devTodos` | Get all remaining (incomplete) tasks for the current branch |
| `developerTodos_completeTodo` | `#completeTodo` | Mark a specific task as completed |
| `developerTodos_getTaskInstructions` | `#taskInstructions` | Get detailed AI instructions for completing a task |

---

## Tool: Get Remaining Tasks (`#devTodos`)

Returns all incomplete and non-ignored todos for the current git branch.

### Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `priority` | string | No | Filter by priority: `"high"`, `"medium"`, `"low"`, or `"all"` (default) |

### Output

```json
{
  "branch": "feature/auth-flow",
  "totalRemaining": 3,
  "tasks": [
    {
      "id": "apex-permission:force-app/main/default/classes/AuthController.cls",
      "name": "Add Permission for the controller",
      "description": "User needs permission to use the apex controller",
      "priority": "high",
      "filePath": "force-app/main/default/classes/AuthController.cls",
      "branchLevel": false,
      "triggeringFiles": null,
      "hasAiInstruction": true
    }
  ]
}
```

### Example Prompts

- "What tasks do I need to complete? #devTodos"
- "Show me high priority tasks #devTodos"
- "List remaining work for this branch #devTodos"

---

## Tool: Complete Task (`#completeTodo`)

Marks a specific todo as completed.

### Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `todoId` | string | Yes | The unique ID of the todo (from `getRemainingTasks`) |

### Output

```
Successfully marked task "Add Permission for the controller" as completed.
```

### Example Prompts

- "Mark the apex-permission task as done #completeTodo"
- "Complete the test class todo #completeTodo"

---

## Tool: Get Task Instructions (`#taskInstructions`)

Returns detailed AI instructions for completing a specific task. Templates can include an `aiInstruction` field with step-by-step guidance.

### Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `todoId` | string | Yes | The unique ID of the todo (from `getRemainingTasks`) |

### Output

```json
{
  "id": "apex-test-class:force-app/main/default/classes/AuthController.cls",
  "name": "Create test class",
  "description": "Add test coverage for the new Apex class",
  "priority": "high",
  "filePath": "force-app/main/default/classes/AuthController.cls",
  "branchLevel": false,
  "aiInstruction": "Create a test class with @isTest annotation. Include test methods for all public methods. Use Test.startTest()/Test.stopTest() for governor limits. Aim for 90%+ coverage."
}
```

### Example Prompts

- "How do I complete this task? #taskInstructions"
- "What are the instructions for the test class todo? #taskInstructions"

---

## AI Instructions in Templates

The `aiInstruction` field in templates provides detailed guidance for AI agents:

```json
{
  "id": "apex-test-class",
  "name": "Create test class",
  "description": "Add test coverage for the new Apex class",
  "applyTo": "**/classes/**/*.cls",
  "priority": "high",
  "aiInstruction": "Create a test class named [ClassName]Test with @isTest annotation. Use @TestSetup for test data. Cover: 1) Positive scenarios, 2) Negative scenarios, 3) Bulk operations (200+ records), 4) Governor limit tests with Test.startTest()/Test.stopTest(). Aim for 90%+ coverage."
}
```

### Writing Effective AI Instructions

1. **Be specific**: Include exact steps, file naming conventions, and patterns to follow
2. **Include context**: Mention relevant frameworks, tools, or standards
3. **Set expectations**: Define coverage targets, code quality requirements
4. **Reference resources**: Point to documentation or examples when helpful

### Example AI Instructions

**For Test Classes:**
```json
"aiInstruction": "Create a test class with @isTest annotation. Use @TestSetup for shared test data. Cover positive, negative, and bulk scenarios. Aim for 90%+ coverage."
```

**For Security Reviews:**
```json
"aiInstruction": "Run 'npm audit'. Review for: SQL injection, XSS, hardcoded secrets, missing auth checks. Use OWASP Top 10 as checklist."
```

**For Deployment Tasks:**
```json
"aiInstruction": "Create DEPLOYMENT.md with: pre-deployment checklist, step-by-step instructions, environment variables, database migrations, rollback procedure."
```

---

## Workflow Example

Here's a typical workflow using the tools:

1. **Get remaining tasks**: Ask "What tasks do I need to complete? #devTodos"
2. **Get instructions for a task**: Ask "How do I complete the test class task? #taskInstructions"
3. **Follow the AI instructions** to implement the task
4. **Mark as complete**: Say "Complete the apex-test-class task #completeTodo"

---

## TodoInstance Interface

When working with tasks, here's the structure you'll receive:

```typescript
interface TodoInstance {
  id: string;                    // Unique ID: "templateId:relativePath" or "branch:templateId"
  templateId: string;            // Template that created this todo
  name: string;                  // Display name
  description: string;           // Full description
  filePath?: string;             // Absolute file path (undefined for branch-level)
  relativePath?: string;         // Workspace-relative path (undefined for branch-level)
  priority: 'high' | 'medium' | 'low';
  completed: boolean;            // Completion status
  completedAt?: string;          // ISO timestamp when completed
  ignored: boolean;              // Ignored/skipped status
  ignoredAt?: string;            // ISO timestamp when ignored
  branch: string;                // Branch this todo belongs to
  branchLevel?: boolean;         // True if this is a branch-level todo
  triggeringFiles?: string[];    // Files that triggered this branch-level todo
  aiInstruction?: string;        // AI-specific instructions for completing this task
}
```

---

## Summary

The Developer Todos extension provides native AI integration through VS Code's Language Model Tools API, enabling AI assistants to:

- **Understand** what tasks are pending (`#devTodos`)
- **Learn** how to complete tasks (`#taskInstructions`)
- **Track** task completion (`#completeTodo`)

This makes AI assistants more context-aware and helpful in guiding developers through their work.
