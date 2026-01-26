import * as vscode from 'vscode';

export interface GitAPI {
  repositories: Repository[];
  onDidOpenRepository: vscode.Event<Repository>;
  onDidCloseRepository: vscode.Event<Repository>;
}

export interface Repository {
  state: RepositoryState;
  onDidRunGitStatus: vscode.Event<void>;
}

export interface RepositoryState {
  HEAD: Branch | undefined;
  workingTreeChanges: Change[];
  indexChanges: Change[];
}

export interface Branch {
  name: string | undefined;
  commit: string | undefined;
}

export interface Change {
  uri: vscode.Uri;
  status: number;
}

/**
 * Service for interacting with Git to detect branches and monitor changes
 */
export class GitService {
  private gitExtension: vscode.Extension<any> | undefined;
  private gitAPI: GitAPI | undefined;
  private repository: Repository | undefined;
  private onBranchChangeEmitter = new vscode.EventEmitter<string>();
  public readonly onBranchChange = this.onBranchChangeEmitter.event;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Get the built-in Git extension
    this.gitExtension = vscode.extensions.getExtension('vscode.git');

    if (!this.gitExtension) {
      console.warn('Git extension not found');
      return;
    }

    if (!this.gitExtension.isActive) {
      await this.gitExtension.activate();
    }

    this.gitAPI = this.gitExtension.exports.getAPI(1);

    if (this.gitAPI && this.gitAPI.repositories.length > 0) {
      this.repository = this.gitAPI.repositories[0];
      this.setupListeners();
    }

    // Listen for new repositories
    this.gitAPI?.onDidOpenRepository((repo) => {
      if (!this.repository) {
        this.repository = repo;
        this.setupListeners();
      }
    });
  }

  private setupListeners() {
    if (!this.repository) {
      return;
    }

    let lastBranch = this.getCurrentBranch();

    // Listen to git status changes (includes branch changes)
    this.repository.onDidRunGitStatus(() => {
      const currentBranch = this.getCurrentBranch();
      if (currentBranch !== lastBranch) {
        lastBranch = currentBranch;
        this.onBranchChangeEmitter.fire(currentBranch);
      }
    });
  }

  /**
   * Get the current branch name
   */
  public getCurrentBranch(): string {
    if (!this.repository?.state.HEAD) {
      return 'default'; // Fallback for non-git workspaces
    }

    const head = this.repository.state.HEAD;

    // Check if we're in detached HEAD state
    if (!head.name && head.commit) {
      return `detached-${head.commit.substring(0, 7)}`;
    }

    return head.name || 'default';
  }

  /**
   * Check if the workspace is a git repository
   */
  public isGitRepo(): boolean {
    return !!this.repository;
  }

  /**
   * Wait for git to be initialized (useful during activation)
   */
  public async waitForGit(timeoutMs: number = 5000): Promise<void> {
    const startTime = Date.now();

    while (!this.repository && Date.now() - startTime < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Get list of changed files (working tree changes + staged changes)
   */
  public getChangedFiles(): string[] {
    if (!this.repository) {
      return [];
    }

    const state = this.repository.state;
    const changedFiles = new Set<string>();

    // Add working tree changes
    state.workingTreeChanges?.forEach((change) => {
      changedFiles.add(change.uri.fsPath);
    });

    // Add staged changes
    state.indexChanges?.forEach((change) => {
      changedFiles.add(change.uri.fsPath);
    });

    return Array.from(changedFiles);
  }

  /**
   * Check if a file is changed or staged
   */
  public isFileChanged(filePath: string): boolean {
    if (!this.repository) {
      return true; // If no git, treat all files as "changed"
    }

    const changedFiles = this.getChangedFiles();
    return changedFiles.includes(filePath);
  }

  /**
   * Dispose resources
   */
  public dispose() {
    this.onBranchChangeEmitter.dispose();
  }
}
