# Repository Guidelines

## Project Structure & Module Organization
- Keep application code in `src/`; group related features by domain (e.g., `src/map/`, `src/layers/`, `src/ui/`).
- Place static assets in `public/` and shared styles in `src/styles/`.
- Put automated tests alongside code in `src/**/__tests__/` or centrally in `tests/`.
- Add scripts or one-off utilities in `scripts/` with a short README inside the folder.

## Build, Test, and Development Commands
- Install dependencies: `npm install` (or `pnpm install`/`yarn install` if the repo adopts them).
- Local development server (if a web app): `npm run dev` to start the preview environment.
- Type check / lint: `npm run lint` and `npm run typecheck`; keep both clean before commits.
- Run tests: `npm test` for the full suite; add `npm run test:watch` for TDD convenience.
- Production bundle: `npm run build`; ensure the build output is free of warnings.

## Coding Style & Naming Conventions
- Prefer TypeScript for new code; use `camelCase` for variables/functions, `PascalCase` for components/classes, and `SCREAMING_SNAKE_CASE` for constants.
- Use 2-space indentation; keep lines ≤ 100 characters.
- Rely on Prettier + ESLint; configure shared rules in the repo and run formatters before pushing.
- File naming: co-locate components as `FeatureName.tsx` and hooks as `useThing.ts`.

## Testing Guidelines
- Use a single framework (e.g., Vitest/Jest) consistently; prefer RTL for UI and Playwright/Cypress for end-to-end.
- Name tests after behavior, not implementation: `does X when Y`.
- Aim for coverage on core map editing flows (layer creation, selection, undo/redo, persistence).
- Include data fixtures under `tests/fixtures/` and keep snapshots minimal and meaningful.

## Commit & Pull Request Guidelines
- Follow conventional commits when possible (e.g., `feat: add layer drag handles`, `fix: prevent null map state`).
- Keep PRs focused and under ~400 lines of change; include a clear summary, test evidence, and screenshots/gifs for UI changes.
- Link to relevant issues and call out breaking changes or migrations in the description.
- Ensure CI passes: install, lint, typecheck, test, and build should run cleanly before requesting review.

## Security & Configuration Tips
- Avoid committing secrets; use `.env.example` to document required variables and `.gitignore` to exclude `.env.local`.
- Keep dependencies current; run `npm audit` (or `pnpm audit`) and address high-severity findings quickly.
- For third-party map/data services, document required tokens, URL origins, and rate limits in `docs/integration-notes.md`.
