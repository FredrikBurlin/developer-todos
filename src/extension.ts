import * as vscode from 'vscode';
import * as path from 'path';
import { GitService } from './gitService';
import { TodoManager } from './todoManager';
import { TodoProvider } from './todoProvider';
import { FileWatcher } from './fileWatcher';
import { TodoInstance } from './types';

let gitService: GitService;
let todoManager: TodoManager;
let todoProvider: TodoProvider;
let fileWatcher: FileWatcher;

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext) {
  console.log('Developer Todos extension is activating...');

  // Get workspace root
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showWarningMessage(
      'Developer Todos: No workspace folder found. Please open a folder.'
    );
    return;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;

  // Initialize services
  gitService = new GitService();
  await gitService.waitForGit(3000);

  todoManager = new TodoManager(context, gitService, workspaceRoot);
  await todoManager.initialize();

  // Check if .todo.json exists
  if (!todoManager.hasConfig()) {
    vscode.window.showInformationMessage(
      'Developer Todos: No .todo.json found in workspace. Create one to get started!',
      'Create Example'
    ).then((selection) => {
      if (selection === 'Create Example') {
        createExampleConfig(workspaceRoot);
      }
    });
  }

  // Setup tree view
  todoProvider = new TodoProvider(todoManager, gitService);

  const treeView = vscode.window.createTreeView('developerTodosView', {
    treeDataProvider: todoProvider,
    showCollapseAll: true,
  });

  // Update tree view description with branch info
  const updateTreeViewDescription = () => {
    treeView.description = todoProvider.getDescription();
  };
  updateTreeViewDescription();
  todoManager.onTodosChanged(updateTreeViewDescription);

  // Setup file watcher
  fileWatcher = new FileWatcher(todoManager, gitService);

  // Setup branch change listener
  gitService.onBranchChange(async (newBranch) => {
    console.log(`Branch changed to: ${newBranch}`);
    await todoManager.switchBranch(newBranch);
    updateTreeViewDescription();
  });

  // Register commands
  const refreshCommand = vscode.commands.registerCommand(
    'developerTodos.refresh',
    async () => {
      await todoManager.refreshTodos();
      vscode.window.showInformationMessage('Todos refreshed');
    }
  );

  const showFilterMenuCommand = vscode.commands.registerCommand(
    'developerTodos.showFilterMenu',
    async () => {
      const currentMode = todoProvider.getFilterMode();
      const options = [
        { label: '$(list-unordered) All Todos', value: 'all' as const, description: currentMode === 'all' ? '(Current)' : '' },
        { label: '$(circle-outline) Remaining Only', value: 'remaining' as const, description: currentMode === 'remaining' ? '(Current)' : '' },
        { label: '$(check) Completed Only', value: 'completed' as const, description: currentMode === 'completed' ? '(Current)' : '' },
        { label: '$(circle-slash) Ignored Only', value: 'ignored' as const, description: currentMode === 'ignored' ? '(Current)' : '' },
      ];

      const selected = await vscode.window.showQuickPick(options, {
        placeHolder: 'Select filter mode',
      });

      if (selected) {
        todoProvider.setFilterMode(selected.value);
        vscode.window.showInformationMessage(`Filter: ${selected.label.replace(/\$\([^)]+\)\s*/, '')}`);
      }
    }
  );

  const filterAllCommand = vscode.commands.registerCommand(
    'developerTodos.filterAll',
    () => {
      todoProvider.setFilterMode('all');
      vscode.window.showInformationMessage('Showing all todos');
    }
  );

  const filterRemainingCommand = vscode.commands.registerCommand(
    'developerTodos.filterRemaining',
    () => {
      todoProvider.setFilterMode('remaining');
      vscode.window.showInformationMessage('Showing remaining todos only');
    }
  );

  const filterCompletedCommand = vscode.commands.registerCommand(
    'developerTodos.filterCompleted',
    () => {
      todoProvider.setFilterMode('completed');
      vscode.window.showInformationMessage('Showing completed todos only');
    }
  );

  const filterIgnoredCommand = vscode.commands.registerCommand(
    'developerTodos.filterIgnored',
    () => {
      todoProvider.setFilterMode('ignored');
      vscode.window.showInformationMessage('Showing ignored todos only');
    }
  );

  const navigateToFileCommand = vscode.commands.registerCommand(
    'developerTodos.navigateToFile',
    async (item: any) => {
      if (item && item.todo) {
        const todo: TodoInstance = item.todo;
        try {
          const fileUri = vscode.Uri.file(todo.filePath);
          const document = await vscode.workspace.openTextDocument(fileUri);
          await vscode.window.showTextDocument(document);
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to open file: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }
  );

  const completeTodoCommand = vscode.commands.registerCommand(
    'developerTodos.completeTodo',
    async (item: any) => {
      if (item && item.todo) {
        const todo: TodoInstance = item.todo;
        await todoManager.completeTodo(todo.id);
        vscode.window.showInformationMessage(`Completed: ${todo.name}`);
      }
    }
  );

  const reopenTodoCommand = vscode.commands.registerCommand(
    'developerTodos.reopenTodo',
    async (item: any) => {
      if (item && item.todo) {
        const todo: TodoInstance = item.todo;
        await todoManager.reopenTodo(todo.id);
        vscode.window.showInformationMessage(`Reopened: ${todo.name}`);
      }
    }
  );

  const ignoreTodoCommand = vscode.commands.registerCommand(
    'developerTodos.ignoreTodo',
    async (item: any) => {
      if (item && item.todo) {
        const todo: TodoInstance = item.todo;
        await todoManager.ignoreTodo(todo.id);
        vscode.window.showInformationMessage(`Ignored: ${todo.name}`);
      }
    }
  );

  const unignoreTodoCommand = vscode.commands.registerCommand(
    'developerTodos.unignoreTodo',
    async (item: any) => {
      if (item && item.todo) {
        const todo: TodoInstance = item.todo;
        await todoManager.unignoreTodo(todo.id);
        vscode.window.showInformationMessage(`Unignored: ${todo.name}`);
      }
    }
  );

  const openFileCommand = vscode.commands.registerCommand(
    'developerTodos.openFile',
    async (todo: TodoInstance) => {
      if (!todo) {
        return;
      }

      try {
        const fileUri = vscode.Uri.file(todo.filePath);

        // Try to open as text document first
        try {
          const document = await vscode.workspace.openTextDocument(fileUri);
          await vscode.window.showTextDocument(document);
        } catch (textError) {
          // If it's a binary file, open with default viewer
          await vscode.commands.executeCommand('vscode.open', fileUri);
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to open file: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );

  const showTemplateCommand = vscode.commands.registerCommand(
    'developerTodos.showTemplate',
    async (item: any) => {
      if (item && item.todo) {
        const todo: TodoInstance = item.todo;
        const template = todoManager
          .getTemplates()
          .find((t) => t.id === todo.templateId);

        if (template) {
          const message = `**${template.name}**\n\n${template.description}\n\n` +
            `Pattern: \`${template.applyTo}\`\n` +
            (template.fileContains ? `Contains: \`${template.fileContains}\`\n` : '') +
            (template.excludeFileContains ? `Excludes: \`${template.excludeFileContains}\`\n` : '') +
            `Priority: ${template.priority || 'medium'}`;

          vscode.window.showInformationMessage(message);
        }
      }
    }
  );

  const clearBranchTodosCommand = vscode.commands.registerCommand(
    'developerTodos.clearBranchTodos',
    async () => {
      const branch = gitService.getCurrentBranch();
      const result = await vscode.window.showWarningMessage(
        `Clear all todos for branch "${branch}"?`,
        { modal: true },
        'Clear'
      );

      if (result === 'Clear') {
        await todoManager.clearBranchTodos();
        vscode.window.showInformationMessage(`Cleared todos for ${branch}`);
      }
    }
  );

  // Add all to subscriptions
  context.subscriptions.push(
    treeView,
    refreshCommand,
    showFilterMenuCommand,
    filterAllCommand,
    filterRemainingCommand,
    filterCompletedCommand,
    filterIgnoredCommand,
    navigateToFileCommand,
    completeTodoCommand,
    reopenTodoCommand,
    ignoreTodoCommand,
    unignoreTodoCommand,
    openFileCommand,
    showTemplateCommand,
    clearBranchTodosCommand,
    gitService,
    todoManager,
    fileWatcher
  );

  console.log('Developer Todos extension activated successfully');

  // Return API for AI agents and other extensions
  return {
    getCurrentBranch: () => gitService.getCurrentBranch(),
    getTodos: (branch?: string) => todoManager.getTodos(branch),
    completeTodo: (id: string, branch?: string) =>
      todoManager.completeTodo(id, branch),
    reopenTodo: (id: string, branch?: string) =>
      todoManager.reopenTodo(id, branch),
    ignoreTodo: (id: string, branch?: string) =>
      todoManager.ignoreTodo(id, branch),
    unignoreTodo: (id: string, branch?: string) =>
      todoManager.unignoreTodo(id, branch),
    refreshTodos: (branch?: string) => todoManager.refreshTodos(branch),
    getAllBranchTodos: () => todoManager.getAllBranchTodos(),
  };
}

/**
 * Extension deactivation
 */
export function deactivate() {
  console.log('Developer Todos extension deactivated');
}

/**
 * Create an example .todo.json configuration
 */
async function createExampleConfig(workspaceRoot: string): Promise<void> {
  const configPath = path.join(workspaceRoot, '.todo.json');

  const exampleConfig = {
    templates: [
      {
        id: 'apex-permission',
        name: 'Add Permission for the controller',
        description: 'User needs permission to use the apex controller',
        applyTo: 'force-app/main/default/classes/**/*.cls',
        fileContains: '@AuraEnabled',
        priority: 'high',
      },
      {
        id: 'lwc-add-to-page',
        name: 'Add LWC on a page',
        description:
          'The LWC needs to be added to a flexipage or similar to show up for the user',
        applyTo: 'force-app/main/default/lwc/**',
        priority: 'medium',
      },
      {
        id: 'apex-test-class',
        name: 'Create test class',
        description: 'Add test coverage for the new Apex class',
        applyTo: 'force-app/main/default/classes/**/*.cls',
        fileContains: 'public class',
        excludeFileContains: '@isTest',
        priority: 'high',
      },
      {
        id: 'permission-set-to-group',
        name: 'Add to permission set group',
        description:
          'New permission set should be added to a permission set group or assigned to users',
        applyTo: 'force-app/main/default/permissionsets/**/*.permissionset-meta.xml',
        priority: 'medium',
      },
    ],
  };

  try {
    const fs = require('fs');
    fs.writeFileSync(configPath, JSON.stringify(exampleConfig, null, 2), 'utf-8');

    vscode.window.showInformationMessage(
      'Created example .todo.json. Customize it for your needs!'
    );

    // Open the file
    const document = await vscode.workspace.openTextDocument(configPath);
    await vscode.window.showTextDocument(document);
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to create .todo.json: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
