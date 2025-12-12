# 뷰어 UI 디자인 목업

## 🎨 디자인 시스템 기반

현재 에디터의 디자인 토큰을 그대로 활용:
- **컬러**: Light/Dark 테마 지원
- **Primary**: `#2563eb` (Blue-600)
- **Surface**: `#f8fafc` (Light), `#151b2b` (Dark)
- **Border**: `#e2e8f0`
- **Border Radius**: `12px` (lg), `16px` (xl)
- **Spacing**: 4px 단위 체계

---

## 1️⃣ 에디터 내 뷰어 모드

### 1-1. 헤더 - 편집/뷰어 탭 추가

#### 현재 헤더 (편집 모드)
```
┌────────────────────────────────────────────────────────────────────────┐
│ [←] 🗺️ Map Editor (parking-lot-floor-1.svg)                           │
│                                                                        │
│ [Zoom Controls] │ [Save] [Upload CSV] [Clear] │ [Export] │ [🌙] [Logout] │
└────────────────────────────────────────────────────────────────────────┘
```

#### 새 헤더 (탭 추가)
```
┌────────────────────────────────────────────────────────────────────────┐
│ [←] 🗺️ Map Editor                                                     │
│                                                                        │
│ ┌──────────┬──────────┐                                               │
│ │   편집   │   뷰어   │ ← 탭 (버튼 스타일)                             │
│ └──────────┴──────────┘                                               │
│                                                                        │
│ [Zoom] │ [Save] [Upload] [Clear] │ [Export] [Share Link 📋] │ [🌙] [Logout] │
└────────────────────────────────────────────────────────────────────────┘
```

**CSS 스타일:**
```css
.modeTabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.modeTab {
  padding: 8px 24px;
  border-radius: 8px 8px 0 0;
  background: transparent;
  border: 1px solid var(--color-border);
  border-bottom: none;
  color: var(--color-text-secondary);
  font-weight: 500;
  transition: all var(--transition-fast);
  cursor: pointer;
}

.modeTab:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.modeTabActive {
  background: var(--color-surface);
  color: var(--color-primary);
  border-color: var(--color-primary);
  border-bottom: 2px solid var(--color-surface); /* 연결감 */
}
```

---

### 1-2. 편집 모드 (기존 유지)

```
┌────────────────────────────────────────────────────────────────────────┐
│ Header [편집 탭 활성화]                                                │
├────┬──────────────────────────────────────────────────────┬────────────┤
│    │                                                      │            │
│ 도 │                                                      │  속성      │
│ 구 │              캔버스 (편집 가능)                       │  패널      │
│ 팔 │                                                      │            │
│ 레 │  [객체 드래그, 생성, 편집 모두 가능]                  │  - 이름    │
│ 트 │                                                      │  - 타입    │
│    │                                                      │  - 속성    │
│ 72 │                                                      │  - 관계    │
│ px │                                                      │            │
│    │                                                      │  360px     │
└────┴──────────────────────────────────────────────────────┴────────────┘
```

---

### 1-3. 뷰어 모드 (NEW)

```
┌────────────────────────────────────────────────────────────────────────┐
│ Header [뷰어 탭 활성화]                                                │
│                                                                        │
│ ℹ️  현재 저장된 버전을 보고 있습니다 (2025-12-12 10:30)  [편집 모드로] │
└────────────────────────────────────────────────────────────────────────┘
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                                                                        │
│                        캔버스 (읽기 전용)                               │
│                                                                        │
│  - 좌측 도구 팔레트 숨김                                                │
│  - 우측 속성 패널 숨김                                                  │
│  - 객체 드래그/편집 비활성화                                            │
│  - 객체 클릭 시 정보 툴팁만 표시                                        │
│                                                                        │
│  ┌──────────────────────┐                                             │
│  │ 🔍 Zoom Controls     │                                             │
│  │ [+] [-] [Reset] [Fit]│                                             │
│  └──────────────────────┘                                             │
│                                                                        │
│  [객체 클릭 시]                                                        │
│  ┌──────────────────────────────┐                                     │
│  │ 🏷️ CCTV-001                  │                                     │
│  │ 타입: Light CCTV             │                                     │
│  │ 위치: (120, 340)             │                                     │
│  │ 관계: 주차구역 7개 연결       │                                     │
│  └──────────────────────────────┘                                     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**뷰어 모드 인디케이터:**
```css
.viewerModeIndicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  background: rgba(59, 130, 246, 0.1);
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  color: var(--color-primary);
  font-size: 14px;
}

.backToEditButton {
  margin-left: auto;
  padding: 6px 16px;
  background: var(--color-primary);
  color: white;
  border-radius: 8px;
  font-weight: 500;
  transition: all var(--transition-fast);
}

.backToEditButton:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
```

---

## 2️⃣ 저장 성공 모달

### 모달 디자인

```
                     [배경 어둡게 - rgba(0,0,0,0.5)]

           ┌────────────────────────────────────────────────┐
           │  ✅ 저장 완료!                                 │
           │  ─────────────────────────────────────────    │
           │                                                │
           │  맵이 성공적으로 저장되었습니다.                │
           │                                                │
           │  📅 저장 시간: 2025-12-12 10:30:45            │
           │  📦 맵 ID: map_abc123xyz                      │
           │                                                │
           │  ┌──────────────────────────────────────────┐ │
           │  │ 🔗 공유 링크                              │ │
           │  │ https://mapeditor.com/viewer/abc123      │ │
           │  │                           [복사 📋]       │ │
           │  └──────────────────────────────────────────┘ │
           │                                                │
           │  ┌──────────────────────────────────────────┐ │
           │  │ 💻 임베드 코드                            │ │
           │  │ <iframe src="..."                        │ │
           │  │   width="800" height="600">              │ │
           │  │ </iframe>                [복사 📋]        │ │
           │  └──────────────────────────────────────────┘ │
           │                                                │
           │  ┌─────────────────┐  ┌───────────────────┐  │
           │  │  뷰어로 보기 👁️ │  │  계속 편집 ✏️     │  │
           │  │  (Primary)      │  │  (Secondary)      │  │
           │  └─────────────────┘  └───────────────────┘  │
           │                                                │
           │                                          [✕]  │
           └────────────────────────────────────────────────┘
```

**CSS:**
```css
.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--color-bg);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-2xl);
  padding: 32px;
  max-width: 560px;
  width: 90%;
  z-index: var(--z-modal);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translate(-50%, -48%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}

.modalTitle {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-success);
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.shareBox {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 16px;
}

.shareBoxLabel {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: 600;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.shareLink {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  background: var(--color-bg);
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px dashed var(--color-border);
}

.copyButton {
  padding: 6px 12px;
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 600;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.copyButton:hover {
  background: var(--color-primary-hover);
  transform: scale(1.05);
}

.modalActions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.primaryAction {
  flex: 1;
  padding: 14px 24px;
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-lg);
  font-weight: 600;
  font-size: var(--font-size-md);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.primaryAction:hover {
  background: var(--color-primary-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.secondaryAction {
  flex: 1;
  padding: 14px 24px;
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-weight: 600;
  font-size: var(--font-size-md);
  transition: all var(--transition-fast);
}

.secondaryAction:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
}
```

---

## 3️⃣ 독립 뷰어 페이지

```
┌────────────────────────────────────────────────────────────────────────┐
│ [←] 🗺️ Map Viewer                                  [에디터로 돌아가기] │
│                                                                        │
│ parking-lot-floor-1                                                   │
│ 작성자: user@example.com  │  최종 저장: 2025-12-12 10:30             │
└────────────────────────────────────────────────────────────────────────┘
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                                                                        │
│                        맵 캔버스 (읽기 전용)                            │
│                                                                        │
│                                                                        │
│  우측 하단 컨트롤:                                                      │
│  ┌─────────────────────┐                                              │
│  │ 🔍 Zoom             │                                              │
│  │ [+] [-] [Reset]     │                                              │
│  │                     │                                              │
│  │ 📊 Layers           │                                              │
│  │ ☑️ Parking (120)    │                                              │
│  │ ☑️ CCTV (15)        │                                              │
│  │ ☑️ Emergency (8)    │                                              │
│  │                     │                                              │
│  │ [⛶ Fullscreen]     │                                              │
│  └─────────────────────┘                                              │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**헤더 (간소화):**
```css
.viewerHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.viewerTitle {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text);
}

.viewerMeta {
  display: flex;
  gap: 24px;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.backToEditorButton {
  padding: 10px 20px;
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-lg);
  font-weight: 600;
  transition: all var(--transition-fast);
}

.backToEditorButton:hover {
  background: var(--color-primary-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
```

**컨트롤 패널:**
```css
.viewerControls {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--color-surface-glass);
  backdrop-filter: blur(12px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 20px;
  box-shadow: var(--shadow-xl);
  min-width: 200px;
}

.controlSection {
  margin-bottom: 20px;
}

.controlSection:last-child {
  margin-bottom: 0;
}

.controlLabel {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.zoomButtons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.controlButton {
  padding: 8px 12px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-text);
  transition: all var(--transition-fast);
  cursor: pointer;
}

.controlButton:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.layerToggle {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  margin-bottom: 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.layerToggle:hover {
  background: var(--color-surface-hover);
}

.layerCheckbox {
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border);
  border-radius: 4px;
  transition: all var(--transition-fast);
}

.layerCheckbox.checked {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.layerLabel {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--color-text);
}

.layerCount {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  background: var(--color-surface);
  padding: 2px 8px;
  border-radius: 12px;
}
```

---

## 4️⃣ 임베드 뷰어 페이지

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│                                                                        │
│                        맵 캔버스 (헤더 없음)                            │
│                                                                        │
│                                                                        │
│  최소 컨트롤만 표시:                                                    │
│  ┌──────────────┐                                                     │
│  │ [+] [-] [⛶] │                                                     │
│  └──────────────┘                                                     │
│                                                                        │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**CSS:**
```css
.embedViewer {
  width: 100%;
  height: 100vh;
  background: var(--color-canvas-bg);
  position: relative;
  overflow: hidden;
}

.embedControls {
  position: fixed;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  background: var(--color-surface-glass);
  backdrop-filter: blur(8px);
  border-radius: var(--radius-lg);
  padding: 8px;
  box-shadow: var(--shadow-lg);
}

.embedControlButton {
  width: 36px;
  height: 36px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  cursor: pointer;
}

.embedControlButton:hover {
  background: var(--color-surface-hover);
}

.embedControlButton:active {
  transform: scale(0.95);
}
```

---

## 5️⃣ 객체 정보 툴팁 (뷰어 전용)

```
  [맵 위에서 객체 클릭 시]

  ┌──────────────────────────────────────┐
  │ 🏷️ CCTV-001                          │
  ├──────────────────────────────────────┤
  │ 타입: Light CCTV                     │
  │ 위치: X: 120, Y: 340                 │
  │                                      │
  │ 📊 관계:                             │
  │ • 주차구역 7개 연결                   │
  │ • 비상벨 1개 연결                     │
  │ • 우측 CCTV 2개 연결                 │
  │                                      │
  │ [자세히 보기 →]                       │
  └──────────────────────────────────────┘
```

**CSS:**
```css
.objectTooltip {
  position: absolute;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  padding: 16px;
  min-width: 280px;
  max-width: 360px;
  z-index: var(--z-dropdown);
  animation: tooltipFadeIn 0.2s ease-out;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tooltipHeader {
  font-size: var(--font-size-md);
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.tooltipRow {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: var(--font-size-sm);
}

.tooltipLabel {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.tooltipValue {
  color: var(--color-text);
  font-weight: 600;
}

.tooltipSection {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.tooltipSectionTitle {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.relationItem {
  padding: 6px 0;
  font-size: var(--font-size-sm);
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 6px;
}

.relationItem::before {
  content: '•';
  color: var(--color-primary);
  font-weight: 700;
}

.tooltipAction {
  margin-top: 12px;
  padding: 8px 16px;
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-md);
  text-align: center;
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tooltipAction:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
}
```

---

## 6️⃣ 반응형 고려사항

### 모바일 (< 768px)

**에디터 내 뷰어 모드:**
```
┌────────────────────────┐
│ [≡] Map Viewer    [✕] │
├────────────────────────┤
│ [편집] [뷰어] ← 탭      │
├────────────────────────┤
│                        │
│   캔버스 (전체 화면)    │
│                        │
│  컨트롤 (하단 고정)     │
│  [+][-][⟲][⛶]        │
└────────────────────────┘
```

**저장 모달:**
```
┌────────────────────────┐
│ ✅ 저장 완료!          │
├────────────────────────┤
│ 🔗 공유 링크           │
│ https://...  [📋]     │
│                        │
│ 💻 임베드 코드         │
│ <iframe...   [📋]     │
│                        │
│ [뷰어로 보기]          │
│ [계속 편집]            │
└────────────────────────┘
```

---

## 7️⃣ 다크 모드

모든 컴포넌트는 자동으로 다크 모드 지원:

```css
/* 토글 시 자동 적용 */
[data-theme="dark"] {
  --color-bg: #0b0f19;
  --color-surface: #151b2b;
  --color-text: #f8fafc;
  /* ... 나머지 토큰 자동 적용 */
}
```

**다크 모드 예시:**
```
┌────────────────────────────────────────┐
│ [Dark] 🗺️ Map Viewer       [Light 🌙] │
│                                        │
│ [편집] [뷰어] ← 네온 블루 강조          │
├────────────────────────────────────────┤
│                                        │
│  (어두운 배경 + 네온 컬러 객체)         │
│                                        │
└────────────────────────────────────────┘
```

---

## 8️⃣ 인터랙션 애니메이션

### 탭 전환
```css
@keyframes tabSwitch {
  0% { opacity: 0; transform: translateX(-20px); }
  100% { opacity: 1; transform: translateX(0); }
}

.viewerContent {
  animation: tabSwitch 0.3s ease-out;
}
```

### 모달 등장
```css
@keyframes modalAppear {
  0% {
    opacity: 0;
    transform: translate(-50%, -48%) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
```

### 복사 버튼 피드백
```css
.copyButton.copied {
  background: var(--color-success);
}

.copyButton.copied::after {
  content: '✓ 복사됨';
}
```

---

## 9️⃣ 접근성 (Accessibility)

- **키보드 네비게이션**: Tab으로 모든 버튼 접근
- **ARIA 라벨**:
  ```html
  <button aria-label="뷰어 모드로 전환">뷰어</button>
  <div role="tooltip" aria-live="polite">객체 정보</div>
  ```
- **포커스 인디케이터**:
  ```css
  button:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  ```

---

## 📋 구현 체크리스트

### Phase 1: 에디터 내 뷰어 모드
- [ ] 헤더에 편집/뷰어 탭 추가
- [ ] 탭 전환 애니메이션
- [ ] 뷰어 모드 인디케이터 바
- [ ] 도구 팔레트 숨김/표시
- [ ] 속성 패널 숨김/표시
- [ ] 객체 정보 툴팁

### Phase 2: 저장 모달
- [ ] 모달 컴포넌트
- [ ] 공유 링크 표시 및 복사
- [ ] 임베드 코드 생성 및 복사
- [ ] 복사 피드백 애니메이션
- [ ] 뷰어로 보기/계속 편집 버튼

### Phase 3: 독립 뷰어 페이지
- [ ] 간소화된 헤더
- [ ] 뷰어 컨트롤 패널
- [ ] 레이어 토글 기능
- [ ] 풀스크린 모드
- [ ] 에디터로 돌아가기 버튼

### Phase 4: 임베드 뷰어
- [ ] 최소 UI 레이아웃
- [ ] 임베드 전용 컨트롤
- [ ] iframe 크기 자동 조절
- [ ] postMessage 통신 (선택)

---

**문서 작성일**: 2025-12-12
**작성자**: Claude Code
**버전**: 1.0
