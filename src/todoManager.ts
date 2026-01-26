import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TodoConfig, TodoTemplate, TodoInstance, TodoState } from './types';
import { TemplateMatcher } from './templateMatcher';
import { GitService } from './gitService';

/**
 * Manages todo instances and state across branches
 */
export class TodoManager {
  private templates: TodoTemplate[] = [];
  private todos: Map<string, Map<string, TodoInstance>> = new Map(); // branch -> todoId -> TodoInstance
  private templateMatcher: TemplateMatcher;
  private gitService: GitService;
  private context: vscode.ExtensionContext;
  private workspaceRoot: string;

  private onTodosChangedEmitter = new vscode.EventEmitter<void>();
  public readonly onTodosChanged = this.onTodosChangedEmitter.event;

  constructor(
    context: vscode.ExtensionContext,
    gitService: GitService,
    workspaceRoot: string
  ) {
    this.context = context;
    this.gitService = gitService;
    this.workspaceRoot = workspaceRoot;
    this.templateMatcher = new TemplateMatcher();
  }

  /**
   * Initialize by loading templates and existing state
   */
  public async initialize(): Promise<void> {
    await this.loadTemplates();
    await this.loadState();
  }

  /**
   * Load templates from .todo.json
   */
  public async loadTemplates(): Promise<boolean> {
    const configPath = path.join(this.workspaceRoot, '.todo.json');

    if (!fs.existsSync(configPath)) {
      console.warn('.todo.json not found in workspace root');
      this.templates = [];
      return false;
    }

    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      const config: TodoConfig = JSON.parse(content);

      if (!config.templates || !Array.isArray(config.templates)) {
        vscode.window.showErrorMessage(
          'Invalid .todo.json: templates array is required'
        );
        this.templates = [];
        return false;
      }

      this.templates = config.templates;
      console.log(`Loaded ${this.templates.length} todo templates`);
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to load .todo.json: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      this.templates = [];
      return false;
    }
  }

  /**
   * Load persisted state from workspace storage
   */
  private async loadState(): Promise<void> {
    const state = this.context.workspaceState.get<TodoState>('todoState', {});

    for (const [branch, branchData] of Object.entries(state)) {
      const branchTodos = new Map<string, TodoInstance>();

      for (const [todoId, todoData] of Object.entries(branchData.todos)) {
        const template = this.templates.find((t) => t.id === todoData.templateId);

        if (!template) {
          continue; // Template no longer exists
        }

        const relativePath = path.relative(this.workspaceRoot, todoData.filePath);

        branchTodos.set(todoId, {
          id: todoId,
          templateId: template.id,
          name: template.name,
          description: template.description,
          filePath: todoData.filePath,
          relativePath,
          priority: template.priority || 'medium',
          completed: todoData.completed,
          completedAt: todoData.completedAt,
          ignored: todoData.ignored || false,
          ignoredAt: todoData.ignoredAt,
          branch,
        });
      }

      this.todos.set(branch, branchTodos);
    }
  }

  /**
   * Save current state to workspace storage
   */
  private async saveState(): Promise<void> {
    const state: TodoState = {};

    for (const [branch, branchTodos] of this.todos.entries()) {
      state[branch] = { todos: {} };

      for (const [todoId, todo] of branchTodos.entries()) {
        state[branch].todos[todoId] = {
          completed: todo.completed,
          completedAt: todo.completedAt,
          ignored: todo.ignored,
          ignoredAt: todo.ignoredAt,
          filePath: todo.filePath,
          templateId: todo.templateId,
        };
      }
    }

    await this.context.workspaceState.update('todoState', state);
  }

  /**
   * Check if a file is likely binary based on extension
   */
  private isBinaryFile(filePath: string): boolean {
    const binaryExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
      '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',
      '.exe', '.dll', '.so', '.dylib',
      '.mp3', '.mp4', '.avi', '.mov', '.wav',
      '.ttf', '.otf', '.woff', '.woff2', '.eot',
      '.class', '.jar', '.war',
    ];

    const ext = path.extname(filePath).toLowerCase();
    return binaryExtensions.includes(ext);
  }

  /**
   * Create todos for a file based on matching templates
   */
  public async createTodosForFile(
    filePath: string,
    branch?: string
  ): Promise<void> {
    const currentBranch = branch || this.gitService.getCurrentBranch();
    const relativePath = path.relative(this.workspaceRoot, filePath);

    // Skip binary files
    if (this.isBinaryFile(filePath)) {
      return;
    }

    // Quick path check before reading file
    if (!this.templateMatcher.pathMatchesAnyTemplate(relativePath, this.templates)) {
      return;
    }

    // Read file content
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error(`Failed to read file ${filePath}:`, error);
      return;
    }

    // Find matching templates
    const matchingTemplates = this.templateMatcher.getMatchingTemplates(
      relativePath,
      content,
      this.templates
    );

    if (matchingTemplates.length === 0) {
      return;
    }

    // Get or create branch todos map
    if (!this.todos.has(currentBranch)) {
      this.todos.set(currentBranch, new Map());
    }

    const branchTodos = this.todos.get(currentBranch)!;
    let todosAdded = false;

    // Create todos for each matching template
    for (const template of matchingTemplates) {
      const todoId = `${template.id}:${relativePath}`;

      // Skip if todo already exists
      if (branchTodos.has(todoId)) {
        continue;
      }

      const todo: TodoInstance = {
        id: todoId,
        templateId: template.id,
        name: template.name,
        description: template.description,
        filePath,
        relativePath,
        priority: template.priority || 'medium',
        completed: false,
        ignored: false,
        branch: currentBranch,
      };

      branchTodos.set(todoId, todo);
      todosAdded = true;
    }

    if (todosAdded) {
      await this.saveState();
      this.onTodosChangedEmitter.fire();
    }
  }

  /**
   * Mark a todo as complete
   */
  public async completeTodo(todoId: string, branch?: string): Promise<void> {
    const currentBranch = branch || this.gitService.getCurrentBranch();
    const branchTodos = this.todos.get(currentBranch);

    if (!branchTodos) {
      return;
    }

    const todo = branchTodos.get(todoId);
    if (!todo) {
      return;
    }

    todo.completed = true;
    todo.completedAt = new Date().toISOString();

    await this.saveState();
    this.onTodosChangedEmitter.fire();
  }

  /**
   * Mark a todo as incomplete (reopen it)
   */
  public async reopenTodo(todoId: string, branch?: string): Promise<void> {
    const currentBranch = branch || this.gitService.getCurrentBranch();
    const branchTodos = this.todos.get(currentBranch);

    if (!branchTodos) {
      return;
    }

    const todo = branchTodos.get(todoId);
    if (!todo) {
      return;
    }

    todo.completed = false;
    todo.completedAt = undefined;

    await this.saveState();
    this.onTodosChangedEmitter.fire();
  }

  /**
   * Mark a todo as ignored/skipped
   */
  public async ignoreTodo(todoId: string, branch?: string): Promise<void> {
    const currentBranch = branch || this.gitService.getCurrentBranch();
    const branchTodos = this.todos.get(currentBranch);

    if (!branchTodos) {
      return;
    }

    const todo = branchTodos.get(todoId);
    if (!todo) {
      return;
    }

    todo.ignored = true;
    todo.ignoredAt = new Date().toISOString();

    await this.saveState();
    this.onTodosChangedEmitter.fire();
  }

  /**
   * Unignore a todo (reopen from ignored state)
   */
  public async unignoreTodo(todoId: string, branch?: string): Promise<void> {
    const currentBranch = branch || this.gitService.getCurrentBranch();
    const branchTodos = this.todos.get(currentBranch);

    if (!branchTodos) {
      return;
    }

    const todo = branchTodos.get(todoId);
    if (!todo) {
      return;
    }

    todo.ignored = false;
    todo.ignoredAt = undefined;

    await this.saveState();
    this.onTodosChangedEmitter.fire();
  }

  /**
   * Get all todos for a specific branch
   */
  public getTodos(branch?: string): TodoInstance[] {
    const currentBranch = branch || this.gitService.getCurrentBranch();
    const branchTodos = this.todos.get(currentBranch);

    if (!branchTodos) {
      return [];
    }

    return Array.from(branchTodos.values());
  }

  /**
   * Get all todos across all branches (for AI agents)
   */
  public getAllBranchTodos(): Map<string, TodoInstance[]> {
    const result = new Map<string, TodoInstance[]>();

    for (const [branch, branchTodos] of this.todos.entries()) {
      result.set(branch, Array.from(branchTodos.values()));
    }

    return result;
  }

  /**
   * Refresh todos by scanning changed/staged files only
   */
  public async refreshTodos(branch?: string): Promise<void> {
    const currentBranch = branch || this.gitService.getCurrentBranch();

    // Get only changed/staged files from git
    const changedFiles = this.gitService.getChangedFiles();

    if (changedFiles.length === 0) {
      vscode.window.showInformationMessage('No changed or staged files to scan');
      return;
    }

    for (const filePath of changedFiles) {
      await this.createTodosForFile(filePath, currentBranch);
    }

    this.onTodosChangedEmitter.fire();
  }

  /**
   * Clear all todos for current branch
   */
  public async clearBranchTodos(branch?: string): Promise<void> {
    const currentBranch = branch || this.gitService.getCurrentBranch();

    this.todos.delete(currentBranch);
    await this.saveState();
    this.onTodosChangedEmitter.fire();
  }

  /**
   * Handle branch switch
   */
  public async switchBranch(newBranch: string): Promise<void> {
    // State is already loaded, just notify UI to refresh
    this.onTodosChangedEmitter.fire();
  }

  /**
   * Check if .todo.json exists
   */
  public hasConfig(): boolean {
    const configPath = path.join(this.workspaceRoot, '.todo.json');
    return fs.existsSync(configPath);
  }

  /**
   * Get loaded templates
   */
  public getTemplates(): TodoTemplate[] {
    return this.templates;
  }

  /**
   * Dispose resources
   */
  public dispose() {
    this.onTodosChangedEmitter.dispose();
  }
}
