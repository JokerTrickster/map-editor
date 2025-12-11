---
name: document-check
description: Check for existing documentation
model: haiku
color: cyan
---
Search for existing feature documentation in `docs/features/` directory.

1. Look for documentation matching the feature name or related functionality
2. Check file contents to verify it's the correct feature
3. Report findings:
   - If found: Return the exact file path and current content structure
   - If not found: Confirm no existing documentation exists

Output format:
STATUS: [FOUND|NOT_FOUND]
PATH: [file path if found]
SUMMARY: [brief description]