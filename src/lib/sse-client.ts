/**
 * SSE Client - Client-side utility for Server-Sent Events
 * 
 * This client:
 * - Establishes EventSource connection to SSE endpoint
 * - Handles reconnection on disconnect
 * - Parses and dispatches events to registered callbacks
 * - Provides type-safe event handling
 * 
 * Requirements: 4.6, 7.5
 */

export type SSEEventType = 'capacity_update' | 'alert' | 'violation' | 'ping' | 'connected';

export type CapacityUpdateEvent = {
  event?: string; // 'vehicle_entry' or 'vehicle_exit' for gate events
  parkingLotId: string;
  totalSlots?: number;
  occupied?: number;
  empty?: number;
  occupancyRate?: number;
  timestamp: string | Date;
  plateNumber?: string;
  duration?: number;
};

export type AlertEvent = {
  _id: string;
  type: string;
  severity: string;
  parkingLotId: string;
  contractorId?: string;
  message: string;
  status: string;
  createdAt: string | Date;
};

export type ViolationEvent = {
  _id: string;
  contractorId: string;
  parkingLotId: string;
  violationType: string;
  timestamp: string | Date;
  details: {
    allocatedCapacity: number;
    actualOccupancy: number;
    excessVehicles: number;
    duration: number;
  };
  penalty: number;
  status: string;
};

export type PingEvent = {
  timestamp: string | Date;
};

export type ConnectedEvent = {
  clientId: string;
  timestamp: string | Date;
  message: string;
};

export type SSEEventCallback<T = any> = (data: T) => void;

export class SSEClient {
  private eventSource: EventSource | null = null;
  private url: string;
  private callbacks: Map<SSEEventType, Set<SSEEventCallback>> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000; // Start with 2 seconds
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private shouldReconnect: boolean = true;

  constructor(url: string = '/api/sse/dashboard') {
    this.url = url;
  }

  /**
   * Connect to SSE endpoint
   */
  connect(): void {
    if (this.eventSource) {
      console.log('[SSEClient] Already connected');
      return;
    }

    console.log('[SSEClient] Connecting to', this.url);
    this.shouldReconnect = true;

    try {
      this.eventSource = new EventSource(this.url);

      // Handle connection open
      this.eventSource.onopen = () => {
        console.log('[SSEClient] Connected successfully');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 2000; // Reset delay
      };

      // Handle generic messages
      this.eventSource.onmessage = (event) => {
        console.log('[SSEClient] Received message:', event.data);
      };

      // Handle connection errors
      this.eventSource.onerror = (error) => {
        console.error('[SSEClient] Connection error:', error);
        
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          console.log('[SSEClient] Connection closed');
          this.handleDisconnect();
        }
      };

      // Register event listeners for specific event types
      this.eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data) as ConnectedEvent;
        console.log('[SSEClient] Connection established:', data);
        this.dispatchEvent('connected', data);
      });

      this.eventSource.addEventListener('capacity_update', (event) => {
        const data = JSON.parse(event.data) as CapacityUpdateEvent;
        this.dispatchEvent('capacity_update', data);
      });

      this.eventSource.addEventListener('alert', (event) => {
        const data = JSON.parse(event.data) as AlertEvent;
        this.dispatchEvent('alert', data);
      });

      this.eventSource.addEventListener('violation', (event) => {
        const data = JSON.parse(event.data) as ViolationEvent;
        this.dispatchEvent('violation', data);
      });

      this.eventSource.addEventListener('ping', (event) => {
        const data = JSON.parse(event.data) as PingEvent;
        this.dispatchEvent('ping', data);
      });

    } catch (error) {
      console.error('[SSEClient] Failed to create EventSource:', error);
      this.handleDisconnect();
    }
  }

  /**
   * Disconnect from SSE endpoint
   */
  disconnect(): void {
    console.log('[SSEClient] Disconnecting...');
    this.shouldReconnect = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Register callback for specific event type
   */
  on<T = any>(eventType: SSEEventType, callback: SSEEventCallback<T>): void {
    if (!this.callbacks.has(eventType)) {
      this.callbacks.set(eventType, new Set());
    }
    this.callbacks.get(eventType)!.add(callback);
  }

  /**
   * Unregister callback for specific event type
   */
  off<T = any>(eventType: SSEEventType, callback: SSEEventCallback<T>): void {
    const callbacks = this.callbacks.get(eventType);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * Register callback for capacity updates
   */
  onCapacityUpdate(callback: SSEEventCallback<CapacityUpdateEvent>): void {
    this.on('capacity_update', callback);
  }

  /**
   * Register callback for alerts
   */
  onAlert(callback: SSEEventCallback<AlertEvent>): void {
    this.on('alert', callback);
  }

  /**
   * Register callback for violations
   */
  onViolation(callback: SSEEventCallback<ViolationEvent>): void {
    this.on('violation', callback);
  }

  /**
   * Register callback for connection established
   */
  onConnected(callback: SSEEventCallback<ConnectedEvent>): void {
    this.on('connected', callback);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  /**
   * Get connection state
   */
  getReadyState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED;
  }

  /**
   * Dispatch event to registered callbacks
   */
  private dispatchEvent(eventType: SSEEventType, data: any): void {
    const callbacks = this.callbacks.get(eventType);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[SSEClient] Error in ${eventType} callback:`, error);
        }
      });
    }
  }

  /**
   * Handle disconnect and attempt reconnection
   */
  private handleDisconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (!this.shouldReconnect) {
      console.log('[SSEClient] Reconnection disabled');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SSEClient] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(
      `[SSEClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }
}

/**
 * Create a new SSE client instance
 */
export function createSSEClient(url?: string): SSEClient {
  return new SSEClient(url);
}
