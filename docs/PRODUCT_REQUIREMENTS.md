🟦 Product Requirements Document (PRD)
🅿 Parking Lot Map Editor – MVP (Revised)
1. 프로젝트 개요
1.1 목적

주차장 층별 도면을 시각적으로 편집하고 객체(CCTV, 센서, 주차면 등)를 배치하며
관계를 정의하여 JSON 스키마 기반 표준 맵 데이터로 만드는 웹 기반 맵 에디터 플랫폼.

1.2 타겟 사용자

스마트 주차장 관리자

IoT 시스템 구축 엔지니어

스마트빌딩 운영팀

CAD/BEV 데이터를 연동하는 개발팀

1.3 핵심 가치

CSV 기반 자동 맵 생성 → 초기 작업 시간 60~80% 단축

JointJS 기반 시각화 → 비개발자도 직관적으로 맵 편집 가능

객체 유형/속성/관계 정의 → 시스템 통합·관제 자동화에 유리

JSON Export → 디지털트윈·관제·AI 인식 시스템에 바로 활용 가능

2. 사용자 플로우 (UX Flow)
1. Google 로그인
   ↓
2. Parking Lot 생성
   ↓
3. 층(Floor) 생성 및 선택
   ↓
4. 객체 타입 정의 (왼쪽 패널)
   ↓
5. CSV 업로드 → 자동 그룹화
   ↓
6. 그룹 선택(Select)
   ↓
7. 객체 타입 ↔ CSV 오브젝트 매핑
   ↓
8. 속성/관계 편집 (오른쪽 패널)
   ↓
9. JSON Export
   ↓
10. Map Viewer에서 시각 검증

3. 기능 명세 (Functional Requirements — With AC)

각 기능마다 티켓으로 옮기기 쉽게
행동(Action), 대상(Target), 결과(Result), 완료조건(AC) 구조 적용.

3.1 인증 (Authentication)
F-001: Google OAuth 로그인 (P0)

Action

사용자가 “Login with Google” 클릭

OAuth2 redirect flow 수행

Target
/auth/google 모듈 + React 로그인 페이지

Result

accessToken 로컬 저장

로그인 상태 유지

AC (완료 기준)

 Google OAuth 동작

 토큰 만료 시 자동 로그아웃

 로그인 전용 페이지 분리

 로그인 실패 시 에러 표시

3.2 프로젝트 관리 (Parking Lot / Floors)
F-002: Parking Lot CRUD (P0)

Action

주차장 생성/수정/삭제

최근 프로젝트 선택

Target
Dashboard 페이지 + projectStore(Zustand)

Result
Parking Lot 리스트 및 선택 상태 저장

AC

 이름 중복 시 경고

 삭제 시 확인 모달

 마지막 선택된 Lot 기억(localStorage)

 빈 목록일 때 "Create first project" 표시

Error Cases

이름 없음

중복 이름

저장 실패(localStorage 문제)

F-003: Floor 관리 (P0)

Action

층 추가/삭제

Floor 탭 전환

Target
FloorTabs 컴포넌트 + floorStore

AC

 B1, B2, 1F 등 문자열 생성

 순서(order) 정렬

 빈 층일 때 기본 map_data 생성

 삭제 시 현재 층 선택 로직 보정

3.3 객체 타입 관리 (Object Type Definition)
F-004: 객체 타입 생성/수정/삭제 (P0)

Action

타입 추가

속성 추가/삭제

타입명 수정

Target
ObjectTypeSidebar

AC

 중복 타입명 입력 불가

 Key 미입력 시 경고

 속성 Type 선택

 리스트 자동 갱신

 타입 삭제 시 "사용 중인 객체가 있습니다" 경고

State Cases

Idle

Add Mode

Edit Mode

3.4 CSV 기반 자동 맵 생성 (CSV Import)
F-006: CSV 업로드 (P0)

Action

CSV drag & drop

파싱 및 그룹화

Target
CSVUploader + csvParser 모듈

AC

 10MB 제한

 컬럼 검증 (Layer, Points 등)

 잘못된 CSV → 상세 에러 표시

 처리시간 2초 이내

States

Idle

Uploading

Parsing

Parsed

Error

F-007: CSV 그룹 선택 UI + 렌더링 (P0)

Action

그룹 체크박스 선택

캔버스에 렌더링

AC

 Select All / Deselect All

 그룹별 count 표시

 선택하면 즉시 캔버스 반영

 체크 해제 시 렌더 제거

3.5 객체 매핑 (Object Mapping)
F-009: 객체 타입 ↔ CSV 그룹 매핑 (P0)

Action

객체 타입을 캔버스에 드래그

CSV 오브젝트와 매핑

AC

 드래그 성공 시 매핑 created

 매핑 해제 시 기본 데이터로 복귀

 Asset 존재 시 위치 자동 조정

 매핑 목록은 store에 저장

Error Cases

타입 없음

대상 CSV 없음

매핑 중복

3.6 캔버스 편집 (Canvas Editing)
F-010 ~ F-014 (이미 구현된 항목 → AC만 정리)

✔ 객체 선택/이동
✔ Undo/Redo
✔ 삭제
✔ Zoom/Pan
✔ Minimaps

각 기능의 AC는 다음 조건으로 유지:

 FPS 30 이상

 드래그 이동 부드러움

 Undo 50개 기록

 단축키 정상 동작

3.7 속성 & 관계 편집
F-015: 객체 속성 편집 (P0)

Action

오른쪽 패널에서 속성 수정

AC

 name / position / points 표시

 커스텀 속성 입력

 잘못된 타입 입력 시 Type Error

 에셋 업로드 가능 (png, svg)

F-016: 관계 정의 (P0)

Action

두 객체 선택 → 관계 생성

관계 삭제

AC

 N:N 관계 생성

 Required/Optional 선택

 Viewer에서도 동일하게 렌더링

 관계 삭제 시 UI 즉시 반영

3.8 JSON Export (P0)
F-017: Export

AC

 JSON 스키마 검증(Zod)

 필수 필드 누락 체크

 version, metadata 포함

 파일 다운로드 가능

Error Cases

미매핑 객체 존재

필수 속성 누락

invalid JSON

3.9 Map Viewer (P0)
F-018: JSON 기반 렌더링

AC

 JSON 업로드

 객체/관계 렌더

 속성 읽기 전용 노출

4. 데이터 흐름 (Data Flow)

아래는 MVP 핵심 파이프라인:

          CSV Upload
                ↓
          ParsedCSV[]
                ↓
       groupByLayer(result)
                ↓
       groupedLayers[]
                ↓
    selectedGroups (UI 체크박스)
                ↓
     mappedObjects (ObjectType 매핑)
                ↓
   canvasStore(JointJS Model)
                ↓
        mapData(JSON Schema)
                ↓
           JSON Export
                ↓
           Map Viewer


각 스텝의 입출력 타입:

단계	입력	출력
CSV Upload	File	ParsedCSV[]
그룹화	ParsedCSV[]	groupedLayers[]
선택	groupedLayers[]	selectedLayers[]
매핑	selectedLayers + ObjectTypes	MapObject[]
캔버스	MapObject[]	JointJS Graph
Export	Graph	JSON Schema
5. 비기능 요구사항 (NFR)
성능

CSV 50,000 points 기준 2초 이내 파싱

캔버스 이동/줌 시 30fps 이상 유지

Undo 50 depth

저장 전략

MVP: localStorage

향후: REST API 저장/버전 관리

브라우저

Chrome 120+ 공식 지원

Safari/Firefox Best Effort

접근성

Delete / Ctrl+Z / Ctrl+Y 단축키

포커스 가능한 UI 구조

6. 리스크 & 제약사항

JointJS 대량 객체 성능 이슈 가능

백엔드 미정 → 저장 방식 변경 위험

CSV 포맷 다양성 → 예상치 못한 파싱 오류

OAuth 토큰 만료 → Auto refresh 필요

이미지 에셋 사이즈 최적화 필요

7. 테스트 전략
7.1 Unit Test

CSV Parser

Layer Grouper

Zod Schema Validation

7.2 Component Test

ObjectTypeSidebar Form

CSV 체크 UI

PropertyPanel

7.3 E2E Test (Playwright)
E2E 시나리오 v1
CSV 업로드 → 그룹 선택 → 객체 타입 생성 → 매핑 → 속성 편집 → Export → Viewer 로드

E2E 시나리오 v2
Parking Lot 생성 → Floor 추가 → CSV → 객체 추가/삭제 → 저장 → 재로딩 유지 검증

8. 마일스톤 (업데이트된 Phase)
Phase 1 (Week 1-2)

Zustand Store Skeleton

Parking Lot CRUD

Floor CRUD

CSV 선택 UI (상태 + 에러)

Zod Schema 초안

Canvas Pipeline 설계

Phase 2 (Week 3-4)

Object Type CRUD

CSV 그룹 선택 UI

매핑 구현

Phase 3 (Week 5-6)

속성 패널

관계 정의

JSON Export

Phase 4 (Week 7-8)

Viewer

E2E 테스트

버그 수정 + 문서화

9. 참고 문서

FRONTEND_SPECIFICATION.md

ENTITY_SCHEMA.md

UI_WIREFRAMES.fig

CLAUDE_GUIDE.md