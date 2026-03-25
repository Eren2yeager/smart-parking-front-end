'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { WebRTCClient, Detection } from '@/lib/realtime/webrtc-client';
import CameraPreview from '@/components/camera/CameraPreview';
import { Button } from '@/components/shadcnComponents/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shadcnComponents/card';
import { Input } from '@/components/shadcnComponents/input';
import { Badge } from '@/components/shadcnComponents/badge';
import { 
  Video, 
  Monitor, 
  Wifi, 
  WifiOff, 
  Play, 
  Square, 
  Settings, 
  Activity, 
  AlertCircle,
  CheckCircle,
  Loader2,
  MapPin,
  Camera as CameraIcon,
  ParkingSquare
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/shadcnComponents/alert';

function CameraPageContent() {
  const searchParams = useSearchParams();
  const parkingLotId = searchParams.get('lotId');
  const cameraType = searchParams.get('type') as 'gate' | 'lot' | null;
  
  const [backendUrl, setBackendUrl] = useState(
    process.env.NEXT_PUBLIC_AI_BACKEND_WS_URL || 'ws://localhost:8000'
  );
  const [roomId, setRoomId] = useState(() => {
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
  const [isConnecting, setIsConnecting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  
  const webrtcClientRef = useRef<WebRTCClient | null>(null);
  const frameCountRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(Date.now());

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
    setLogs(prev => [...prev.slice(-20), `[${timestamp}] ${message}`]);
  };

  // Fetch parking lot details
  useEffect(() => {
    if (parkingLotId) {
      const fetchParkingLot = async () => {
        try {
          const response = await fetch(`/api/parking-lots/${parkingLotId}`);
          if (response.ok) {
            const result = await response.json();
            setParkingLotName(result.data.name);
            addLog(`Connected to: ${result.data.name}`);
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
      setIsConnecting(true);
      setPermissionError(null);
      const wsUrl = `${backendUrl}/ws/webrtc-signaling`;
      addLog(`Connecting to ${wsUrl}...`);
      
      webrtcClientRef.current = new WebRTCClient({
        signalingUrl: wsUrl,
        roomId: roomId,
        onDetection: (detections) => {
          setDetections(detections);
          frameCountRef.current++;
        },
        onConnectionStateChange: (state) => {
          setConnectionState(state);
          addLog(`Connection state: ${state}`);
        },
        onError: (error) => {
          addLog(`Error: ${error.message}`);
          setPermissionError(error.message);
        },
      });

      await webrtcClientRef.current.connect();
      setConnected(true);
      addLog(`Connected to signaling server`);
    } catch (error: any) {
      addLog(`Connection failed: ${error.message}`);
      setPermissionError(error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const startStreaming = async () => {
    if (!webrtcClientRef.current) {
      addLog(`Not connected to signaling server`);
      return;
    }

    try {
      setIsStarting(true);
      setPermissionError(null);
      
      let result;
      if (streamType === 'camera') {
        addLog(`Requesting camera access...`);
        result = await webrtcClientRef.current.requestCameraAccess();
      } else {
        addLog(`Requesting screen share access...`);
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: 1920, height: 1080 },
            audio: false
          });
          result = { success: true, stream: screenStream };
          (webrtcClientRef.current as any).localStream = screenStream;
        } catch (err: any) {
          result = { success: false, error: err.message || 'Screen share denied' };
        }
      }
      
      if (!result.success) {
        setPermissionError(result.error || `Failed to access ${streamType}`);
        addLog(`${streamType === 'camera' ? 'Camera' : 'Screen share'} error: ${result.error}`);
        return;
      }

      setStream(result.stream!);
      addLog(`${streamType === 'camera' ? 'Camera' : 'Screen share'} access granted`);
      
      const videoTrack = result.stream!.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      addLog(`Resolution: ${settings.width}x${settings.height}`);
      
      await webrtcClientRef.current.startStreaming();
      
      setStreaming(true);
      addLog(`Streaming started`);
    } catch (error: any) {
      addLog(`Streaming error: ${error.message}`);
      setPermissionError(error.message);
    } finally {
      setIsStarting(false);
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
    addLog(`Streaming stopped`);
  };

  const disconnect = () => {
    stopStreaming();
    
    if (webrtcClientRef.current) {
      webrtcClientRef.current.stopStreaming();
      webrtcClientRef.current = null;
    }
    
    setConnected(false);
    setConnectionState('disconnected');
    addLog(`Disconnected from signaling server`);
  };

  useEffect(() => {
    return () => {
      if (webrtcClientRef.current) {
        webrtcClientRef.current.stopStreaming();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0b0d] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-blue-200 dark:border-blue-900">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-950 rounded-lg">
                  <Video className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Camera Stream</CardTitle>
                  <CardDescription>
                    Stream your camera to the backend for AI processing
                  </CardDescription>
                </div>
              </div>
              {parkingLotName && cameraType && (
                <Badge variant="secondary" className="flex items-center gap-2">
                  {cameraType === 'gate' ? <MapPin className="w-4 h-4" /> : <ParkingSquare className="w-4 h-4" />}
                  {parkingLotName} - {cameraType === 'gate' ? 'Gate' : 'Lot'}
                </Badge>
              )}
            </div>
          </CardHeader>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Configuration & Status */}
          <div className="space-y-6">
            {/* Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Backend WebSocket URL
                  </label>
                  <Input
                    type="text"
                    value={backendUrl}
                    onChange={(e) => setBackendUrl(e.target.value)}
                    disabled={connected}
                    placeholder="ws://localhost:8000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Room ID
                  </label>
                  <Input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    disabled={connected}
                    placeholder="parking-camera-1"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Use the same Room ID on the receiver page
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-[#111316] border border-gray-200 dark:border-[#2a2e37]">
                  <div className="flex items-center gap-2">
                    {connected ? (
                      <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm font-medium">Connection</span>
                  </div>
                  <Badge variant={connected ? "default" : "secondary"}>
                    {connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-[#111316] border border-gray-200 dark:border-[#2a2e37]">
                  <div className="flex items-center gap-2">
                    <CameraIcon className={`w-4 h-4 ${streaming ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium">Streaming</span>
                  </div>
                  <Badge variant={streaming ? "destructive" : "secondary"}>
                    {streaming ? 'Live' : 'Stopped'}
                  </Badge>
                </div>

                {streaming && (
                  <>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-[#111316] border border-gray-200 dark:border-[#2a2e37]">
                      <span className="text-sm font-medium">Frame Rate</span>
                      <Badge variant="outline">{frameRate} FPS</Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-[#111316] border border-gray-200 dark:border-[#2a2e37]">
                      <span className="text-sm font-medium">State</span>
                      <Badge variant="outline">{connectionState}</Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-[#111316] border border-gray-200 dark:border-[#2a2e37]">
                      <span className="text-sm font-medium">Detections</span>
                      <Badge variant="outline">{detections.length}</Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Error Alert */}
            {permissionError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{permissionError}</AlertDescription>
              </Alert>
            )}

            {/* Tips */}
            <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-blue-900 dark:text-blue-300">
                  <CheckCircle className="w-4 h-4" />
                  Quick Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-blue-800 dark:text-blue-400">
                  <li>• Use back camera for better quality</li>
                  <li>• Keep device charged while streaming</li>
                  <li>• Ensure stable WiFi connection</li>
                  <li>• Mount device for steady view</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Video & Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stream Type Selector */}
                {connected && !streaming && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Stream Source
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant={streamType === 'camera' ? 'default' : 'outline'}
                        onClick={() => setStreamType('camera')}
                        className="w-full"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Camera
                      </Button>
                      <Button
                        variant={streamType === 'screen' ? 'default' : 'outline'}
                        onClick={() => setStreamType('screen')}
                        className="w-full"
                      >
                        <Monitor className="w-4 h-4 mr-2" />
                        Screen
                      </Button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {!connected ? (
                    <Button
                      onClick={connectToSignaling}
                      disabled={isConnecting}
                      className="flex-1"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Wifi className="w-4 h-4 mr-2" />
                          Connect to Backend
                        </>
                      )}
                    </Button>
                  ) : (
                    <>
                      {!streaming ? (
                        <Button
                          onClick={startStreaming}
                          disabled={isStarting}
                          className="flex-1"
                          variant="default"
                        >
                          {isStarting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Starting...
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Start {streamType === 'camera' ? 'Camera' : 'Screen'}
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={stopStreaming}
                          className="flex-1"
                          variant="destructive"
                        >
                          <Square className="w-4 h-4 mr-2" />
                          Stop Streaming
                        </Button>
                      )}
                      <Button
                        onClick={disconnect}
                        variant="outline"
                      >
                        Disconnect
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Video Preview */}
            <Card>
              <CardContent className="p-0">
                <div className="relative bg-black aspect-video rounded-lg overflow-hidden">
                  <CameraPreview stream={stream} detections={detections} />
                  {streaming && (
                    <div className="absolute top-4 left-4">
                      <Badge variant="destructive" className="animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full mr-2" />
                        LIVE
                      </Badge>
                    </div>
                  )}

                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="text-sm text-purple-900 dark:text-purple-300">
                  How to Use
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="text-sm space-y-2 list-decimal list-inside text-purple-800 dark:text-purple-400">
                  <li>Ensure Python backend is running on port 8000</li>
                  <li>Enter the backend URL (ws://your-ip:8000)</li>
                  <li>Set a Room ID (same as receiver)</li>
                  <li>Click "Connect to Backend"</li>
                  <li>Select Camera or Screen share</li>
                  <li>Click "Start Streaming"</li>
                  <li>Open receiver page to view with AI detections</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Activity Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activity Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 dark:bg-black border border-gray-700 dark:border-[#2a2e37] text-green-400 p-4 rounded-lg font-mono text-xs max-h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">Waiting for activity...</div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="hover:bg-green-500/10 px-2 py-1 rounded">
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CameraPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    }>
      <CameraPageContent />
    </Suspense>
  );
}
