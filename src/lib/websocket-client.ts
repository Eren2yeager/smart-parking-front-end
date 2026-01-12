// WebSocket client for Python backend communication

export type GateDetectionResult = {
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

export type LotCapacityResult = {
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

export class ParkingWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private onMessageCallback?: (data: any) => void;
  private onErrorCallback?: (error: Event) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3; // Reduced from 5
  private shouldReconnect = true;

  constructor(url: string) {
    this.url = url;
  }

  connect(
    onMessage: (data: any) => void,
    onError?: (error: Event) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Close existing connection if any
      if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
        console.log('[WebSocket] Closing existing connection');
        this.ws.close();
      }

      try {
        this.ws = new WebSocket(this.url);
        this.onMessageCallback = onMessage;
        this.onErrorCallback = onError;
        this.shouldReconnect = true;

        this.ws.onopen = () => {
          console.log(`[WebSocket] Connected to ${this.url}`);
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.onMessageCallback?.(data);
          } catch (error) {
            console.error('[WebSocket] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          this.onErrorCallback?.(error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[WebSocket] Connection closed');
          if (this.shouldReconnect) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  sendFrame(imageData: string, metadata?: Record<string, any>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Per API docs: send { data: base64 } format
      const message = {
        data: imageData,
        ...metadata,
      };
      console.log('[WebSocket] Sending frame:', {
        dataLength: imageData.length,
        metadata
      });
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  }

  sendBinary(imageBytes: ArrayBuffer) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(imageBytes);
    } else {
      console.warn('WebSocket not connected');
    }
  }

  reset() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'reset' }));
    }
  }

  getStats() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'stats' }));
    }
  }

  disconnect() {
    this.shouldReconnect = false; // Prevent reconnection
    if (this.ws) {
      console.log('[WebSocket] Disconnecting...');
      this.ws.close();
      this.ws = null;
    }
  }

  private attemptReconnect() {
    if (!this.shouldReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('[WebSocket] Max reconnection attempts reached');
      }
      return;
    }

    this.reconnectAttempts++;
    console.log(`[WebSocket] Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    setTimeout(() => {
      if (this.onMessageCallback && this.shouldReconnect) {
        this.connect(this.onMessageCallback, this.onErrorCallback).catch(() => {
          console.log('[WebSocket] Reconnection failed');
        });
      }
    }, 2000 * this.reconnectAttempts);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
