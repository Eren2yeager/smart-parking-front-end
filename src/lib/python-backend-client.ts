/**
 * PythonBackendClient - Server-side WebSocket client for Python backend integration
 * 
 * This class manages WebSocket connections to the Python AI/ML backend for:
 * - Gate monitoring (license plate detection)
 * - Lot monitoring (parking capacity detection)
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Connection error handling
 * - Separate connections for gate and lot monitoring
 * - Event-based callbacks for detections
 */

import WebSocket from 'ws';

// Type definitions for Python backend messages
export type PlateDetection = {
  success: boolean;
  type: 'plate_detection';
  timestamp: number;
  frame_number: number;
  processed_frame_number: number;
  plates: Array<{
    plate_number: string;
    raw_text: string;
    confidence: number;
    detection_confidence: number;
    bbox: { x1: number; y1: number; x2: number; y2: number };
    is_new: boolean;
  }>;
  plates_detected: number;
  new_plates: number;
  processing_time_ms: number;
};

export type CapacityUpdate = {
  success: boolean;
  type: 'capacity_update';
  timestamp: number;
  frame_number: number;
  processed_frame_number: number;
  total_slots: number;
  occupied: number;
  empty: number;
  occupancy_rate: number;
  slots: Array<{
    slot_id: number;
    status: 'occupied' | 'empty';
    confidence: number;
    bbox: { x1: number; y1: number; x2: number; y2: number };
  }>;
  state_change?: {
    previous: number;
    current: number;
    change: number;
    direction: string;
  };
  processing_time_ms: number;
};

type ConnectionConfig = {
  url: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  reconnectBackoffMultiplier?: number;
};

type ConnectionState = {
  ws: WebSocket | null;
  reconnectAttempts: number;
  shouldReconnect: boolean;
  reconnectTimeout: NodeJS.Timeout | null;
};

export class PythonBackendClient {
  private gateConnection: ConnectionState;
  private lotConnection: ConnectionState;
  private config: Required<ConnectionConfig>;
  
  // Callbacks for detections
  private plateDetectionCallback?: (data: PlateDetection) => void;
  private capacityUpdateCallback?: (data: CapacityUpdate) => void;
  
  // Callbacks for connection events
  private gateErrorCallback?: (error: Error) => void;
  private lotErrorCallback?: (error: Error) => void;

  constructor(config: Partial<ConnectionConfig> = {}) {
    this.config = {
      url: config.url || process.env.PYTHON_BACKEND_URL || 'ws://localhost:8000',
      maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
      reconnectDelay: config.reconnectDelay ?? 1000,
      reconnectBackoffMultiplier: config.reconnectBackoffMultiplier ?? 1.5,
    };

    this.gateConnection = {
      ws: null,
      reconnectAttempts: 0,
      shouldReconnect: false,
      reconnectTimeout: null,
    };

    this.lotConnection = {
      ws: null,
      reconnectAttempts: 0,
      shouldReconnect: false,
      reconnectTimeout: null,
    };
  }

  /**
   * Connect to Python backend gate monitor endpoint
   * Listens for license plate detections
   */
  async connectGateMonitor(
    parkingLotId?: string,
    onError?: (error: Error) => void
  ): Promise<void> {
    const endpoint = parkingLotId 
      ? `/ws/gate-monitor?lot_id=${parkingLotId}`
      : '/ws/gate-monitor';
    
    this.gateErrorCallback = onError;
    
    return this.connect(
      this.gateConnection,
      `${this.config.url}${endpoint}`,
      'gate',
      (data) => {
        if (data.type === 'plate_detection') {
          this.plateDetectionCallback?.(data as PlateDetection);
        }
      }
    );
  }

  /**
   * Connect to Python backend lot monitor endpoint
   * Listens for parking capacity updates
   */
  async connectLotMonitor(
    parkingLotId?: string,
    onError?: (error: Error) => void
  ): Promise<void> {
    const endpoint = parkingLotId
      ? `/ws/lot-monitor?lot_id=${parkingLotId}`
      : '/ws/lot-monitor';
    
    this.lotErrorCallback = onError;
    
    return this.connect(
      this.lotConnection,
      `${this.config.url}${endpoint}`,
      'lot',
      (data) => {
        if (data.type === 'capacity_update') {
          this.capacityUpdateCallback?.(data as CapacityUpdate);
        }
      }
    );
  }

  /**
   * Register callback for plate detections
   */
  onPlateDetection(callback: (data: PlateDetection) => void): void {
    this.plateDetectionCallback = callback;
  }

  /**
   * Register callback for capacity updates
   */
  onCapacityUpdate(callback: (data: CapacityUpdate) => void): void {
    this.capacityUpdateCallback = callback;
  }

  /**
   * Disconnect from gate monitor
   */
  disconnectGate(): void {
    this.disconnect(this.gateConnection, 'gate');
  }

  /**
   * Disconnect from lot monitor
   */
  disconnectLot(): void {
    this.disconnect(this.lotConnection, 'lot');
  }

  /**
   * Disconnect from all connections
   */
  disconnectAll(): void {
    this.disconnectGate();
    this.disconnectLot();
  }

  /**
   * Check if gate monitor is connected
   */
  isGateConnected(): boolean {
    return this.gateConnection.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Check if lot monitor is connected
   */
  isLotConnected(): boolean {
    return this.lotConnection.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Internal method to establish WebSocket connection
   */
  private async connect(
    connection: ConnectionState,
    url: string,
    type: 'gate' | 'lot',
    onMessage: (data: any) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Close existing connection if any
      if (connection.ws && connection.ws.readyState !== WebSocket.CLOSED) {
        console.log(`[PythonBackendClient] Closing existing ${type} connection`);
        connection.ws.close();
      }

      // Clear any pending reconnect timeout
      if (connection.reconnectTimeout) {
        clearTimeout(connection.reconnectTimeout);
        connection.reconnectTimeout = null;
      }

      try {
        console.log(`[PythonBackendClient] Connecting to ${type} monitor: ${url}`);
        connection.ws = new WebSocket(url);
        connection.shouldReconnect = true;

        connection.ws.on('open', () => {
          console.log(`[PythonBackendClient] ${type} monitor connected`);
          connection.reconnectAttempts = 0;
          resolve();
        });

        connection.ws.on('message', (data: WebSocket.Data) => {
          try {
            const parsed = JSON.parse(data.toString());
            onMessage(parsed);
          } catch (error) {
            console.error(`[PythonBackendClient] Failed to parse ${type} message:`, error);
          }
        });

        connection.ws.on('error', (error) => {
          console.error(`[PythonBackendClient] ${type} monitor error:`, error);
          const errorCallback = type === 'gate' ? this.gateErrorCallback : this.lotErrorCallback;
          errorCallback?.(error as Error);
          reject(error);
        });

        connection.ws.on('close', () => {
          console.log(`[PythonBackendClient] ${type} monitor connection closed`);
          if (connection.shouldReconnect) {
            this.attemptReconnect(connection, url, type, onMessage);
          }
        });
      } catch (error) {
        console.error(`[PythonBackendClient] Failed to create ${type} connection:`, error);
        reject(error);
      }
    });
  }

  /**
   * Internal method to handle reconnection with exponential backoff
   */
  private attemptReconnect(
    connection: ConnectionState,
    url: string,
    type: 'gate' | 'lot',
    onMessage: (data: any) => void
  ): void {
    if (!connection.shouldReconnect) {
      return;
    }

    if (connection.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error(
        `[PythonBackendClient] Max reconnection attempts (${this.config.maxReconnectAttempts}) reached for ${type} monitor`
      );
      const errorCallback = type === 'gate' ? this.gateErrorCallback : this.lotErrorCallback;
      errorCallback?.(new Error(`Max reconnection attempts reached for ${type} monitor`));
      return;
    }

    connection.reconnectAttempts++;
    
    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(this.config.reconnectBackoffMultiplier, connection.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    console.log(
      `[PythonBackendClient] Reconnecting ${type} monitor in ${delay}ms (attempt ${connection.reconnectAttempts}/${this.config.maxReconnectAttempts})`
    );

    connection.reconnectTimeout = setTimeout(() => {
      if (connection.shouldReconnect) {
        this.connect(connection, url, type, onMessage).catch((error) => {
          console.error(`[PythonBackendClient] ${type} reconnection failed:`, error);
        });
      }
    }, delay);
  }

  /**
   * Internal method to disconnect a connection
   */
  private disconnect(connection: ConnectionState, type: 'gate' | 'lot'): void {
    connection.shouldReconnect = false;
    
    if (connection.reconnectTimeout) {
      clearTimeout(connection.reconnectTimeout);
      connection.reconnectTimeout = null;
    }

    if (connection.ws) {
      console.log(`[PythonBackendClient] Disconnecting ${type} monitor`);
      connection.ws.close();
      connection.ws = null;
    }
    
    connection.reconnectAttempts = 0;
  }
}
