/**
 * Template definition from .todo.json
 */
export interface TodoTemplate {
  id: string;
  name: string;
  description: string;
  applyTo: string; // Glob pattern
  fileContains?: string; // Content that must be present
  excludeFileContains?: string; // Content that must NOT be present
  priority?: 'high' | 'medium' | 'low';
}

/**
 * Configuration file structure
 */
export interface TodoConfig {
  templates: TodoTemplate[];
}

/**
 * Active todo instance for a specific file and branch
 */
export interface TodoInstance {
  id: string; // Format: templateId:relativePath
  templateId: string;
  name: string;
  description: string;
  filePath: string; // Absolute path
  relativePath: string; // Workspace-relative path
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  completedAt?: string;
  ignored: boolean;
  ignoredAt?: string;
  branch: string;
}

/**
 * Persisted state for todos (stored in workspace state)
 */
export interface TodoState {
  [branchName: string]: {
    todos: {
      [todoId: string]: {
        completed: boolean;
        completedAt?: string;
        ignored: boolean;
        ignoredAt?: string;
        filePath: string;
        templateId: string;
      };
    };
  };
}

/**
 * Tree item types for the tree view
 */
export type TodoTreeItemType = 'group' | 'todoItem';

/**
 * Priority group for tree view
 */
export interface PriorityGroup {
  priority: 'high' | 'medium' | 'low';
  label: string;
  icon: string;
  todos: TodoInstance[];
}
