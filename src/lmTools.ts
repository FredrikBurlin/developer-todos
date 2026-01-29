import * as vscode from 'vscode';
import { TodoManager } from './todoManager';
import { GitService } from './gitService';
import { TodoInstance } from './types';

/**
 * Input parameters for getRemainingTasks tool
 */
interface GetRemainingTasksInput {
  priority?: 'high' | 'medium' | 'low' | 'all';
}

/**
 * Input parameters for completeTodo tool
 */
interface CompleteTodoInput {
  todoId: string;
}

/**
 * Input parameters for getTaskInstructions tool
 */
interface GetTaskInstructionsInput {
  todoId: string;
}

/**
 * Language Model Tool: Get Remaining Tasks
 * Returns all incomplete and non-ignored todos for the current branch
 */
export class GetRemainingTasksTool implements vscode.LanguageModelTool<GetRemainingTasksInput> {
  constructor(
    private todoManager: TodoManager,
    private gitService: GitService
  ) {}

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<GetRemainingTasksInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    const priority = options.input.priority || 'all';
    const branch = this.gitService.getCurrentBranch();

    return {
      invocationMessage: `Getting remaining tasks for branch "${branch}"${priority !== 'all' ? ` (${priority} priority)` : ''}`,
      confirmationMessages: {
        title: 'Get Remaining Tasks',
        message: new vscode.MarkdownString(
          `Get remaining developer tasks for branch **${branch}**` +
          (priority !== 'all' ? ` filtered by **${priority}** priority` : '') +
          '?'
        ),
      },
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<GetRemainingTasksInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const priority = options.input.priority || 'all';
    const branch = this.gitService.getCurrentBranch();

    let todos = this.todoManager.getTodos();

    // Filter to remaining (not completed and not ignored)
    todos = todos.filter(t => !t.completed && !t.ignored);

    // Filter by priority if specified
    if (priority !== 'all') {
      todos = todos.filter(t => t.priority === priority);
    }

    if (todos.length === 0) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `No remaining tasks found for branch "${branch}"` +
          (priority !== 'all' ? ` with ${priority} priority` : '') +
          '.'
        ),
      ]);
    }

    const result = {
      branch,
      totalRemaining: todos.length,
      tasks: todos.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        priority: t.priority,
        filePath: t.relativePath || null,
        branchLevel: t.branchLevel || false,
        triggeringFiles: t.triggeringFiles || null,
        hasAiInstruction: !!t.aiInstruction,
      })),
    };

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
    ]);
  }
}

/**
 * Language Model Tool: Complete Todo
 * Marks a specific todo as completed
 */
export class CompleteTodoTool implements vscode.LanguageModelTool<CompleteTodoInput> {
  constructor(
    private todoManager: TodoManager,
    private gitService: GitService
  ) {}

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<CompleteTodoInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    const todoId = options.input.todoId;
    const todo = this.todoManager.getTodoById(todoId);

    if (!todo) {
      return {
        invocationMessage: `Task "${todoId}" not found`,
        confirmationMessages: {
          title: 'Complete Task',
          message: new vscode.MarkdownString(`Task with ID **${todoId}** was not found.`),
        },
      };
    }

    return {
      invocationMessage: `Completing task: ${todo.name}`,
      confirmationMessages: {
        title: 'Complete Task',
        message: new vscode.MarkdownString(
          `Mark the following task as **completed**?\n\n` +
          `**${todo.name}**\n\n` +
          `${todo.description}\n\n` +
          (todo.relativePath ? `File: \`${todo.relativePath}\`` : '_Branch-level task_')
        ),
      },
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<CompleteTodoInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const todoId = options.input.todoId;
    const todo = this.todoManager.getTodoById(todoId);

    if (!todo) {
      throw new Error(
        `Task with ID "${todoId}" not found. Use the getRemainingTasks tool to get valid task IDs.`
      );
    }

    if (todo.completed) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `Task "${todo.name}" is already completed.`
        ),
      ]);
    }

    await this.todoManager.completeTodo(todoId);

    vscode.window.showInformationMessage(`Completed: ${todo.name}`);

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(
        `Successfully marked task "${todo.name}" as completed.`
      ),
    ]);
  }
}

/**
 * Language Model Tool: Get Task Instructions
 * Returns the AI instructions for a specific todo
 */
export class GetTaskInstructionsTool implements vscode.LanguageModelTool<GetTaskInstructionsInput> {
  constructor(
    private todoManager: TodoManager,
    private gitService: GitService
  ) {}

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<GetTaskInstructionsInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    const todoId = options.input.todoId;
    const todo = this.todoManager.getTodoById(todoId);

    if (!todo) {
      return {
        invocationMessage: `Task "${todoId}" not found`,
        confirmationMessages: {
          title: 'Get Task Instructions',
          message: new vscode.MarkdownString(`Task with ID **${todoId}** was not found.`),
        },
      };
    }

    return {
      invocationMessage: `Getting instructions for: ${todo.name}`,
      confirmationMessages: {
        title: 'Get Task Instructions',
        message: new vscode.MarkdownString(
          `Get AI instructions for task **${todo.name}**?`
        ),
      },
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<GetTaskInstructionsInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const todoId = options.input.todoId;
    const todo = this.todoManager.getTodoById(todoId);

    if (!todo) {
      throw new Error(
        `Task with ID "${todoId}" not found. Use the getRemainingTasks tool to get valid task IDs.`
      );
    }

    const result = {
      id: todo.id,
      name: todo.name,
      description: todo.description,
      priority: todo.priority,
      filePath: todo.relativePath || null,
      branchLevel: todo.branchLevel || false,
      triggeringFiles: todo.triggeringFiles || null,
      completed: todo.completed,
      ignored: todo.ignored,
      aiInstruction: todo.aiInstruction || 'No specific AI instructions defined for this task. Use the description as guidance.',
    };

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
    ]);
  }
}

/**
 * Register all language model tools
 */
export function registerLanguageModelTools(
  context: vscode.ExtensionContext,
  todoManager: TodoManager,
  gitService: GitService
): void {
  // Register Get Remaining Tasks tool
  context.subscriptions.push(
    vscode.lm.registerTool(
      'developerTodos_getRemainingTasks',
      new GetRemainingTasksTool(todoManager, gitService)
    )
  );

  // Register Complete Todo tool
  context.subscriptions.push(
    vscode.lm.registerTool(
      'developerTodos_completeTodo',
      new CompleteTodoTool(todoManager, gitService)
    )
  );

  // Register Get Task Instructions tool
  context.subscriptions.push(
    vscode.lm.registerTool(
      'developerTodos_getTaskInstructions',
      new GetTaskInstructionsTool(todoManager, gitService)
    )
  );

  console.log('Developer Todos: Language model tools registered');
}
