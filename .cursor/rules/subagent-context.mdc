---
alwaysApply: true
---

# Subagent Context Requirements

When spawning subagents via the Task tool, remember that subagents start with **zero context** about the current task, conversation history, or codebase state.

## Required Context to Provide

Always include in the subagent prompt:

1. **What we're working on** - The high-level goal or feature being implemented
2. **Relevant file paths** - Specific files the subagent needs to examine or modify
3. **Current state** - What has already been done, what's working, what's broken
4. **Specific task** - Clear, actionable instructions for what the subagent should do
5. **Expected output** - What information or result you need back from the subagent

## Examples

### ❌ Bad (Missing Context)

```
Task: "Find where the user authentication happens"
```

### ✅ Good (Full Context)

```
Task: "We're implementing Discord OAuth for the AnswerOverflow rewrite. 
The auth setup is in packages/database/convex/auth.ts.
We've already configured the Discord provider but login is failing silently.
Find where the OAuth callback is handled and check if there are any error logs or missing configuration.
Return the file paths and any issues you find."
```

## Key Principle

If you had to hand this task to a colleague who just joined the project, would they have enough information to complete it without asking clarifying questions? If not, add more context.
