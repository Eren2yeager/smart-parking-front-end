/**
 * WebRTC Client for Mobile Camera Streaming
 * 
 * Enables mobile devices to stream camera video to the Python backend using WebRTC.
 * Handles camera permissions, peer connection establishment, signaling, and detection
 * result processing.
 * 
 * @module webrtc-client
 * 
 * @example
 * ```typescript
 * const client = new WebRTCClient({
 *   signalingUrl: 'ws://localhost:8000/ws/signaling',
 *   roomId: 'mobile-stream-1',
 *   onDetection: (detections) => {
 *     // Display detections on camera preview
 *     renderDetections(detections);
 *   },
 *   onConnectionStateChange: (state) => {
 *     console.log('Connection state:', state);
 *   },
 * });
 * 
 * const result = await client.requestCameraAccess();
 * if (result.success) {
 *   await client.connect();
 *   await client.startStreaming();
 * }
 * ```
 */

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
 * Configuration options for WebRTCClient
 */
export interface WebRTCClientConfig {
  /** WebSocket URL for signaling server */
  signalingUrl: string;
  /** Unique room identifier for this streaming session */
  roomId: string;
  /** Callback when detections are received from backend */
  onDetection?: (detection: Detection[]) => void;
  /** Callback when peer connection state changes */
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  /** Callback when errors occur */
  onError?: (error: Error) => void;
}

/**
 * Result of camera permission request
 */
export interface CameraPermissionResult {
  success: boolean;
  stream?: MediaStream;
  error?: string;
}

/**
 * WebRTC Client for streaming mobile camera to Python backend
 * 
 * Manages WebRTC peer connections, camera access, and signaling for
 * real-time video streaming from mobile devices.
 */
export class WebRTCClient {
  private peerConnection: RTCPeerConnection | null = null;
  private signalingSocket: WebSocket | null = null;
  private localStream: MediaStream | null = null;
  private config: WebRTCClientConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private shouldReconnect = true;

  /**
   * Create a new WebRTCClient instance
   * 
   * @param config - Configuration options for WebRTC connection
   */
  constructor(config: WebRTCClientConfig) {
    this.config = config;
  }

  /**
   * Request camera access using getUserMedia API
   * 
   * Requests access to the device camera with optimal settings for streaming.
   * Prefers the back camera on mobile devices. Provides user-friendly error
   * messages for common permission issues.
   * 
   * Requirements: 2.1, 2.2
   * 
   * @returns Promise resolving to permission result with stream or error
   * 
   * @example
   * ```typescript
   * const result = await client.requestCameraAccess();
   * if (result.success) {
   *   videoElement.srcObject = result.stream;
   * } else {
   *   console.error(result.error);
   * }
   * ```
   */
  async requestCameraAccess(): Promise<CameraPermissionResult> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment', // Use back camera on mobile
        },
        audio: false,
      });

      this.localStream = stream;
      return { success: true, stream };
    } catch (error: any) {
      let errorMessage = 'Unable to access camera. Please try again.';

      if (error.name === 'NotAllowedError') {
        errorMessage =
          'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (error.name === 'NotReadableError') {
        errorMessage =
          'Camera is already in use by another application. Please close other apps and try again.';
      }

      this.config.onError?.(new Error(errorMessage));
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Connect to signaling server and establish WebRTC connection
   * 
   * Establishes WebSocket connection to signaling server for coordinating
   * WebRTC peer connection setup. Handles signaling messages for offer/answer
   * exchange and ICE candidate negotiation.
   * 
   * Requirements: 2.3, 2.4
   * 
   * @returns Promise that resolves when connected to signaling server
   * @throws Error if signaling connection fails
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Connect to signaling server
        this.signalingSocket = new WebSocket(this.config.signalingUrl);
        this.shouldReconnect = true;

        this.signalingSocket.onopen = () => {
          console.log('[WebRTC] Connected to signaling server');

          // Join room
          this.signalingSocket?.send(
            JSON.stringify({
              type: 'join-room',
              roomId: this.config.roomId,
            })
          );

          resolve();
        };

        this.signalingSocket.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            await this.handleSignalingMessage(data);
          } catch (error) {
            console.error('[WebRTC] Failed to parse signaling message:', error);
          }
        };

        this.signalingSocket.onerror = (error) => {
          console.error('[WebRTC] Signaling error:', error);
          this.config.onError?.(new Error('Signaling connection failed'));
          reject(error);
        };

        this.signalingSocket.onclose = () => {
          console.log('[WebRTC] Signaling connection closed');
          if (this.shouldReconnect) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Create peer connection and send offer
   * 
   * Creates RTCPeerConnection with STUN servers, adds local stream tracks,
   * sets up event handlers for ICE candidates and connection state changes,
   * and sends the initial offer to the signaling server.
   * 
   * Requirements: 2.3, 2.4
   * 
   * @private
   * @throws Error if no local stream is available
   */
  private async createPeerConnection(): Promise<void> {
    if (!this.localStream) {
      throw new Error('No local stream available');
    }

    // Create peer connection with STUN servers
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    this.peerConnection = new RTCPeerConnection(config);

    // Add local stream tracks to peer connection
    this.localStream.getTracks().forEach((track) => {
      this.peerConnection!.addTrack(track, this.localStream!);
    });

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.signalingSocket?.readyState === WebSocket.OPEN) {
        this.signalingSocket.send(
          JSON.stringify({
            type: 'ice-candidate',
            candidate: event.candidate,
            roomId: this.config.roomId,
          })
        );
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('[WebRTC] Connection state:', state);
      this.config.onConnectionStateChange?.(state!);

      if (state === 'failed' || state === 'disconnected') {
        this.config.onError?.(new Error('WebRTC connection failed'));
      }
    };

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE state:', this.peerConnection?.iceConnectionState);
    };

    // Create and send offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.signalingSocket?.send(
      JSON.stringify({
        type: 'offer',
        offer: offer,
        roomId: this.config.roomId,
      })
    );
  }

  /**
   * Handle signaling messages from server
   * 
   * Processes various signaling message types including connection confirmation,
   * user join/leave events, SDP offer/answer exchange, ICE candidates, and
   * detection results from the Python backend.
   * 
   * @param data - Parsed signaling message data
   * @private
   */
  private async handleSignalingMessage(data: any): Promise<void> {
    switch (data.type) {
      case 'connected':
        console.log('[WebRTC] Signaling ready, client ID:', data.clientId);
        break;

      case 'user-joined':
        console.log('[WebRTC] User joined:', data.userId);
        // Create peer connection when another user joins
        if (this.localStream && !this.peerConnection) {
          await this.createPeerConnection();
        }
        break;

      case 'answer':
        if (this.peerConnection && data.answer) {
          await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
          console.log('[WebRTC] Received answer');
        }
        break;

      case 'ice-candidate':
        if (this.peerConnection && data.candidate) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
          console.log('[WebRTC] Added ICE candidate');
        }
        break;

      case 'detection':
        // Handle detection results from Python backend
        if (data.detections && this.config.onDetection) {
          this.config.onDetection(data.detections);
        }
        break;

      case 'user-left':
        console.log('[WebRTC] User left:', data.userId);
        break;

      default:
        console.log('[WebRTC] Unknown message type:', data.type);
    }
  }

  /**
   * Start streaming video frames
   * 
   * Begins streaming video from the local camera to the Python backend.
   * Creates peer connection if not already established.
   * 
   * Requirements: 2.4
   * 
   * @throws Error if camera stream is not available or not connected to signaling server
   * 
   * @example
   * ```typescript
   * await client.requestCameraAccess();
   * await client.connect();
   * await client.startStreaming();
   * ```
   */
  async startStreaming(): Promise<void> {
    if (!this.localStream) {
      throw new Error('No camera stream available. Call requestCameraAccess() first.');
    }

    if (!this.signalingSocket || this.signalingSocket.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to signaling server. Call connect() first.');
    }

    // Create peer connection if not already created
    if (!this.peerConnection) {
      await this.createPeerConnection();
    }
  }

  /**
   * Stop streaming and cleanup resources
   * 
   * Stops all camera tracks, closes peer connection and signaling socket,
   * and cleans up all resources. Prevents automatic reconnection.
   * 
   * Requirements: 2.7
   * 
   * @example
   * ```typescript
   * client.stopStreaming();
   * ```
   */
  stopStreaming(): void {
    this.shouldReconnect = false;

    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Close signaling socket
    if (this.signalingSocket) {
      this.signalingSocket.close();
      this.signalingSocket = null;
    }

    console.log('[WebRTC] Streaming stopped and resources cleaned up');
  }

  /**
   * Attempt to reconnect to signaling server
   * 
   * Implements simple retry logic with linear backoff. Stops after
   * maxReconnectAttempts is reached.
   * 
   * @private
   */
  private attemptReconnect(): void {
    if (!this.shouldReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('[WebRTC] Max reconnection attempts reached');
        this.config.onError?.(new Error('Unable to reconnect to signaling server'));
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = 2000 * this.reconnectAttempts;
    console.log(
      `[WebRTC] Reconnecting in ${delay}ms... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
    );

    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect().catch((error) => {
          console.error('[WebRTC] Reconnection failed:', error);
        });
      }
    }, delay);
  }

  /**
   * Check if currently connected
   * 
   * @returns true if both signaling socket and peer connection are established
   */
  isConnected(): boolean {
    return (
      this.signalingSocket?.readyState === WebSocket.OPEN &&
      this.peerConnection?.connectionState === 'connected'
    );
  }

  /**
   * Get current connection state
   * 
   * @returns Current RTCPeerConnectionState or 'disconnected' if no connection
   */
  getConnectionState(): RTCPeerConnectionState | 'disconnected' {
    return this.peerConnection?.connectionState || 'disconnected';
  }

  /**
   * Get local stream
   * 
   * @returns MediaStream from camera or null if not available
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }
}
