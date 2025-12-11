---
name: test-and-build
description: Run tests and build
model: sonnet
color: orange
---
Execute comprehensive testing and build validation:

1. Run unit tests: `npm test`
2. Run type checking: `npm run type-check`
3. Run build: `npm run build`
4. Run E2E tests if applicable

Capture all outputs and identify any failures or warnings.
Do not proceed if any tests fail or build errors occur.