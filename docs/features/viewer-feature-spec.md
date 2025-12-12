# 뷰어 기능 명세서

## 📋 요구사항 정리

### 필수 요구사항
- ✅ **수동 저장**: 사용자가 명시적으로 저장 버튼 클릭
- ✅ **에디터 내 뷰어**: 에디터 안에서 저장된 상태를 뷰어로 확인
- ✅ **공유 링크**: embeddedUrl 제공 (iframe 임베드 가능)
- ⏳ **버전 관리**: 필요하지만 V2에서 구현 (현재는 최신 버전만)

---

## 🎯 핵심 컨셉

### 3가지 뷰어 모드

```
1️⃣ 에디터 내 뷰어 모드 (Editor Preview Mode)
   → 에디터 페이지에서 편집/뷰어 모드 전환
   → 빠른 검증 및 미리보기

2️⃣ 독립 뷰어 페이지 (Standalone Viewer)
   → /viewer/:mapId
   → 공유, 외부 접근용

3️⃣ 임베드 뷰어 (Embedded Viewer)
   → /embed/:mapId
   → iframe으로 삽입 가능한 경량 버전
```

---

## 🎨 UI/UX 설계

### 1. 에디터 내 뷰어 모드

#### 헤더 구조 변경
```
┌─────────────────────────────────────────────────────┐
│  [로고]  Project Name                               │
│  ┌─────────┬──────────┐                            │
│  │  편집   │  뷰어    │  ← 탭 형태                 │
│  └─────────┴──────────┘                            │
│  [저장] [내보내기] [공유 링크 복사]                 │
└─────────────────────────────────────────────────────┘
```

#### 편집 모드 (기본)
```
┌────────────────────────────────────────┐
│ 헤더 [편집 탭 활성]                    │
├────┬──────────────────────────┬────────┤
│도구│     캔버스 (편집 가능)     │ 속성  │
│팔레│                           │ 패널  │
│트  │                           │       │
└────┴──────────────────────────┴────────┘
```

#### 뷰어 모드
```
┌────────────────────────────────────────┐
│ 헤더 [뷰어 탭 활성]                    │
│ "현재 저장된 버전을 보고 있습니다"     │
├────────────────────────────────────────┤
│                                        │
│        캔버스 (읽기 전용)               │
│        - 도구 팔레트 숨김               │
│        - 속성 편집 패널 숨김            │
│        - 객체 클릭 시 정보만 표시       │
│                                        │
│  [줌 컨트롤]  [객체 정보 툴팁]         │
└────────────────────────────────────────┘
```

### 2. 독립 뷰어 페이지

#### URL 구조
```
/viewer/:mapId                    # 일반 뷰어
/viewer/:mapId?embedded=true      # 임베드 모드
/embed/:mapId                     # 임베드 전용 (alias)
```

#### 레이아웃
```
┌────────────────────────────────────────┐
│ 헤더 (간소화)                          │
│ [로고] Map Viewer                      │
│ [에디터로 돌아가기] (소유자만 표시)    │
├────────────────────────────────────────┤
│                                        │
│        캔버스 (읽기 전용)               │
│                                        │
│  [줌 컨트롤]                           │
│  [레이어 토글]                         │
│  [풀스크린]                            │
└────────────────────────────────────────┘
```

#### 임베드 모드 (embedded=true)
```
┌────────────────────────────────────────┐
│        캔버스 (헤더 없음)               │
│                                        │
│  [최소 컨트롤만]                       │
└────────────────────────────────────────┘
```

---

## 🔄 사용자 플로우

### 시나리오 1: 에디터에서 뷰어 확인

```
1. 에디터에서 작업
   ↓
2. "저장" 버튼 클릭
   → POST /api/maps/:projectId
   → { mapId, embedUrl } 반환
   ↓
3. 성공 모달 표시
   ┌──────────────────────────────┐
   │ ✅ 저장 완료!                 │
   │                              │
   │ [뷰어로 보기]  [계속 편집]    │
   │                              │
   │ 공유 링크: [복사]            │
   │ 임베드 코드: [복사]          │
   └──────────────────────────────┘
   ↓
4-A. [뷰어로 보기] 클릭
   → 헤더의 "뷰어" 탭으로 전환
   → GET /api/maps/:mapId
   → 저장된 데이터로 렌더링
   ↓
5. [편집] 탭 클릭으로 편집 모드 복귀
```

### 시나리오 2: 공유 링크 접근

```
1. 공유받은 사람이 URL 접속
   /viewer/:mapId
   ↓
2. GET /api/maps/:mapId
   ↓
3. 뷰어 페이지 렌더링
   - 소유자: [에디터로 돌아가기] 버튼 표시
   - 비소유자: 읽기 전용으로만 표시
```

### 시나리오 3: 임베드 사용

```
1. 사용자가 임베드 코드 복사
   <iframe src="/embed/:mapId" width="800" height="600"></iframe>
   ↓
2. 외부 사이트에 삽입
   ↓
3. /embed/:mapId 접속 시
   → 최소 UI로 렌더링
   → 헤더 없음
   → 필수 컨트롤만 표시
```

---

## 🗂️ 폴더 구조

```
src/
├── pages/
│   ├── editor/
│   │   ├── EditorPage.tsx                # mode: 'edit' | 'viewer' 추가
│   │   └── components/
│   │       ├── EditorHeader.tsx          # 탭 추가
│   │       ├── EditorModeToggle.tsx      # 새로 생성: 편집/뷰어 탭
│   │       └── SaveSuccessModal.tsx      # 새로 생성: 저장 성공 모달
│   │
│   └── viewer/
│       ├── ViewerPage.tsx                # 독립 뷰어 페이지
│       └── EmbedViewerPage.tsx           # 임베드 전용 페이지
│
├── features/
│   └── viewer/
│       ├── ui/
│       │   ├── MapViewer.tsx             # 공통 렌더링 컴포넌트
│       │   ├── ViewerControls.tsx        # 줌/팬/풀스크린 컨트롤
│       │   ├── ObjectInfoTooltip.tsx     # 객체 정보 툴팁
│       │   └── ViewerHeader.tsx          # 뷰어 페이지 헤더
│       │
│       ├── lib/
│       │   ├── mapRenderer.ts            # 렌더링 로직 (에디터와 공유)
│       │   └── viewerUtils.ts            # 뷰어 유틸리티
│       │
│       ├── hooks/
│       │   ├── useMapData.ts             # GET /api/maps/:mapId
│       │   └── useViewerMode.ts          # 뷰어 모드 상태 관리
│       │
│       └── api/
│           └── viewerApi.ts              # 뷰어 API 호출
│
└── shared/
    └── lib/
        └── renderer/
            ├── renderMap.ts              # 공통 맵 렌더링 함수
            └── renderConfig.ts           # 렌더링 옵션 (edit vs readonly)
```

---

## 🔌 API 설계

### 1. 맵 저장 (에디터)

```typescript
POST /api/projects/:projectId/maps
// 또는
POST /api/maps

Request Body:
{
  projectId: string;
  name: string;
  json: MapData;  // 전체 JSON (metadata + objects + assets)
}

Response:
{
  success: true;
  data: {
    mapId: string;
    version: number;  // V2에서 활용
    viewerUrl: string;      // "/viewer/:mapId"
    embedUrl: string;       // "/embed/:mapId"
    embedCode: string;      // <iframe...>
    createdAt: string;
  }
}
```

### 2. 맵 조회 (뷰어)

```typescript
GET /api/maps/:mapId

Response:
{
  success: true;
  data: {
    id: string;
    projectId: string;
    name: string;
    json: MapData;
    metadata: {
      author: string;
      createdAt: string;
      updatedAt: string;
    };
    permissions: {
      canEdit: boolean;
      canView: boolean;
    };
  }
}
```

### 3. 프로젝트의 맵 목록 (V2)

```typescript
GET /api/projects/:projectId/maps

Response:
{
  success: true;
  data: {
    maps: Array<{
      id: string;
      name: string;
      version: number;
      createdAt: string;
      isLatest: boolean;
    }>;
  }
}
```

---

## 🎨 컴포넌트 설계

### 1. EditorPage 수정

```typescript
// EditorPage.tsx
type EditorMode = 'edit' | 'viewer';

export default function EditorPage() {
  const [mode, setMode] = useState<EditorMode>('edit');
  const [savedMapId, setSavedMapId] = useState<string | null>(null);

  const handleSave = async () => {
    const result = await saveMap(projectId, mapData);
    setSavedMapId(result.mapId);
    showSaveSuccessModal({
      mapId: result.mapId,
      viewerUrl: result.viewerUrl,
      embedUrl: result.embedUrl,
      embedCode: result.embedCode
    });
  };

  const handleSwitchToViewer = () => {
    if (!savedMapId) {
      alert('먼저 저장해주세요');
      return;
    }
    setMode('viewer');
  };

  return (
    <div>
      <EditorHeader
        mode={mode}
        onModeChange={setMode}
        onSave={handleSave}
        savedMapId={savedMapId}
      />

      {mode === 'edit' ? (
        <EditorContent />
      ) : (
        <ViewerContent mapId={savedMapId} />
      )}
    </div>
  );
}
```

### 2. ViewerPage (독립)

```typescript
// ViewerPage.tsx
export default function ViewerPage() {
  const { mapId } = useParams();
  const { data: mapData, isLoading } = useMapData(mapId);
  const { user } = useAuth();

  const canEdit = mapData?.permissions?.canEdit;

  return (
    <div>
      <ViewerHeader
        mapName={mapData?.name}
        canEdit={canEdit}
        onBackToEditor={() => navigate(`/editor/${mapData.projectId}`)}
      />

      <MapViewer
        data={mapData?.json}
        mode="readonly"
      />

      <ViewerControls />
    </div>
  );
}
```

### 3. EmbedViewerPage (임베드)

```typescript
// EmbedViewerPage.tsx
export default function EmbedViewerPage() {
  const { mapId } = useParams();
  const { data: mapData } = useMapData(mapId);

  return (
    <div className={styles.embedContainer}>
      <MapViewer
        data={mapData?.json}
        mode="embed"
        showControls={false}
      />

      {/* 최소 컨트롤만 */}
      <ViewerControls minimal />
    </div>
  );
}
```

### 4. MapViewer (공통 컴포넌트)

```typescript
// MapViewer.tsx
interface MapViewerProps {
  data: MapData | null;
  mode: 'edit' | 'readonly' | 'embed';
  showControls?: boolean;
  onObjectClick?: (objectId: string) => void;
}

export function MapViewer({
  data,
  mode,
  showControls = true,
  onObjectClick
}: MapViewerProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || !canvasRef.current) return;

    // 공통 렌더링 로직
    const renderer = new MapRenderer(canvasRef.current, {
      mode,
      interactive: mode !== 'readonly' && mode !== 'embed',
      onObjectClick
    });

    renderer.render(data);

    return () => renderer.destroy();
  }, [data, mode]);

  return (
    <div className={styles.mapViewer}>
      <div ref={canvasRef} className={styles.canvas} />

      {mode !== 'readonly' && showControls && (
        <ViewerControls />
      )}

      {/* 객체 정보 툴팁 */}
      <ObjectInfoTooltip />
    </div>
  );
}
```

---

## 📝 라우팅 설정

```typescript
// App.tsx 또는 routes.tsx
const routes = [
  {
    path: '/editor/:projectId',
    element: <EditorPage />,
    // mode는 내부 state로 관리
  },
  {
    path: '/viewer/:mapId',
    element: <ViewerPage />,
  },
  {
    path: '/embed/:mapId',
    element: <EmbedViewerPage />,
  },
];
```

---

## 🎯 구현 우선순위

### Phase 1: 에디터 내 뷰어 모드 (1주)
- [ ] EditorPage에 mode state 추가
- [ ] EditorHeader에 편집/뷰어 탭 추가
- [ ] 저장 API 연동 (POST /api/maps)
- [ ] SaveSuccessModal 구현
- [ ] 뷰어 모드 UI (도구 숨김, 읽기 전용)
- [ ] MapViewer 컴포넌트 기본 구조

### Phase 2: 독립 뷰어 페이지 (3일)
- [ ] ViewerPage 컴포넌트 생성
- [ ] 라우팅 설정 (/viewer/:mapId)
- [ ] GET /api/maps/:mapId API 연동
- [ ] ViewerHeader 구현
- [ ] 권한 확인 로직 (소유자 vs 방문자)

### Phase 3: 임베드 기능 (2일)
- [ ] EmbedViewerPage 생성
- [ ] 라우팅 설정 (/embed/:mapId)
- [ ] 임베드 코드 생성 로직
- [ ] 최소 UI 스타일링
- [ ] iframe 통신 (필요시)

### Phase 4: 공유 기능 (1일)
- [ ] 공유 링크 복사 버튼
- [ ] 임베드 코드 복사 버튼
- [ ] 소셜 미디어 공유 (선택사항)
- [ ] QR 코드 생성 (선택사항)

---

## 🔍 기술적 고려사항

### 렌더링 로직 공유

```typescript
// shared/lib/renderer/renderMap.ts
export class MapRenderer {
  constructor(
    container: HTMLElement,
    options: {
      mode: 'edit' | 'readonly' | 'embed';
      interactive: boolean;
      onObjectClick?: (id: string) => void;
    }
  ) {
    // JointJS 또는 Fabric.js 초기화
    this.paper = new joint.dia.Paper({
      el: container,
      model: this.graph,
      interactive: options.interactive,
      // ...
    });
  }

  render(data: MapData) {
    // 공통 렌더링 로직
    this.renderObjects(data.objects);
    this.renderAssets(data.assets);

    if (this.options.mode === 'readonly') {
      this.disableEditing();
    }
  }

  disableEditing() {
    // 드래그, 리사이즈, 삭제 등 비활성화
    this.paper.setInteractivity(false);
  }
}
```

### 상태 관리

```typescript
// features/viewer/hooks/useViewerMode.ts
export function useViewerMode(mapId: string | null) {
  const { data: mapData, isLoading, error } = useQuery({
    queryKey: ['map', mapId],
    queryFn: () => getMap(mapId!),
    enabled: !!mapId,
  });

  return {
    mapData,
    isLoading,
    error,
  };
}
```

### 임베드 보안

```typescript
// EmbedViewerPage에서 postMessage 통신
window.addEventListener('message', (event) => {
  if (event.origin !== ALLOWED_ORIGIN) return;

  // 허용된 명령만 처리
  if (event.data.type === 'zoom') {
    renderer.setZoom(event.data.level);
  }
});
```

---

## 📊 성능 최적화

1. **지연 로딩**: 뷰어 모드로 전환할 때만 데이터 로드
2. **캐싱**: React Query로 맵 데이터 캐싱
3. **가상화**: 대량 객체 렌더링 시 가상화 적용
4. **이미지 최적화**: 도면 이미지 압축 및 CDN 사용

---

## ✅ 체크리스트

### 필수 기능
- [ ] 에디터 내 뷰어 모드 전환
- [ ] 저장 API 연동
- [ ] 독립 뷰어 페이지
- [ ] 임베드 URL 생성
- [ ] 공유 링크 복사
- [ ] 임베드 코드 복사

### 선택 기능 (V2)
- [ ] 버전 관리 (히스토리)
- [ ] 댓글 기능
- [ ] 협업 모드
- [ ] 실시간 동기화

---

## 🚀 다음 단계

1. **서버 API 명세 확인**: 위 API 설계와 실제 서버 API 매칭
2. **Phase 1 구현 시작**: 에디터 내 뷰어 모드
3. **테스트**: 저장 → 뷰어 전환 → 편집 복귀 플로우 검증
4. **Phase 2-3 순차 진행**: 독립 뷰어 → 임베드

---

**문서 작성일**: 2025-12-12
**작성자**: Claude Code
**버전**: 1.0
