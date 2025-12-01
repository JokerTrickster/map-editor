# Map Editor

웹 기반 맵 에디터 & 뷰어 플랫폼

## 프로젝트 개요

도면 파일(CAD/이미지)을 업로드하면 AI가 기본 맵을 자동 생성하고, 사용자가 객체·속성·관계를 편집하여 표준 JSON 데이터를 만들 수 있는 플랫폼입니다.

**V1 범위**: 주차장 도면 지원

## 기술 스택

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand + React Query
- **Routing**: React Router v6
- **Styling**: CSS Modules + Design Tokens
- **Authentication**: Google OAuth 2.0
- **Validation**: Zod

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example` 파일을 참고하여 `.env` 파일을 생성하세요.

```bash
cp .env.example .env
```

#### Google OAuth Client ID 발급 방법

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 기존 프로젝트 선택
3. **API 및 서비스 > 사용자 인증 정보**로 이동
4. **사용자 인증 정보 만들기 > OAuth 클라이언트 ID** 클릭
5. 애플리케이션 유형: **웹 애플리케이션** 선택
6. 승인된 JavaScript 원본에 추가:
   - `http://localhost:5173` (개발 환경)
7. 승인된 리디렉션 URI에 추가:
   - `http://localhost:5173` (개발 환경)
8. 생성된 **클라이언트 ID**를 `.env` 파일에 입력

```env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:5173 접속

## 프로젝트 구조

```
src/
├── app/          # 애플리케이션 설정 (router, layouts, guards)
├── pages/        # 페이지 컴포넌트
├── features/     # 기능 모듈 (auth, project, canvas 등)
├── entities/     # 도메인 엔티티 (types, schema, constants)
├── widgets/      # 조합된 UI 블록
├── shared/       # 공유 리소스 (ui, lib, hooks, config, api)
├── assets/       # 정적 에셋
└── styles/       # 글로벌 스타일 및 디자인 토큰
```

## 주요 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview

# 린트 검사
npm run lint

# 테스트 실행
npm run test

# E2E 테스트
npm run test:e2e
```

## 문서

- [프론트엔드 사양서](./docs/FRONTEND_SPECIFICATION.md) - 전체 기능 및 아키텍처 상세 문서
- [개발 가이드](./CLAUDE.md) - 개발 컨벤션 및 참고 사항

## 현재 구현 상태

✅ **완료**
- 프로젝트 초기 설정
- Google OAuth 로그인 페이지

🚧 **진행 예정**
- 서비스 선택 페이지
- 도면 업로드 페이지
- 맵 에디터
- JSON Export
- Viewer

## 라이선스

MIT