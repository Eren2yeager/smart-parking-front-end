'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { WebRTCClient, Detection } from '@/lib/webrtc-client';
import CameraPreview from '@/components/CameraPreview';

function CameraPageContent() {
  const searchParams = useSearchParams();
  const parkingLotId = searchParams.get('lotId');
  const cameraType = searchParams.get('type') as 'gate' | 'lot' | null;
  
  const [backendUrl, setBackendUrl] = useState(process.env.NEXT_PUBLIC_PYTHON_BACKEND_WS_URL || 'ws://localhost:8000');
  const [roomId, setRoomId] = useState(() => {
    // Generate room ID based on parking lot and camera type if provided
    if (parkingLotId && cameraType) {
      return `${parkingLotId}-${cameraType}`;
    }
    return 'parking-camera-1';
  });
  const [parkingLotName, setParkingLotName] = useState<string>('');
  const [streaming, setStreaming] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('disconnected');
  const [logs, setLogs] = useState<string[]>([]);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [frameRate, setFrameRate] = useState<number>(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [streamType, setStreamType] = useState<'camera' | 'screen'>('camera');
  
  // WebRTC Remote Stream state
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [remoteFps, setRemoteFps] = useState(10);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteCanvasRef = useRef<HTMLCanvasElement>(null);
  const remoteOverlayRef = useRef<HTMLCanvasElement>(null);
  const remoteIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingWsRef = useRef<WebSocket | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const webrtcClientRef = useRef<WebRTCClient | null>(null);
  const frameCountRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(Date.now());

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
    setLogs(prev => [...prev.slice(-20), `[${timestamp}] ${message}`]);
  };

  // Fetch parking lot details if ID is provided
  useEffect(() => {
    if (parkingLotId) {
      const fetchParkingLot = async () => {
        try {
          const response = await fetch(`/api/parking-lots/${parkingLotId}`);
          if (response.ok) {
            const result = await response.json();
            setParkingLotName(result.data.name);
            addLog(`📍 Connected to: ${result.data.name}`);
          }
        } catch (error) {
          console.error('Failed to fetch parking lot:', error);
        }
      };
      fetchParkingLot();
    }
  }, [parkingLotId]);

  // Calculate frame rate
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastFrameTimeRef.current) / 1000;
      if (elapsed > 0) {
        const fps = frameCountRef.current / elapsed;
        setFrameRate(Math.round(fps));
        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const connectToSignaling = async () => {
    try {
      setPermissionError(null);
      const wsUrl = `${backendUrl}/ws/webrtc-signaling`;
      addLog(`🔗 Connecting to ${wsUrl}...`);
      
      // Create WebRTC client
      webrtcClientRef.current = new WebRTCClient({
        signalingUrl: wsUrl,
        roomId: roomId,
        onDetection: (detections) => {
          setDetections(detections);
          frameCountRef.current++;
          addLog(`📊 Received ${detections.length} detections`);
        },
        onConnectionStateChange: (state) => {
          setConnectionState(state);
          addLog(`🔗 Connection state: ${state}`);
        },
        onError: (error) => {
          addLog(`❌ Error: ${error.message}`);
          setPermissionError(error.message);
        },
      });

      await webrtcClientRef.current.connect();
      setConnected(true);
      addLog(`✓ Connected to signaling server`);
    } catch (error: any) {
      addLog(`❌ Connection failed: ${error.message}`);
      setPermissionError(error.message);
    }
  };

  const startStreaming = async () => {
    if (!webrtcClientRef.current) {
      addLog(`❌ Not connected to signaling server`);
      return;
    }

    try {
      setPermissionError(null);
      
      let result;
      if (streamType === 'camera') {
        addLog(`📹 Requesting camera access...`);
        result = await webrtcClientRef.current.requestCameraAccess();
      } else {
        addLog(`🖥️ Requesting screen share access...`);
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: 1920, height: 1080 },
            audio: false
          });
          result = { success: true, stream: screenStream };
          
          // Manually set the localStream in the WebRTC client
          (webrtcClientRef.current as any).localStream = screenStream;
        } catch (err: any) {
          result = { success: false, error: err.message || 'Screen share denied' };
        }
      }
      
      if (!result.success) {
        setPermissionError(result.error || `Failed to access ${streamType}`);
        addLog(`❌ ${streamType === 'camera' ? 'Camera' : 'Screen share'} error: ${result.error}`);
        return;
      }

      setStream(result.stream!);
      addLog(`✓ ${streamType === 'camera' ? 'Camera' : 'Screen share'} access granted`);
      
      const videoTrack = result.stream!.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      addLog(`📹 Resolution: ${settings.width}x${settings.height}`);
      
      // Start streaming (this will create peer connection and send offer)
      await webrtcClientRef.current.startStreaming();
      
      setStreaming(true);
      addLog(`✓ Streaming started`);
    } catch (error: any) {
      addLog(`❌ Streaming error: ${error.message}`);
      setPermissionError(error.message);
    }
  };

  const stopStreaming = () => {
    if (webrtcClientRef.current) {
      webrtcClientRef.current.stopStreaming();
    }
    
    setStream(null);
    setStreaming(false);
    setDetections([]);
    setFrameRate(0);
    frameCountRef.current = 0;
    addLog(`✗ Streaming stopped`);
  };

  const disconnect = () => {
    stopStreaming();
    
    if (webrtcClientRef.current) {
      webrtcClientRef.current.stopStreaming();
      webrtcClientRef.current = null;
    }
    
    setConnected(false);
    setConnectionState('disconnected');
    addLog(`✗ Disconnected from signaling server`);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (webrtcClientRef.current) {
        webrtcClientRef.current.stopStreaming();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-2xl p-6 mb-6 border border-purple-500">
          <div className="flex items-center gap-4">
            <div className="text-5xl">📹</div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-1">Camera Sender</h1>
              <p className="text-purple-100">Stream your camera to the backend for AI processing</p>
              {parkingLotName && cameraType && (
                <div className="mt-2 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <span className="text-2xl">{cameraType === 'gate' ? '🚪' : '🅿️'}</span>
                  <div>
                    <p className="text-sm text-purple-200">
                      {cameraType === 'gate' ? 'Gate Camera' : 'Lot Camera'}
                    </p>
                    <p className="text-white font-semibold">{parkingLotName}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Configuration & Status */}
          <div className="lg:col-span-1 space-y-6">
            {/* Configuration Card */}
            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-purple-500/30">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">⚙️</span>
                Configuration
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-purple-300">
                    Backend WebSocket URL
                  </label>
                  <input
                    type="text"
                    value={backendUrl}
                    onChange={(e) => setBackendUrl(e.target.value)}
                    disabled={connected}
                    className="w-full px-4 py-2 bg-gray-900 border border-purple-500/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                    placeholder="ws://localhost:8000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-purple-300">
                    Room ID
                  </label>
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    disabled={connected}
                    className="w-full px-4 py-2 bg-gray-900 border border-purple-500/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                    placeholder="parking-camera-1"
                  />
                  <p className="text-xs text-purple-400 mt-1">
                    Use the same Room ID on the receiver page
                  </p>
                </div>
              </div>
            </div>

            {/* Status Card */}
            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-purple-500/30">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">📊</span>
                Status
              </h2>
              
              <div className="space-y-3">
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                  connected ? 'bg-green-500/20 border border-green-500/50' : 'bg-gray-700/50 border border-gray-600'
                }`}>
                  <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                  <span className={`text-sm font-medium ${connected ? 'text-green-400' : 'text-gray-400'}`}>
                    {connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                  streaming ? 'bg-red-500/20 border border-red-500/50' : 'bg-gray-700/50 border border-gray-600'
                }`}>
                  <div className={`w-3 h-3 rounded-full ${streaming ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                  <span className={`text-sm font-medium ${streaming ? 'text-red-400' : 'text-gray-400'}`}>
                    {streaming ? 'Streaming' : 'Not Streaming'}
                  </span>
                </div>

                {streaming && (
                  <>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-500/20 border border-blue-500/50">
                      <span className="text-sm font-medium text-blue-400">
                        Frame Rate: {frameRate} FPS
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-purple-500/20 border border-purple-500/50">
                      <span className="text-sm font-medium text-purple-400">
                        Connection: {connectionState}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Permission Error Display */}
            {permissionError && (
              <div className="bg-red-900/50 border border-red-500/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h3 className="font-semibold text-red-300 mb-1">Permission Error</h3>
                    <p className="text-sm text-red-200">{permissionError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Tips */}
            <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl shadow-2xl p-6 border border-purple-500/30">
              <h3 className="font-semibold mb-3 text-purple-300 flex items-center gap-2">
                <span className="text-xl">💡</span>
                Quick Tips
              </h3>
              <ul className="text-sm space-y-2 text-purple-200">
                <li>• Use back camera for better quality</li>
                <li>• Keep phone charged while streaming</li>
                <li>• Ensure stable WiFi connection</li>
                <li>• Mount phone for steady view</li>
              </ul>
            </div>
          </div>

          {/* Right Column - Video & Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Controls Card */}
            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-purple-500/30">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">🎮</span>
                Controls
              </h2>
              
              {/* Stream Type Selector */}
              {connected && !streaming && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-purple-300">
                    Stream Source
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStreamType('camera')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                        streamType === 'camera'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      📹 Camera
                    </button>
                    <button
                      onClick={() => setStreamType('screen')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                        streamType === 'screen'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      🖥️ Screen
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                {!connected ? (
                  <button
                    onClick={connectToSignaling}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
                  >
                    🔗 Connect to Backend
                  </button>
                ) : (
                  <>
                    {!streaming ? (
                      <button
                        onClick={startStreaming}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
                      >
                        ▶️ Start {streamType === 'camera' ? 'Camera' : 'Screen Share'}
                      </button>
                    ) : (
                      <button
                        onClick={stopStreaming}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
                      >
                        ⏹️ Stop Streaming
                      </button>
                    )}
                    <button
                      onClick={disconnect}
                      className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
                    >
                      ✗ Disconnect
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Video Preview */}
            <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-purple-500/30">
              <div className="relative bg-black aspect-video">
                <CameraPreview stream={stream} detections={detections} />
                {streaming && (
                  <div className="absolute top-4 left-4 bg-gradient-to-r from-red-600 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-pulse">
                    🔴 LIVE
                  </div>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border border-blue-500/30 rounded-xl p-6">
              <h3 className="font-semibold mb-3 text-blue-300 flex items-center gap-2">
                <span className="text-xl">📋</span>
                How to Use
              </h3>
              <ol className="text-sm space-y-2 list-decimal list-inside text-blue-200">
                <li>Make sure Python backend is running on port 8000</li>
                <li>Enter the backend URL (ws://your-ip:8000)</li>
                <li>Set a Room ID (same as receiver)</li>
                <li>Click "Connect to Backend"</li>
                <li>Click "Start Streaming"</li>
                <li>Open test-backend page on another device</li>
                <li>You'll see your stream with AI detections!</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Activity Logs */}
        <div className="mt-6 bg-gray-800 rounded-xl shadow-2xl p-6 border border-purple-500/30">
          <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
            <span className="text-2xl">📝</span>
            Activity Logs
          </h2>
          <div className="bg-black border border-green-500/30 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto shadow-inner">
            {logs.length === 0 ? (
              <div className="text-gray-500">Waiting for activity...</div>
            ) : (
              logs.map((log, idx) => <div key={idx} className="hover:bg-green-500/10 px-2 py-1 rounded">{log}</div>)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CameraPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <CameraPageContent />
    </Suspense>
  );
}
