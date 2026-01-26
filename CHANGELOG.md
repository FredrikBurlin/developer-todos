# Changelog

All notable changes to the "Developer Todos" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
