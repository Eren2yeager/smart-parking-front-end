/**
 * WebSocket Manager for Live Monitoring
 * 
 * Manages WebSocket connections to the Python backend for real-time video streaming
 * with AI detection overlays. Provides automatic reconnection with exponential backoff,
 * frame rate tracking, and latency monitoring.
 * 
 * @module websocket-manager
 * 
 * @example
 * ```typescript
 * const manager = new WebSocketManager({
 *   url: 'ws://localhost:8000/ws/gate-monitor',
 *   onFrame: (frame) => {
 *     // Render frame with detections
 *     renderVideoFrame(frame);
 *   },
 *   onStatusChange: (status) => {
 *     console.log('Connection status:', status);
 *   },
 *   maxReconnectAttempts: 5,
 * });
 * 
 * await manager.connect();
 * const metrics = manager.getMetrics();
 * console.log(`Frame rate: ${metrics.frameRate} FPS`);
 * ```
 */

/**
 * Connection status of the WebSocket
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

/**
 * Detection object from AI processing
 */
export interface Detection {
  type: 'plate' | 'slot';
  bbox: { x1: number; y1: number; x2: number; y2: number };
  label?: string;
  confidence: number;
  slotId?: number;
  status?: 'occupied' | 'empty';
}

/**
 * Video frame with detections from Python backend
 */
export interface VideoFrame {
  /** Base64 encoded image data */
  frame: string;
  /** Array of detected objects (plates or slots) */
  detections: Detection[];
  /** Timestamp when frame was captured */
  timestamp: number;
  /** Sequential frame number */
  frameNumber: number;
}

/**
 * Configuration options for WebSocketManager
 */
export interface WebSocketManagerConfig {
  url: string;
  onFrame?: (frame: VideoFrame) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onError?: (error: string) => void;
  maxReconnectAttempts?: number;
  initialReconnectDelay?: number;
}

/**
 * Connection metrics for monitoring performance
 */
export interface ConnectionMetrics {
  /** Current connection status */
  status: ConnectionStatus;
  /** Current frame rate in frames per second */
  frameRate: number;
  /** Average latency in milliseconds */
  latency: number;
  /** Number of reconnection attempts made */
  reconnectAttempts: number;
  /** Timestamp of last received frame */
  lastFrameTime: number;
  /** Human-readable status message */
  statusMessage?: string;
  /** Delay until next reconnection attempt (ms) */
  nextReconnectDelay?: number;
}

/**
 * WebSocket Manager for real-time video streaming with AI detections
 * 
 * Handles WebSocket connections to Python backend, automatic reconnection,
 * and performance metrics tracking.
 */
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketManagerConfig>;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private shouldReconnect = true;
  
  // Metrics tracking
  private frameCount = 0;
  private lastFrameTime = 0;
  private frameRateInterval: NodeJS.Timeout | null = null;
  private currentFrameRate = 0;
  private latencySum = 0;
  private latencyCount = 0;
  private currentLatency = 0;
  private statusMessage = '';
  private nextReconnectDelay = 0;

  /**
   * Create a new WebSocketManager instance
   * 
   * @param config - Configuration options for the WebSocket connection
   */
  constructor(config: WebSocketManagerConfig) {
    this.config = {
      url: config.url,
      onFrame: config.onFrame || (() => {}),
      onStatusChange: config.onStatusChange || (() => {}),
      onError: config.onError || (() => {}),
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      initialReconnectDelay: config.initialReconnectDelay || 1000,
    };
  }

  /**
   * Connect to the WebSocket server
   * 
   * Establishes a WebSocket connection and sets up event handlers for
   * messages, errors, and connection state changes. Automatically starts
   * metrics tracking upon successful connection.
   * 
   * @returns Promise that resolves when connected, rejects on error
   * @throws Error if WebSocket creation fails
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Close existing connection if any
      if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
        this.ws.close();
      }

      try {
        this.ws = new WebSocket(this.config.url);
        this.shouldReconnect = true;

        this.ws.onopen = () => {
          console.log(`[WebSocketManager] Connected to ${this.config.url}`);
          this.reconnectAttempts = 0;
          this.statusMessage = 'Connected';
          this.nextReconnectDelay = 0;
          this.updateStatus('connected');
          this.startMetricsTracking();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocketManager] Error:', error);
          this.config.onError('WebSocket connection error');
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[WebSocketManager] Connection closed');
          this.stopMetricsTracking();
          this.statusMessage = 'Disconnected';
          this.updateStatus('disconnected');
          
          if (this.shouldReconnect) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        console.error('[WebSocketManager] Failed to create WebSocket:', error);
        this.config.onError('Failed to create WebSocket connection');
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   * 
   * Closes the WebSocket connection, stops metrics tracking, and cancels
   * any pending reconnection attempts. Sets shouldReconnect to false to
   * prevent automatic reconnection.
   */
  public disconnect(): void {
    this.shouldReconnect = false;
    this.stopMetricsTracking();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.updateStatus('disconnected');
  }

  /**
   * Get current connection metrics
   * 
   * Returns real-time metrics including connection status, frame rate,
   * latency, and reconnection information.
   * 
   * @returns Current connection metrics
   */
  public getMetrics(): ConnectionMetrics {
    return {
      status: this.ws?.readyState === WebSocket.OPEN ? 'connected' : 
              this.reconnectAttempts > 0 ? 'reconnecting' : 'disconnected',
      frameRate: this.currentFrameRate,
      latency: this.currentLatency,
      reconnectAttempts: this.reconnectAttempts,
      lastFrameTime: this.lastFrameTime,
      statusMessage: this.statusMessage,
      nextReconnectDelay: this.nextReconnectDelay,
    };
  }

  /**
   * Check if currently connected to WebSocket server
   * 
   * @returns true if WebSocket is open and connected
   */
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Handle incoming WebSocket messages
   * 
   * Parses JSON messages, calculates latency, processes video frames with
   * detections, and updates frame count for metrics tracking.
   * 
   * @param event - WebSocket message event
   * @private
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      const receiveTime = Date.now();

      // Calculate latency if timestamp is provided
      if (data.timestamp) {
        const latency = receiveTime - data.timestamp;
        this.latencySum += latency;
        this.latencyCount++;
        this.currentLatency = Math.round(this.latencySum / this.latencyCount);
      }

      // Process video frame with detections
      if (data.frame && data.detections) {
        const videoFrame: VideoFrame = {
          frame: data.frame,
          detections: this.parseDetections(data.detections),
          timestamp: data.timestamp || receiveTime,
          frameNumber: data.frameNumber || 0,
        };

        this.frameCount++;
        this.lastFrameTime = receiveTime;
        this.config.onFrame(videoFrame);
      }
    } catch (error) {
      console.error('[WebSocketManager] Failed to parse message:', error);
      this.config.onError('Failed to parse incoming message');
    }
  }

  /**
   * Parse detection data from various formats
   * 
   * Normalizes detection data from Python backend into a consistent format.
   * Handles both license plate and parking slot detections.
   * 
   * @param detections - Raw detection array from backend
   * @returns Normalized detection array
   * @private
   */
  private parseDetections(detections: any[]): Detection[] {
    return detections.map((det) => ({
      type: det.type || (det.plate_number ? 'plate' : 'slot'),
      bbox: det.bbox || { x1: 0, y1: 0, x2: 0, y2: 0 },
      label: det.label || det.plate_number || det.slot_id?.toString(),
      confidence: det.confidence || 0,
      slotId: det.slot_id || det.slotId,
      status: det.status,
    }));
  }

  /**
   * Attempt to reconnect with exponential backoff
   * 
   * Implements exponential backoff strategy: delay = initialDelay * 2^(attempts - 1)
   * Stops after maxReconnectAttempts is reached. Updates status to 'reconnecting'
   * and provides user-friendly status messages.
   * 
   * @private
   */
  private attemptReconnect(): void {
    if (!this.shouldReconnect || this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
        console.log('[WebSocketManager] Max reconnection attempts reached');
        this.statusMessage = 'Unable to reconnect. Maximum attempts reached.';
        this.config.onError(this.statusMessage);
      }
      return;
    }

    this.reconnectAttempts++;
    this.updateStatus('reconnecting');

    // Exponential backoff: delay = initialDelay * 2^(attempts - 1)
    const delay = this.config.initialReconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    this.nextReconnectDelay = delay;
    
    this.statusMessage = `Reconnecting in ${Math.round(delay / 1000)}s... (Attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`;
    
    console.log(
      `[WebSocketManager] Reconnecting in ${delay}ms... ` +
      `Attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`
    );

    this.reconnectTimeout = setTimeout(() => {
      if (this.shouldReconnect) {
        this.statusMessage = `Attempting to reconnect... (Attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`;
        this.connect().catch((error) => {
          console.error('[WebSocketManager] Reconnection failed:', error);
          this.statusMessage = 'Reconnection failed. Retrying...';
        });
      }
    }, delay);
  }

  /**
   * Update connection status and notify listeners
   * 
   * @param status - New connection status
   * @private
   */
  private updateStatus(status: ConnectionStatus): void {
    this.config.onStatusChange(status);
  }

  /**
   * Start tracking frame rate metrics
   * 
   * Initializes frame counting and starts an interval that calculates
   * frame rate every second. Also manages latency averaging.
   * 
   * @private
   */
  private startMetricsTracking(): void {
    this.frameCount = 0;
    this.lastFrameTime = Date.now();
    this.latencySum = 0;
    this.latencyCount = 0;

    // Calculate frame rate every second
    this.frameRateInterval = setInterval(() => {
      this.currentFrameRate = this.frameCount;
      this.frameCount = 0;

      // Reset latency average periodically to adapt to changing conditions
      if (this.latencyCount > 100) {
        this.latencySum = this.currentLatency;
        this.latencyCount = 1;
      }
    }, 1000);
  }

  /**
   * Stop tracking metrics
   * 
   * Clears the frame rate interval and resets counters.
   * 
   * @private
   */
  private stopMetricsTracking(): void {
    if (this.frameRateInterval) {
      clearInterval(this.frameRateInterval);
      this.frameRateInterval = null;
    }
    this.currentFrameRate = 0;
    this.frameCount = 0;
  }
}
