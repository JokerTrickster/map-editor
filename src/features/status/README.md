# Status Feature Module

실시간 객체 상태 표시 기능 (CCTV 연결 상태, 주차 상태)

## 개요

웹소켓을 통해 실시간으로 맵 객체의 상태를 업데이트하고 표시하는 기능입니다.
현재는 목데이터로 작동하며, 나중에 실제 웹소켓으로 쉽게 교체할 수 있도록 설계되었습니다.

## 지원 객체 타입

- **CCTV**: 연결 여부 (초록색: 연결됨, 빨간색: 끊김)
- **ParkingLocation**: 주차 여부 (빨간색: 주차됨, 초록색: 비어있음)

## 사용 방법

### 1. EditorPage에 통합

```tsx
import { useEffect } from 'react';
import {
  statusService,
  useStatusStore,
  StatusOverlay
} from '@/features/status';

export default function EditorPage() {
  const { connect, disconnect } = useStatusStore();

  // Initialize status service when graph is ready
  useEffect(() => {
    if (!graph) return;

    // Get object IDs for status monitoring
    const cctvIds = graph.getElements()
      .filter(el => el.get('type') === 'Cctv')
      .map(el => el.id);

    const parkingIds = graph.getElements()
      .filter(el => el.get('type') === 'ParkingLocation')
      .map(el => el.id);

    // Initialize mock service with IDs
    statusService.initialize(cctvIds, parkingIds);

    // Connect to status updates
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [graph, connect, disconnect]);

  return (
    <div className={styles.editorPage}>
      <div className={styles.canvasContainer} ref={canvasRef}>
        {/* Canvas rendering */}

        {/* Status overlay */}
        {graph && paper && (
          <StatusOverlay graph={graph} paper={paper} />
        )}
      </div>
    </div>
  );
}
```

### 2. 개별 컴포넌트 사용

상태 표시를 직접 렌더링하려면:

```tsx
import { CctvStatusIndicator, ParkingStatusIndicator } from '@/features/status';

// CCTV 상태
<CctvStatusIndicator objectId="cctv-001" />

// 주차 상태
<ParkingStatusIndicator objectId="parking-001" />
```

### 3. 상태 데이터 직접 접근

```tsx
import { useCctvStatus, useParkingStatus } from '@/features/status';

function MyComponent({ objectId }) {
  const cctvStatus = useCctvStatus(objectId);
  const parkingStatus = useParkingStatus(objectId);

  return (
    <div>
      {cctvStatus && (
        <p>CCTV 연결: {cctvStatus.connected ? '연결됨' : '끊김'}</p>
      )}
      {parkingStatus && (
        <p>주차 상태: {parkingStatus.occupied ? '주차됨' : '비어있음'}</p>
      )}
    </div>
  );
}
```

## 아키텍처

### 파일 구조

```
features/status/
├── types/status.ts              # 타입 정의
├── api/statusService.ts         # WebSocket 추상화 (현재: mock)
├── model/statusStore.ts         # Zustand store
├── ui/
│   ├── CctvStatusIndicator.tsx
│   ├── ParkingStatusIndicator.tsx
│   ├── StatusIndicator.module.css
│   ├── StatusOverlay.tsx
│   └── StatusOverlay.module.css
├── index.ts                     # Public API
└── README.md
```

### 데이터 흐름

```
WebSocket (실제) / Mock Service (현재)
    ↓
statusService.subscribe()
    ↓
statusStore (Zustand)
    ↓
React Components (useCctvStatus, useParkingStatus)
    ↓
UI Update
```

## 목데이터 동작

현재 `statusService.ts`는 목데이터로 작동합니다:

- **초기화**: `statusService.initialize(cctvIds, parkingIds)`로 객체 ID 전달
- **연결**: `connect()` 호출 시 3-5초마다 랜덤 상태 업데이트
- **CCTV**: 70% 연결 확률
- **Parking**: 50% 주차 확률

## 실제 WebSocket으로 교체

`src/features/status/api/statusService.ts` 파일의 주석 참고:

```typescript
// 1. RealStatusService 주석 해제
// 2. 환경 변수 설정: VITE_WS_URL
// 3. Export 변경:
export const statusService = new RealStatusService();
```

환경 변수 예시 (`.env`):
```
VITE_WS_URL=wss://your-server.com/ws/status
```

## WebSocket 메시지 프로토콜

서버에서 전송하는 메시지 형식:

```typescript
// 개별 CCTV 상태 업데이트
{
  type: 'cctv_status',
  data: {
    objectId: 'cctv-001',
    connected: true,
    lastUpdate: 1234567890,
    errorMessage?: 'Network timeout'
  }
}

// 개별 주차 상태 업데이트
{
  type: 'parking_status',
  data: {
    objectId: 'parking-001',
    occupied: true,
    lastUpdate: 1234567890,
    vehicleInfo: {
      plateNumber: '서울 1234',
      entryTime: 1234567890
    }
  }
}

// 일괄 업데이트
{
  type: 'bulk_update',
  data: {
    cctvStatuses: { ... },
    parkingStatuses: { ... }
  }
}
```

## 성능 고려사항

- **상태 업데이트**: Zustand의 선택적 구독으로 불필요한 리렌더 최소화
- **오버레이**: `pointer-events: none`으로 캔버스 인터랙션 방해 없음
- **메모리**: 연결 해제 시 자동으로 구독 정리

## 테스트

```bash
# 개발 서버 실행
npm run dev

# 에디터에서 CCTV 또는 ParkingLocation 객체 생성
# 3-5초마다 상태가 랜덤하게 변경되는 것을 확인
```

## 문제 해결

### 상태가 표시되지 않음

1. `statusService.initialize()` 호출 확인
2. `connect()` 호출 확인
3. 객체 타입이 'Cctv' 또는 'ParkingLocation'인지 확인
4. 브라우저 콘솔에서 `[StatusService] Connected` 메시지 확인

### 위치가 잘못됨

`StatusOverlay.tsx`에서 `top` 오프셋 조정:
```tsx
top: position.y - 30, // 객체 위에 표시
```

## 향후 개선사항

- [ ] 연결 상태 표시 (상단 헤더)
- [ ] 상태 히스토리 기록
- [ ] 필터링 (특정 상태만 표시)
- [ ] 알림 시스템 (연결 끊김, 주차 만차 등)
