---
name: retest
description: Re-run tests and build
model: haiku
color: orange
---
Re-run the complete test suite and build after fixes:

1. Run unit tests: `npm test`
2. Run type checking: `npm run type-check`
3. Run build: `npm run build`
4. Run E2E tests if applicable

Verify all issues are resolved.