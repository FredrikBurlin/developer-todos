# Changelog

All notable changes to the "Developer Todos" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-01-29

### Added

- **VS Code Language Model Tools API**: Native AI integration with GitHub Copilot and other AI assistants
  - `#devTodos` - Get remaining tasks for the current branch
  - `#completeTodo` - Mark a task as completed
  - `#taskInstructions` - Get AI-specific instructions for a task
- **AI Instructions (`aiInstruction`)**: New template field for providing AI agents with detailed task completion guidance
  - Define step-by-step instructions that AI assistants can follow
  - Accessible via the `getTaskInstructions` tool
  - Example templates updated with AI instructions

### Changed

- Minimum VS Code version updated to 1.93.0 (required for Language Model Tools API)
- Example templates now include `aiInstruction` field demonstrations

### Technical

- New `lmTools.ts` module implementing the Language Model Tool interface
- Tools registered with `vscode.lm.registerTool()` for native VS Code AI integration
- Added `getTodoById()` method to TodoManager for efficient single-todo lookups

## [0.3.0] - 2026-01-29

### Added

- **Branch-Level Todos**: Define todos that appear once per branch, not tied to specific files
  - Use `"branchLevel": true` in template configuration
  - Perfect for deployment tasks, release notes, UAT sign-off, team notifications
- **Triggering Files**: Branch-level todos with `applyTo` patterns now track which files triggered them
  - Files are displayed in the accordion when expanded
  - Click on a file to open it directly
- **Ignore/Skip Feature**: Mark todos as ignored when they're not relevant
  - Ignored todos are sorted at the bottom with strikethrough styling
  - Filter menu to show All/Remaining/Completed/Ignored todos
- **Filter Menu**: Click the filter icon to choose what todos to display
  - All Todos
  - Remaining Only (default)
  - Completed Only
  - Ignored Only

### Changed

- **Updated Icons**:
  - Undone tasks now use "debug-stop" icon (red square)
  - Ignored tasks now use "close" icon (X)
  - Completed tasks use "check" icon (green checkmark)
- Branch-level todos can now combine `branchLevel: true` with `applyTo` patterns
  - The todo is created once per branch but tracks all matching files
  - Example: "Add field-level security" triggered by 10 custom field files, but only one todo

### Fixed

- Git API compatibility issue with `onDidRunGitStatus` replaced with `state.onDidChange`

## [0.2.0] - 2026-01-29

### Added

- **New Language Templates**: Ready-to-use templates for popular languages and frameworks
  - Python/Django/Flask/FastAPI (18 templates)
  - Go/Golang (18 templates)
  - Rust (18 templates)
  - Java/Spring Boot (20 templates)
  - C#/.NET/ASP.NET Core (21 templates)
- **Auto-Refresh on Git Changes**: Todos automatically update when files are staged or unstaged
  - Listens to Git repository state changes
  - No need to manually refresh after staging files
- **Download Links**: README now includes direct download links for all templates
  - Table with all available templates
  - curl commands for quick installation
- **Test Extension Guide**: Comprehensive guide for testing the extension

### Changed

- Updated README with improved documentation and examples
- New extension icon
- Updated screenshots showing the extension in action
- Improved Git integration using `state.onDidChange` for broader VSCode version compatibility

## [0.1.0] - 2026-01-26

### Added

- Initial release of Developer Todos extension
- Branch-aware todo management - each git branch has its own todo list
- Smart template matching with glob patterns and content detection
- Auto-detection of changed/staged git files
- Priority-based organization (High, Medium, Low)
- Expandable todos showing detailed descriptions
- Filter toggle between "All" and "Remaining" todos
- Completed todos displayed at bottom with green checkmark
- Navigate to file button for quick access
- Complete/Reopen todo functionality
- Persistent state across VSCode sessions
- Binary file filtering (images, PDFs, etc.)
- AI Agent API for programmatic access
- Support for Salesforce development workflows
- .todo.json configuration file for custom templates

### Features

- **Branch Isolation**: Todos are isolated per branch - switching branches shows only that branch's todos
- **Git Integration**: Only tracks files that are changed or staged in git
- **Template System**: Define reusable todo templates with:
  - Path patterns (glob matching)
  - Content matching (fileContains)
  - Negative matching (excludeFileContains)
  - Priority levels
- **Tree View**: Organized sidebar view with priority grouping
- **Persistence**: Completed state saved per branch in workspace storage
- **Extensibility**: Clean API for AI agents and other extensions

### Templates Supported

- Apex controller permissions
- LWC component placement
- Test class creation
- Permission set assignments
- Custom templates via .todo.json

## [Unreleased]

### Planned Features

- Integration with PR creation / issue trackers (GitHub, Jira)
- Custom icons per priority level
- Export todos to markdown
- Todo templates marketplace
