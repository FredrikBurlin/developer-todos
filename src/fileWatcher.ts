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

    // Listen to Git state changes (staging, unstaging, etc.)
    // This ensures todos update when files are staged via git commands
    this.setupGitStateListener();
  }

  /**
   * Setup Git state change listener
   */
  private async setupGitStateListener(): Promise<void> {
    // Use a debounced refresh for git state changes
    let gitStateTimer: NodeJS.Timeout | undefined;
    const GIT_DEBOUNCE = 500; // Shorter delay for Git state changes

    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (!gitExtension) {
      return;
    }

    try {
      const git = await gitExtension.activate();
      const api = git.getAPI(1);
      if (api && api.repositories.length > 0) {
        const repo = api.repositories[0];

        // Listen to repository state changes
        const stateListener = repo.state.onDidChange(() => {
          // Debounce to avoid excessive refreshes
          if (gitStateTimer) {
            clearTimeout(gitStateTimer);
          }

          gitStateTimer = setTimeout(async () => {
            // Refresh all todos when git state changes
            await this.todoManager.refreshTodos();
          }, GIT_DEBOUNCE);
        });

        this.disposables.push(stateListener);
      }
    } catch (error) {
      console.error('Failed to setup Git state listener:', error);
    }
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
