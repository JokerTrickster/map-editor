/**
 * Status Service - WebSocket abstraction for real-time status updates
 *
 * Current implementation: Mock data with simulated updates
 * Future implementation: Replace with actual WebSocket connection
 */

import type {
  IStatusService,
  StatusMessage,
  CctvStatus,
  ParkingLocationStatus,
  StatusData,
} from '../types/status';

/**
 * Mock Status Service
 * Simulates WebSocket connection with random status updates
 *
 * To replace with real WebSocket:
 * 1. Replace connect() to establish WebSocket connection
 * 2. Replace disconnect() to close WebSocket
 * 3. Replace updateInterval with WebSocket message handlers
 * 4. Keep the same IStatusService interface
 */
class MockStatusService implements IStatusService {
  private connected = false;
  private subscribers: Set<(message: StatusMessage) => void> = new Set();
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  // Mock data: Object IDs for simulation
  private mockCctvIds: string[] = [];
  private mockParkingIds: string[] = [];

  /**
   * Initialize with object IDs for mock data
   * In real implementation, these would come from the server
   */
  initialize(cctvIds: string[], parkingIds: string[]) {
    this.mockCctvIds = cctvIds;
    this.mockParkingIds = parkingIds;
    console.log('[StatusService] Initializing with objects:', {
      cctvCount: cctvIds.length,
      parkingCount: parkingIds.length,
    });
  }

  connect(): void {
    if (this.connected) return;

    this.connected = true;
    console.log('[StatusService] Connected (mock)');

    // Send initial bulk update
    this.sendBulkUpdate();

    // Simulate random status updates every 1 second
    this.updateInterval = setInterval(() => {
      this.sendRandomUpdate();
    }, 1000); // 1 second
  }

  disconnect(): void {
    if (!this.connected) return;

    this.connected = false;
    console.log('[StatusService] Disconnected (mock)');

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  subscribe(callback: (message: StatusMessage) => void): () => void {
    this.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Send bulk initial status update
   */
  private sendBulkUpdate(): void {
    const cctvStatuses: Record<string, CctvStatus> = {};
    const parkingStatuses: Record<string, ParkingLocationStatus> = {};

    // Generate initial CCTV statuses (0-2 disconnected, rest connected)
    const disconnectedCount = Math.floor(Math.random() * 3); // 0, 1, or 2
    const disconnectedIndices = new Set<number>();

    // Randomly select 0-2 CCTVs to be disconnected
    while (disconnectedIndices.size < Math.min(disconnectedCount, this.mockCctvIds.length)) {
      disconnectedIndices.add(Math.floor(Math.random() * this.mockCctvIds.length));
    }

    this.mockCctvIds.forEach((id, index) => {
      const isDisconnected = disconnectedIndices.has(index);
      cctvStatuses[id] = {
        objectId: id,
        connected: !isDisconnected,
        lastUpdate: Date.now(),
        errorMessage: isDisconnected ? 'Network timeout - 연결 끊김' : undefined,
      };
    });

    // Generate initial parking statuses (50-90% occupied)
    const occupancyRate = 0.5 + Math.random() * 0.4; // 50-90%
    this.mockParkingIds.forEach(id => {
      const occupied = Math.random() < occupancyRate;
      parkingStatuses[id] = {
        objectId: id,
        occupied,
        lastUpdate: Date.now(),
        vehicleInfo: occupied ? {
          plateNumber: this.generatePlateNumber(),
          entryTime: Date.now() - Math.random() * 3600000, // Up to 1 hour ago
        } : undefined,
      };
    });

    const statusData: StatusData = { cctvStatuses, parkingStatuses };
    const message: StatusMessage = {
      type: 'bulk_update',
      data: statusData,
    };

    this.broadcast(message);
  }

  /**
   * Send random status update
   * Updates all parking and CCTV statuses every second
   */
  private sendRandomUpdate(): void {
    // Update all parking statuses with new random occupancy (50-90%)
    this.updateAllParkingStatuses();

    // Update all CCTV statuses with random disconnections (0-2)
    this.updateAllCctvStatuses();
  }

  /**
   * Update all parking statuses with random occupancy (50-90%)
   */
  private updateAllParkingStatuses(): void {
    if (this.mockParkingIds.length === 0) return;

    const parkingStatuses: Record<string, ParkingLocationStatus> = {};
    const occupancyRate = 0.5 + Math.random() * 0.4; // 50-90% random each update

    this.mockParkingIds.forEach(id => {
      const occupied = Math.random() < occupancyRate;
      parkingStatuses[id] = {
        objectId: id,
        occupied,
        lastUpdate: Date.now(),
        vehicleInfo: occupied ? {
          plateNumber: this.generatePlateNumber(),
          entryTime: Date.now() - Math.random() * 3600000, // Up to 1 hour ago
        } : undefined,
      };
    });

    const statusData: StatusData = { cctvStatuses: {}, parkingStatuses };
    const message: StatusMessage = {
      type: 'bulk_update',
      data: statusData,
    };

    this.broadcast(message);
  }

  /**
   * Update all CCTV statuses with random disconnections (0-2)
   */
  private updateAllCctvStatuses(): void {
    if (this.mockCctvIds.length === 0) return;

    const cctvStatuses: Record<string, CctvStatus> = {};
    const disconnectedCount = Math.floor(Math.random() * 3); // 0, 1, or 2
    const disconnectedIndices = new Set<number>();

    // Randomly select 0-2 CCTVs to be disconnected
    while (disconnectedIndices.size < Math.min(disconnectedCount, this.mockCctvIds.length)) {
      disconnectedIndices.add(Math.floor(Math.random() * this.mockCctvIds.length));
    }

    this.mockCctvIds.forEach((id, index) => {
      const isDisconnected = disconnectedIndices.has(index);
      cctvStatuses[id] = {
        objectId: id,
        connected: !isDisconnected,
        lastUpdate: Date.now(),
        errorMessage: isDisconnected ? 'Network timeout - 연결 끊김' : undefined,
      };
    });

    const statusData: StatusData = { cctvStatuses, parkingStatuses: {} };
    const message: StatusMessage = {
      type: 'bulk_update',
      data: statusData,
    };

    this.broadcast(message);
  }

  /**
   * Update random CCTV status (deprecated - kept for backward compatibility)
   */
  private updateRandomCctv(): void {
    if (this.mockCctvIds.length === 0) return;

    const randomId = this.mockCctvIds[
      Math.floor(Math.random() * this.mockCctvIds.length)
    ];

    const connected = Math.random() > 0.3; // 70% chance to be connected

    const status: CctvStatus = {
      objectId: randomId,
      connected,
      lastUpdate: Date.now(),
      errorMessage: !connected ? 'Network timeout' : undefined,
    };

    const message: StatusMessage = {
      type: 'cctv_status',
      data: status,
    };

    this.broadcast(message);
  }

  /**
   * Update random parking status (deprecated - kept for backward compatibility)
   */
  private updateRandomParking(): void {
    if (this.mockParkingIds.length === 0) return;

    const randomId = this.mockParkingIds[
      Math.floor(Math.random() * this.mockParkingIds.length)
    ];

    const occupied = Math.random() > 0.5; // 50% chance

    const status: ParkingLocationStatus = {
      objectId: randomId,
      occupied,
      lastUpdate: Date.now(),
      vehicleInfo: occupied ? {
        plateNumber: this.generatePlateNumber(),
        entryTime: Date.now(),
      } : undefined,
    };

    const message: StatusMessage = {
      type: 'parking_status',
      data: status,
    };

    this.broadcast(message);
  }

  /**
   * Broadcast message to all subscribers
   */
  private broadcast(message: StatusMessage): void {
    this.subscribers.forEach(callback => callback(message));
  }

  /**
   * Generate random Korean plate number
   */
  private generatePlateNumber(): string {
    const regions = ['서울', '경기', '인천', '부산', '대구'];
    const region = regions[Math.floor(Math.random() * regions.length)];
    const numbers = Math.floor(Math.random() * 9000) + 1000;
    return `${region} ${numbers}`;
  }
}

/**
 * Real WebSocket Service (placeholder for future implementation)
 *
 * Uncomment and implement when WebSocket server is ready:
 */
/*
class RealStatusService implements IStatusService {
  private ws: WebSocket | null = null;
  private subscribers: Set<(message: StatusMessage) => void> = new Set();

  connect(): void {
    this.ws = new WebSocket(import.meta.env.VITE_WS_URL);

    this.ws.onopen = () => {
      console.log('[StatusService] WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      const message: StatusMessage = JSON.parse(event.data);
      this.broadcast(message);
    };

    this.ws.onerror = (error) => {
      console.error('[StatusService] WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('[StatusService] WebSocket disconnected');
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  subscribe(callback: (message: StatusMessage) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private broadcast(message: StatusMessage): void {
    this.subscribers.forEach(callback => callback(message));
  }
}
*/

// Export singleton instance
// To switch to real WebSocket: change MockStatusService to RealStatusService
export const statusService = new MockStatusService();
