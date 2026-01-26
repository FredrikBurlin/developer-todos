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
      // Set different context values for completed vs incomplete
      this.contextValue = todo.completed ? 'todoItemCompleted' : 'todoItem';
      this.description = todo.relativePath;
      this.tooltip = `${todo.description}\n\nFile: ${todo.relativePath}`;

      // Add checkmark icon for completed todos
      if (todo.completed) {
        this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
      } else {
        this.iconPath = new vscode.ThemeIcon('circle-outline');
      }

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
 * Tree data provider for the Developer Todos view
 */
export class TodoProvider implements vscode.TreeDataProvider<TodoTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TodoTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private showAll: boolean = false; // Filter: false = remaining only, true = all

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
   * Toggle filter between showing all todos or only remaining
   */
  public toggleFilter(): void {
    this.showAll = !this.showAll;
    this.refresh();
  }

  /**
   * Get current filter state
   */
  public getFilterState(): string {
    return this.showAll ? 'all' : 'remaining';
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
      const remaining = group.todos.filter((t) => !t.completed);
      const completed = group.todos.filter((t) => t.completed);

      const totalCount = this.showAll ? group.todos.length : remaining.length;

      if (totalCount > 0) {
        const label = `${group.icon} ${group.label} (${remaining.length}${this.showAll ? `/${group.todos.length}` : ''})`;
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

    // Separate incomplete and completed
    const incomplete = allTodos.filter((t) => !t.completed);
    const completed = allTodos.filter((t) => t.completed);

    // Show incomplete first, then completed (if showAll is true)
    const todosToShow = this.showAll ? [...incomplete, ...completed] : incomplete;

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
    const activeTodos = todos.filter((t) => !t.completed);

    return `[${branch}] ${activeTodos.length} active`;
  }
}
