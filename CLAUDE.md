# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**map-editor** - A web-based map editor and viewer platform that allows users to:
- Upload floor plans (CAD/image files)
- Generate base maps automatically using AI
- Edit objects, properties, and relationships
- Export standardized JSON data
- View rendered maps based on JSON

**V1 Scope**: Parking lot floor plans only

**V1 Flow**: Google 로그인 → 도면 업로드 → AI 맵 생성 → 오브젝트 편집 → JSON Export → Viewer
- 서비스 선택 페이지 없음 (주차장만 지원)
- 로그인 후 바로 도면 업로드 페이지로 이동

## Documentation

**Primary Reference**: [`docs/FRONTEND_SPECIFICATION.md`](./docs/FRONTEND_SPECIFICATION.md)

This comprehensive specification document contains:
- Complete service flow and page structure
- Detailed feature requirements
- Technical architecture and folder structure
- JSON schema definitions
- State management patterns
- API integration specifications
- AI integration roadmap
- Development phases and priorities

**Always refer to this document before implementing features to ensure consistency.**

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand (client state) + React Query (server state)
- **Routing**: React Router v6
- **Styling**: CSS Modules + Design Tokens
- **Canvas**: Konva.js or Fabric.js (TBD)
- **Validation**: Zod
- **Testing**: Vitest + React Testing Library + Playwright

## Architecture Principles

### Folder Structure (Feature-Sliced Design)
```
src/
├── app/          # Application setup (router, layouts, guards)
├── pages/        # Page components
├── features/     # Feature modules (auth, project, canvas, objects, relations, ai-import, viewer)
├── entities/     # Domain entities (types, schema, constants)
├── widgets/      # Composite UI blocks
├── shared/       # Shared resources (ui, lib, hooks, config, api)
├── assets/       # Static assets
├── styles/       # Global styles and tokens
└── tests/        # Test files
```

### Dependency Rules
- `features` → `entities`, `shared` ✅
- `pages` → `features`, `widgets`, `shared` ✅
- `entities` → `shared` ✅
- **Reverse dependencies are forbidden**: `shared` → `features` ❌

### Data Flow
- **Client State**: Zustand (objects, canvas state)
- **Server State**: React Query (projects, AI requests, assets)
- **Form State**: React Hook Form (property editing)

## Development Guidelines

### Before Implementation
1. Read [`docs/FRONTEND_SPECIFICATION.md`](./docs/FRONTEND_SPECIFICATION.md)
2. Check existing types in `entities/types/`
3. Follow Feature-Sliced Design structure
4. Use design tokens from `styles/tokens.css`

### Code Standards
- **TypeScript**: Strict mode, no `any` types
- **Components**: Functional components with hooks
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Imports**: Absolute imports using path aliases (`@/`)
- **Validation**: Use Zod schemas for runtime validation

### JSON Schema
All data must conform to the schema defined in `entities/schema/mapSchema.ts`:
- Root: `metadata`, `assets`, `objects`
- Objects: `id`, `type`, `name`, `geometry`, `style`, `properties`, `assetRefs`, `relations`
- Relations: `targetId`, `type`, `meta`

### State Management
- Use Zustand for local state (project, canvas)
- Use React Query for server state (with proper query keys)
- Implement Undo/Redo via history stack in project store

## Current Status

**Phase**: Initial setup

**Completed**:
- ✅ Repository initialization
- ✅ Documentation structure
- ✅ Project setup (Vite + React + TypeScript)
- ✅ Folder structure implementation
- ✅ Google OAuth authentication
- ✅ Login page implementation

**Next Steps**:
1. 도면 업로드 페이지 구현
2. AI 분석 API 연동
3. 맵 에디터 구현 (캔버스, 오브젝트, 속성)
4. Type definitions and Zod schemas
5. JSON Export 기능

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create `.env` file:
```bash
cp .env.example .env
```

Set your Google OAuth Client ID in `.env`:
```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### 3. Run Development Server
```bash
npm run dev
```

Visit http://localhost:5173

## Development Workflow

### Running the Project
```bash
npm run dev
```

### Testing
```bash
npm test
npm run test:e2e
```

### Building
```bash
npm run build
```

### Linting
```bash
npm run lint
```

## Key Conventions

- **Object Types**: Defined in `entities/constants/objectTypes.ts`
- **Relation Types**: Defined in `entities/constants/relationTypes.ts`
- **Design Tokens**: All colors/spacing/typography in `styles/tokens.css`
- **API Client**: Centralized in `shared/api/client.ts`

---

**Note**: This document provides quick reference. For detailed specifications, always refer to [`docs/FRONTEND_SPECIFICATION.md`](./docs/FRONTEND_SPECIFICATION.md).
