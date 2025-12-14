---
alwaysApply: true
---

# Clone Repository URLs to /tmp

When a user provides a GitHub repository URL (or any git repository URL) in the chat, clone it to `/tmp/` so it can be referenced, explored, or used as an implementation guide.

## Guidelines

- Clone to `/tmp/<repo-name>/` (e.g., `git clone https://github.com/user/repo /tmp/repo`)
- If the directory already exists, skip cloning and use the existing clone
- Use shallow clone (`--depth 1`) for faster cloning when full history isn't needed
- Use the cloned repo for: exploration, referencing implementations, understanding patterns, or answering questions

## Example

```bash
# Check if already cloned, otherwise shallow clone
[ -d "/tmp/repo" ] || git clone --depth 1 https://github.com/user/repo /tmp/repo
```
