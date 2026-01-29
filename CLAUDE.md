# Claude Code Instructions

This file contains instructions for AI assistants (Claude, Copilot, etc.) when working on this VS Code extension.

## Version Management

When making changes to the extension, follow semantic versioning:

### Version Bump Rules

| Change Type | Version Bump | Example |
|-------------|--------------|---------|
| Bug fixes, minor improvements | Patch (0.0.X) | 0.4.0 → 0.4.1 |
| New features, non-breaking changes | Minor (0.X.0) | 0.4.0 → 0.5.0 |
| Breaking changes, major rewrites | Major (X.0.0) | 0.4.0 → 1.0.0 |

### Files to Update

When making changes, always update these files:

1. **package.json** - Update the `version` field
2. **CHANGELOG.md** - Add entry under appropriate version header
3. **README.md** - Update if the change affects user-facing documentation

## Changelog Format

Use the [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing functionality

### Fixed
- Bug fixes

### Removed
- Removed features

### Technical
- Internal changes (refactoring, dependencies, etc.)
```

### Changelog Entry Guidelines

- Start each entry with a verb (Add, Fix, Update, Remove, Improve)
- Be concise but descriptive
- Include issue/PR numbers if applicable
- Group related changes together

## Code Style

### TypeScript

- Use ES6+ features
- Prefer `async/await` over raw Promises
- Use interfaces for type definitions
- Add JSDoc comments for public APIs

### File Organization

```
src/
├── extension.ts      # Entry point, activation
├── types.ts          # TypeScript interfaces
├── todoManager.ts    # Core business logic
├── todoProvider.ts   # Tree view provider
├── gitService.ts     # Git integration
├── fileWatcher.ts    # File system monitoring
├── lmTools.ts        # Language Model Tools
└── templateMatcher.ts # Pattern matching
```

## Testing Changes

Before committing:

1. Run `npm run compile` to check for TypeScript errors
2. Test in the Extension Development Host (F5)
3. Verify the tree view displays correctly
4. Test with a sample `.todo.json` file

## Common Tasks

### Adding a New Command

1. Define in `package.json` under `contributes.commands`
2. Add menu placement in `contributes.menus` if needed
3. Register handler in `extension.ts`
4. Update CHANGELOG and README

### Adding a New Language Model Tool

1. Define in `package.json` under `contributes.languageModelTools`
2. Create tool class in `src/lmTools.ts` implementing `vscode.LanguageModelTool<T>`
3. Register in `registerLanguageModelTools()` function
4. Update AI_AGENT_GUIDE.md with documentation
5. Update CHANGELOG and README

### Adding a Template Field

1. Update `TodoTemplate` interface in `types.ts`
2. Update `TodoInstance` interface if needed
3. Update `todoManager.ts` to populate/use the field
4. Update example `.todo.json` files
5. Update documentation (README, AI_AGENT_GUIDE)
6. Update CHANGELOG

## Extension Architecture

```
User creates/modifies files
         │
         ▼
    FileWatcher
         │
         ▼
   TodoManager ◄─── .todo.json templates
         │
    ┌────┴────┐
    ▼         ▼
TodoProvider  Language Model Tools
(Tree View)   (AI Integration)
```

## Key Concepts

### Branch-Level Todos
- Created once per branch, not tied to files
- Use `branchLevel: true` in template
- Can optionally track triggering files with `applyTo`

### AI Instructions
- `aiInstruction` field in templates
- Provides detailed guidance for AI assistants
- Returned by `getTaskInstructions` tool

### State Persistence
- Stored in `context.workspaceState`
- Keyed by branch name
- Survives VSCode restarts

## VS Code API Version

Current minimum: **1.93.0** (required for Language Model Tools API)

When updating minimum version, also update:
- `package.json` → `engines.vscode`
- `README.md` → Requirements section
