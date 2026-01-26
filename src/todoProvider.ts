import * as vscode from 'vscode';
import { TodoInstance, PriorityGroup } from './types';
import { TodoManager } from './todoManager';
import { GitService } from './gitService';

/**
 * Tree item that can be either a priority group, todo item, or description
 */
export class TodoTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemType: 'group' | 'todoItem' | 'description',
    public readonly todo?: TodoInstance
  ) {
    super(label, collapsibleState);

    if (itemType === 'todoItem' && todo) {
      // Set context values based on state
      if (todo.ignored) {
        this.contextValue = 'todoItemIgnored';
        this.iconPath = new vscode.ThemeIcon('debug-stackframe-dot', new vscode.ThemeColor('disabledForeground'));
        // Apply strikethrough using resourceUri hack
        this.resourceUri = vscode.Uri.parse('strikethrough://strikethrough');
      } else if (todo.completed) {
        this.contextValue = 'todoItemCompleted';
        this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
      } else {
        this.contextValue = 'todoItem';
        this.iconPath = new vscode.ThemeIcon('circle-outline');
      }

      this.description = todo.relativePath;
      this.tooltip = `${todo.description}\n\nFile: ${todo.relativePath}`;

      // No default command - clicking expands/collapses to show description
    } else if (itemType === 'description') {
      this.contextValue = 'description';
      this.iconPath = new vscode.ThemeIcon('info');
    } else if (itemType === 'group') {
      this.contextValue = 'group';
    }
  }
}

/**
 * Filter modes for the todo view
 */
export type FilterMode = 'all' | 'remaining' | 'completed' | 'ignored';

/**
 * Tree data provider for the Developer Todos view
 */
export class TodoProvider implements vscode.TreeDataProvider<TodoTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TodoTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private filterMode: FilterMode = 'remaining'; // Default to showing remaining only

  constructor(
    private todoManager: TodoManager,
    private gitService: GitService
  ) {
    // Listen to todo changes
    this.todoManager.onTodosChanged(() => {
      this.refresh();
    });
  }

  /**
   * Set filter mode
   */
  public setFilterMode(mode: FilterMode): void {
    this.filterMode = mode;
    this.refresh();
  }

  /**
   * Get current filter mode
   */
  public getFilterMode(): FilterMode {
    return this.filterMode;
  }

  /**
   * Refresh the tree view
   */
  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Get tree item
   */
  public getTreeItem(element: TodoTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children for tree
   */
  public getChildren(element?: TodoTreeItem): Thenable<TodoTreeItem[]> {
    if (!this.todoManager.hasConfig()) {
      return Promise.resolve([]);
    }

    if (!element) {
      // Root level - return priority groups
      return Promise.resolve(this.getPriorityGroups());
    }

    if (element.itemType === 'group') {
      // Return todos for this priority group
      return Promise.resolve(this.getTodosForGroup(element.label));
    }

    if (element.itemType === 'todoItem' && element.todo) {
      // Return description as child
      return Promise.resolve([
        new TodoTreeItem(
          element.todo.description,
          vscode.TreeItemCollapsibleState.None,
          'description',
          element.todo
        ),
      ]);
    }

    return Promise.resolve([]);
  }

  /**
   * Get priority groups with todo counts
   */
  private getPriorityGroups(): TodoTreeItem[] {
    const todos = this.todoManager.getTodos();
    const currentBranch = this.gitService.getCurrentBranch();

    // Group todos by priority
    const groups: PriorityGroup[] = [
      {
        priority: 'high',
        label: 'High Priority',
        icon: '🔴',
        todos: todos.filter((t) => t.priority === 'high'),
      },
      {
        priority: 'medium',
        label: 'Medium Priority',
        icon: '🟡',
        todos: todos.filter((t) => t.priority === 'medium'),
      },
      {
        priority: 'low',
        label: 'Low Priority',
        icon: '⚪',
        todos: todos.filter((t) => t.priority === 'low'),
      },
    ];

    const items: TodoTreeItem[] = [];

    for (const group of groups) {
      const remaining = group.todos.filter((t) => !t.completed && !t.ignored);
      const completed = group.todos.filter((t) => t.completed);
      const ignored = group.todos.filter((t) => t.ignored);

      // Determine what to show based on filter mode
      let displayCount = 0;
      if (this.filterMode === 'all') {
        displayCount = group.todos.length;
      } else if (this.filterMode === 'remaining') {
        displayCount = remaining.length;
      } else if (this.filterMode === 'completed') {
        displayCount = completed.length;
      } else if (this.filterMode === 'ignored') {
        displayCount = ignored.length;
      }

      if (displayCount > 0) {
        const label = `${group.icon} ${group.label} (${remaining.length}${this.filterMode === 'all' ? `/${group.todos.length}` : ''})`;
        items.push(
          new TodoTreeItem(
            label,
            vscode.TreeItemCollapsibleState.Expanded,
            'group'
          )
        );
      }
    }

    // If no todos at all, show a message
    if (items.length === 0) {
      const emptyItem = new TodoTreeItem(
        `No todos for ${currentBranch}`,
        vscode.TreeItemCollapsibleState.None,
        'group'
      );
      emptyItem.iconPath = new vscode.ThemeIcon('pass');
      emptyItem.description = 'All done!';
      items.push(emptyItem);
    }

    return items;
  }

  /**
   * Get todos for a specific priority group
   */
  private getTodosForGroup(groupLabel: string): TodoTreeItem[] {
    const todos = this.todoManager.getTodos();

    let priority: 'high' | 'medium' | 'low';
    if (groupLabel.includes('High')) {
      priority = 'high';
    } else if (groupLabel.includes('Medium')) {
      priority = 'medium';
    } else {
      priority = 'low';
    }

    const allTodos = todos.filter((t) => t.priority === priority);

    // Separate by state
    const active = allTodos.filter((t) => !t.completed && !t.ignored);
    const completed = allTodos.filter((t) => t.completed && !t.ignored);
    const ignored = allTodos.filter((t) => t.ignored);

    // Determine what to show based on filter mode
    let todosToShow: TodoInstance[] = [];
    if (this.filterMode === 'all') {
      // Show active first, then completed, then ignored (at bottom)
      todosToShow = [...active, ...completed, ...ignored];
    } else if (this.filterMode === 'remaining') {
      todosToShow = active;
    } else if (this.filterMode === 'completed') {
      todosToShow = completed;
    } else if (this.filterMode === 'ignored') {
      todosToShow = ignored;
    }

    return todosToShow.map((todo) => {
      return new TodoTreeItem(
        todo.name,
        vscode.TreeItemCollapsibleState.Collapsed, // Collapsible to show description
        'todoItem',
        todo
      );
    });
  }

  /**
   * Get description for tree view (shows branch name)
   */
  public getDescription(): string {
    const branch = this.gitService.getCurrentBranch();
    const todos = this.todoManager.getTodos();
    const activeTodos = todos.filter((t) => !t.completed && !t.ignored);

    return `[${branch}] ${activeTodos.length} active`;
  }
}
