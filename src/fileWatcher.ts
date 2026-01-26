import * as vscode from 'vscode';
import { TodoManager } from './todoManager';
import { GitService } from './gitService';

/**
 * Monitors file system changes and triggers todo creation
 */
export class FileWatcher {
  private disposables: vscode.Disposable[] = [];
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEBOUNCE_DELAY = 1000; // 1 second

  constructor(
    private todoManager: TodoManager,
    private gitService: GitService
  ) {
    this.setupWatchers();
  }

  /**
   * Setup file system watchers
   */
  private setupWatchers(): void {
    // Watch for newly created files
    const createWatcher = vscode.workspace.onDidCreateFiles((event) => {
      for (const file of event.files) {
        this.handleFileChange(file.fsPath);
      }
    });

    // Watch for file content changes
    const changeWatcher = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.scheme === 'file') {
        this.handleFileChange(event.document.uri.fsPath);
      }
    });

    // Watch for file saves (more reliable than onChange)
    const saveWatcher = vscode.workspace.onDidSaveTextDocument((document) => {
      if (document.uri.scheme === 'file') {
        this.handleFileChange(document.uri.fsPath);
      }
    });

    this.disposables.push(createWatcher, changeWatcher, saveWatcher);

    // Watch for .todo.json changes to reload templates
    const configWatcher = vscode.workspace.createFileSystemWatcher(
      '**/.todo.json'
    );

    configWatcher.onDidChange(() => {
      this.handleConfigChange();
    });

    configWatcher.onDidCreate(() => {
      this.handleConfigChange();
    });

    this.disposables.push(configWatcher);
  }

  /**
   * Handle file changes with debouncing
   */
  private handleFileChange(filePath: string): void {
    // Skip if file is .todo.json
    if (filePath.endsWith('.todo.json')) {
      return;
    }

    // Clear existing timer for this file
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.processFileChange(filePath);
      this.debounceTimers.delete(filePath);
    }, this.DEBOUNCE_DELAY);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Process file change after debounce
   */
  private async processFileChange(filePath: string): Promise<void> {
    try {
      // Only process if file is changed or staged in git
      if (!this.gitService.isFileChanged(filePath)) {
        return;
      }

      const currentBranch = this.gitService.getCurrentBranch();
      await this.todoManager.createTodosForFile(filePath, currentBranch);
    } catch (error) {
      console.error(`Error processing file change for ${filePath}:`, error);
    }
  }

  /**
   * Handle .todo.json configuration changes
   */
  private async handleConfigChange(): Promise<void> {
    await this.todoManager.loadTemplates();
    vscode.window.showInformationMessage(
      'Todo templates reloaded. Run "Refresh Todos" to apply changes.'
    );
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    // Clear all pending timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Dispose all watchers
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}
