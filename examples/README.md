# Developer Todos - Example Templates

This folder contains ready-to-use `.todo.json` template files for different development scenarios.

## Quick Start

1. **Copy one of these files** to your workspace root
2. **Rename it to** `.todo.json`
3. **Customize** the templates for your needs
4. Start coding - todos will appear automatically!

## Available Examples

### 📋 [simple-starter-todo.json](simple-starter-todo.json)
**Best for:** Getting started, learning the extension

A minimal template with just 3 basic todos:
- Add tests
- Add documentation
- Request code review

**Use this if:** You're new to the extension and want to start simple.

---

### 💼 [general-development-todo.json](general-development-todo.json)
**Best for:** General web development (JavaScript, TypeScript, React, Node.js)

Comprehensive templates for common development tasks:
- Unit testing reminders
- Documentation (JSDoc/TSDoc)
- Error handling
- TypeScript types
- React accessibility
- API error handling
- Security (SQL injection, input validation)
- Environment variables
- Code review
- Performance optimization
- Responsive design
- CI/CD updates

**Use this if:** You're working on a JavaScript/TypeScript web project.

---

### ⚡ [salesforce-todo.json](salesforce-todo.json)
**Best for:** Salesforce development (Apex, LWC, Aura, Flows)

35+ specialized templates for Salesforce best practices:

**Apex Development:**
- Permission set assignments
- Test class creation (75% coverage)
- Field-Level Security checks
- Sharing settings review
- Remote site settings
- Named credentials

**Lightning Web Components:**
- Add to page layouts
- Jest testing
- Custom labels
- Permission visibility

**Triggers:**
- Handler pattern implementation
- Test coverage
- Bulkification verification

**Custom Objects & Fields:**
- Permission set configuration
- Page layouts
- List views
- Tabs and apps
- Field-level security

**Flows & Automation:**
- Activation reminders
- Testing guidance
- Documentation

**And more:** Validation rules, email templates, record types, Aura components, static resources

**Use this if:** You're a Salesforce developer or working on Force.com projects.

---

## How to Use

### Option 1: Copy and Rename

```bash
# For Salesforce projects
cp examples/salesforce-todo.json .todo.json

# For general development
cp examples/general-development-todo.json .todo.json

# For simple start
cp examples/simple-starter-todo.json .todo.json
```

### Option 2: Combine Multiple Examples

You can merge templates from different files:

```json
{
  "templates": [
    // Add templates from salesforce-todo.json
    {
      "id": "apex-test-class",
      "name": "Create test class",
      ...
    },
    // Add templates from general-development-todo.json
    {
      "id": "add-tests",
      "name": "Add unit tests",
      ...
    }
  ]
}
```

### Option 3: Create Your Own

Start with one of these examples and customize:

1. Remove templates you don't need
2. Modify `applyTo` patterns to match your project structure
3. Adjust priorities based on your workflow
4. Add custom templates for your specific needs

## Template Structure

Each template has these properties:

```json
{
  "id": "unique-identifier",           // Required: Unique ID
  "name": "Task name",                 // Required: Display name
  "description": "What to do",         // Required: Full description
  "applyTo": "**/*.js",                // Required: Glob pattern
  "fileContains": "optional string",   // Optional: Content filter
  "excludeFileContains": "test",       // Optional: Negative filter
  "priority": "high"                   // Optional: high, medium, low
}
```

## Tips for Customization

### Adjust File Patterns

Match your project structure:

```json
// Salesforce
"applyTo": "**/force-app/main/default/classes/**/*.cls"

// React components
"applyTo": "src/components/**/*.{jsx,tsx}"

// Backend API
"applyTo": "src/api/**/*.ts"
```

### Set Smart Priorities

- **High**: Must-do before merging (tests, security, permissions)
- **Medium**: Should-do for quality (docs, optimization)
- **Low**: Nice-to-have (translations, cleanup)

### Use Content Filters

Only trigger todos when specific content exists:

```json
{
  "fileContains": "@AuraEnabled",      // Only for exposed Apex methods
  "excludeFileContains": "@isTest"     // Skip test classes
}
```

## Creating Custom Templates

### Example: Database Migration Reminder

```json
{
  "id": "db-migration",
  "name": "Create database migration",
  "description": "Generate and test database migration for schema changes",
  "applyTo": "src/models/**/*.ts",
  "priority": "high"
}
```

### Example: i18n Translation

```json
{
  "id": "add-translations",
  "name": "Add translations",
  "description": "Add translations for all supported languages (en, es, fr, de)",
  "applyTo": "src/**/*.{jsx,tsx}",
  "fileContains": "FormattedMessage",
  "priority": "medium"
}
```

### Example: Docker Configuration

```json
{
  "id": "update-dockerfile",
  "name": "Update Dockerfile",
  "description": "Update Dockerfile with new dependencies or environment variables",
  "applyTo": "package.json",
  "priority": "low"
}
```

## Need Help?

- **Extension Documentation**: See main [README.md](../README.md)
- **Issues**: Report bugs or request features on GitHub
- **Questions**: Check the extension's marketplace page

## Contributing

Have a great template set for a specific framework or platform? Consider contributing it back!

Examples we'd love to see:
- Python/Django
- Ruby on Rails
- Flutter/Dart
- Go
- Rust
- Mobile (iOS/Android)
- DevOps/Infrastructure

---

**Happy coding!** 🚀 Never forget the important stuff again.
