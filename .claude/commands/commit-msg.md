---
description: Generate a commit title and description for all changes since the last commit
allowed-tools: Bash(git:*)
---

Generate a commit title and description summarizing all uncommitted changes.

1. Run `git diff --stat HEAD` to see which files changed
2. Run `git diff HEAD` to see the actual changes (read enough to understand the scope)
3. Run `git log --oneline -5` to match the repo's commit message style

Then output:

**Title** (under 72 characters): a concise summary of what changed. Use imperative mood (e.g. "Add ...", "Fix ...", "Update ...").

**Description**: bullet points summarizing the key changes, grouped logically. Focus on *what* and *why*, not line-by-line diffs. Keep it scannable.

Do NOT make a commit — only output the title and description for the user to review.
