# Testing the Developer Todos Extension

## Step-by-Step Testing Guide

### 1. Launch Extension Development Host
1. Open this project in VSCode
2. Press **F5** (or Run → Start Debugging)
3. A new VSCode window opens with "[Extension Development Host]" in the title

### 2. Set Up Test Environment
In the Extension Development Host window:

1. **Open a folder**:
   - File → Open Folder
   - Create/select a test folder (e.g., `test-todos`)

2. **Check if extension loaded**:
   - Open Output panel: View → Output
   - Select "Extension Host" from dropdown at top-right
   - Look for: `Developer Todos extension is activating...`
   - Should see: `Developer Todos extension activated successfully`

### 3. Find the Extension UI

**Option A: Via Activity Bar (Left Sidebar)**
- Look for the checklist icon (☑️) in the vertical bar on the left
- It appears alongside Explorer, Search, Source Control icons
- Click it to open the Developer Todos panel

**Option B: Via Command Palette**
- Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
- Type: "Developer Todos"
- You should see commands like "Developer Todos: Refresh"

### 4. Create Test Configuration

If you see "No .todo.json found":
1. Click "Create Example" button
2. Or manually create `.todo.json` in workspace root with:

```json
{
  "templates": [
    {
      "id": "test-task",
      "name": "Add tests",
      "description": "Create unit tests for this file",
      "applyTo": "src/**/*.js",
      "priority": "high"
    }
  ]
}
```

### 5. Test Basic Functionality

1. **Create a test file**:
   - Create `src/example.js` in your test folder
   - Add some content: `function hello() { console.log('hi'); }`

2. **Stage the file in git**:
   ```bash
   git init
   git add src/example.js
   ```

3. **Check Developer Todos panel**:
   - You should see "Add tests" todo appear
   - It should show under "High Priority"

### 6. Test New Features

**Test Ignore/Skip:**
1. Click the circle-slash icon next to a todo
2. Todo should move to bottom with strikethrough
3. Click filter button → Select "Ignored Only" to see only ignored todos

**Test Filter Menu:**
1. Click the filter icon (funnel) at top of panel
2. Try each filter mode:
   - All Todos
   - Remaining Only
   - Completed Only
   - Ignored Only

**Test Complete/Reopen:**
1. Click checkmark to complete a todo
2. It moves to bottom with green checkmark
3. Click circle-outline to reopen it

### 7. Expected UI Layout

```
Developer Todos Panel:
├─ [Filter Button] [Refresh] [Clear All]
│
├─ 🔴 High Priority (1/2)
│   ├─ ○ Add tests
│   │   └─ ℹ️ Create unit tests for this file
│   └─ ✓ Add documentation  (completed - at bottom)
│
└─ [main] 1 active  (status bar at bottom)
```

### 8. Troubleshooting

**Extension not appearing?**
- Check Output panel for errors
- Verify "Extension Host" shows activation messages
- Try reloading: Cmd+R / Ctrl+R in Extension Development Host

**No todos appearing?**
- Files must be changed/staged in git
- Check .todo.json patterns match your files
- Click Refresh button in Developer Todos panel

**Filter/Ignore buttons not working?**
- Check browser DevTools: Help → Toggle Developer Tools
- Look for errors in Console tab

### 9. Test Branch Isolation

```bash
# Create new branch
git checkout -b feature/test

# Complete a todo in Developer Todos panel

# Switch branches
git checkout main

# Verify todo is not completed on main branch
# Switch back to feature/test
# Verify todo is still completed
```

## Quick Verification Checklist

- [ ] Extension activates without errors
- [ ] Checklist icon appears in Activity Bar
- [ ] Can create .todo.json from prompt
- [ ] Todos appear when files are staged
- [ ] Complete button works (green checkmark)
- [ ] Reopen button works
- [ ] Ignore button works (strikethrough at bottom)
- [ ] Unignore button works
- [ ] Filter menu shows 4 options
- [ ] Filter modes work correctly
- [ ] Navigate to file button works
- [ ] Expandable description works
- [ ] Branch switching isolates todos
- [ ] State persists after reloading VSCode
