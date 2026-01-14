'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Maximize, Minimize, Camera } from 'lucide-react';
import { ParkingWebSocket } from '@/lib/websocket-client';

interface ParkingLot {
  _id: string;
  name: string;
  location: {
    address: string;
  };
  gateCamera: {
    id: string;
    status: 'active' | 'inactive';
  };
  lotCamera: {
    id: string;
    status: 'active' | 'inactive';
  };
}

type CameraType = 'gate' | 'lot';

export default function LiveMonitorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [parkingLot, setParkingLot] = useState<ParkingLot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Camera controls
  const [cameraType, setCameraType] = useState<CameraType>('gate');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // WebRTC Remote Stream state
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [signalingUrl] = useState(process.env.NEXT_PUBLIC_PYTHON_BACKEND_WS_URL || 'ws://localhost:8000');
  const [remoteFps] = useState(10);
  const [lastDetection, setLastDetection] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteCanvasRef = useRef<HTMLCanvasElement>(null);
  const remoteOverlayRef = useRef<HTMLCanvasElement>(null);
  const remoteIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingWsRef = useRef<WebSocket | null>(null);
  const wsRef = useRef<ParkingWebSocket | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
    setLogs(prev => [...prev.slice(-20), `[${timestamp}] ${message}`]);
  };

  // Fetch parking lot details
  useEffect(() => {
    const fetchParkingLot = async () => {
      try {
        setError(null);
        const response = await fetch(`/api/parking-lots/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Parking lot not found');
          }
          throw new Error('Failed to fetch parking lot details');
        }

        const result = await response.json();
        setParkingLot(result.data);
        
        // Set room ID based on parking lot and camera type
        setRoomId(`${result.data._id}-${cameraType}`);
      } catch (err: any) {
        console.error('Error fetching parking lot:', err);
        setError(err.message || 'Failed to load parking lot details');
      } finally {
        setLoading(false);
      }
    };

    fetchParkingLot();
  }, [id, cameraType]);

  // Update room ID when camera type changes
  useEffect(() => {
    if (parkingLot) {
      setRoomId(`${parkingLot._id}-${cameraType}`);
    }
  }, [cameraType, parkingLot]);

  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Drawing functions
  const drawPlates = (ctx: CanvasRenderingContext2D, plates: any[], scaleX: number = 1, scaleY: number = 1) => {
    plates.forEach((plate: any) => {
      const bbox = plate.bbox;
      const plateNumber = plate.plate_number || 'UNKNOWN';
      const confidence = plate.ocr_confidence || plate.confidence || 0;
      
      const x1 = bbox.x1 * scaleX;
      const y1 = bbox.y1 * scaleY;
      const x2 = bbox.x2 * scaleX;
      const y2 = bbox.y2 * scaleY;
      
      // Draw rectangle with glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#3B82F6';
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 4;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.shadowBlur = 0;
      
      // Draw label
      const label = `${plateNumber} (${(confidence * 100).toFixed(0)}%)`;
      ctx.font = 'bold 20px Arial';
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = '#3B82F6';
      ctx.fillRect(x1, y1 - 35, textWidth + 10, 35);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(label, x1 + 5, y1 - 10);
    });
  };

  const drawSlots = (ctx: CanvasRenderingContext2D, slots: any[], scaleX: number = 1, scaleY: number = 1) => {
    slots.forEach((slot: any) => {
      const bbox = slot.bbox;
      const status = slot.status || slot.class || 'unknown';
      const confidence = slot.confidence || 0;
      
      const x1 = bbox.x1 * scaleX;
      const y1 = bbox.y1 * scaleY;
      const x2 = bbox.x2 * scaleX;
      const y2 = bbox.y2 * scaleY;
      
      // Draw rectangle
      ctx.shadowBlur = 8;
      ctx.shadowColor = status === 'occupied' ? '#EF4444' : '#10B981';
      ctx.strokeStyle = status === 'occupied' ? '#EF4444' : '#10B981';
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.shadowBlur = 0;
      
      // Draw label
      const label = `${status.toUpperCase()} (${(confidence * 100).toFixed(0)}%)`;
      ctx.font = 'bold 16px Arial';
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = status === 'occupied' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)';
      ctx.fillRect(x1, y1 - 28, textWidth + 10, 28);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(label, x1 + 5, y1 - 8);
    });
  };

  // WebRTC Functions
  const connectToRemoteStream = async () => {
    try {
      addLog(`🔗 Connecting to signaling server...`);
      
      const wsUrl = `${signalingUrl}/ws/webrtc-signaling`;
      const ws = new WebSocket(wsUrl);
      signalingWsRef.current = ws;

      ws.onopen = () => {
        addLog(`✓ Connected to signaling server`);
        addLog(`📡 Joining room: ${roomId}`);
        ws.send(JSON.stringify({
          type: 'join-room',
          roomId: roomId
        }));
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'connected':
              addLog(`✓ Signaling ready`);
              break;
              
            case 'offer':
              addLog(`📥 Received offer from camera`);
              await handleOffer(data.offer);
              break;
              
            case 'ice-candidate':
              if (data.candidate && peerConnectionRef.current) {
                await peerConnectionRef.current.addIceCandidate(
                  new RTCIceCandidate(data.candidate)
                );
                addLog(`🧊 Added ICE candidate`);
              }
              break;
          }
        } catch (error) {
          addLog(`❌ Message error: ${error}`);
        }
      };

      ws.onerror = () => {
        addLog(`❌ WebSocket error`);
      };

      ws.onclose = () => {
        addLog(`✗ Disconnected from signaling server`);
        setRemoteConnected(false);
      };

    } catch (error) {
      addLog(`❌ Connection error: ${error}`);
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    try {
      addLog(`🔧 Creating peer connection...`);
      
      const config: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      };
      
      const pc = new RTCPeerConnection(config);
      peerConnectionRef.current = pc;

      pc.ontrack = (event) => {
        addLog(`📹 Received remote stream`);
        setRemoteConnected(true);
        
        setTimeout(() => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
            
            // Connect to Python backend and start processing
            setTimeout(async () => {
              const wsEndpoint = cameraType === 'gate' ? '/ws/gate-monitor' : '/ws/lot-monitor';
              
              try {
                const ws = new ParkingWebSocket(`${signalingUrl}${wsEndpoint}`);
                await ws.connect(
                  async (data) => {
                    setIsProcessing(false);
                    setLastDetection(data);
                    
                    if (data.type === 'plate_detection' && data.plates_detected > 0) {
                      addLog(`🚗 ${data.plates_detected} plate(s) detected`);
                      
                      // Record vehicle entries for gate camera
                      if (cameraType === 'gate' && data.plates && data.plates.length > 0) {
                        // Process each detected plate
                        for (const plate of data.plates) {
                          if (plate.plate_number && plate.plate_number !== 'UNKNOWN') {
                            try {
                              const response = await fetch('/api/records/entry', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  parkingLotId: id,
                                  plateNumber: plate.plate_number,
                                  gateId: parkingLot?.gateCamera.id || 'unknown',
                                  confidence: plate.ocr_confidence || plate.confidence || 0,
                                  // image: plate.image, // Optional: include if available
                                }),
                              });
                              
                              if (response.ok) {
                                const result = await response.json();
                                if (result.data.duplicate) {
                                  addLog(`⏭️ Duplicate: ${plate.plate_number} (${result.data.timeSinceLastDetection}s ago)`);
                                } else if (result.data.alreadyInside) {
                                  addLog(`ℹ️ Already inside: ${plate.plate_number}`);
                                } else {
                                  addLog(`✅ Entry recorded: ${plate.plate_number}`);
                                }
                              } else {
                                addLog(`❌ Failed to record entry: ${plate.plate_number}`);
                              }
                            } catch (error) {
                              console.error('Error recording entry:', error);
                              addLog(`❌ Entry error: ${plate.plate_number}`);
                            }
                          }
                        }
                      }
                    } else if (data.type === 'capacity_update') {
                      addLog(`🅿️ ${data.occupied}/${data.total_slots} slots`);
                      
                      // Update database with slot occupancy for lot camera
                      if (cameraType === 'lot' && data.slots && data.slots.length > 0) {
                        try {
                          const slotsToUpdate = data.slots.map((slot: any, index: number) => ({
                            slotId: index + 1, // Assign sequential slot IDs
                            status: slot.status || slot.class || 'empty',
                          }));
                          
                          const response = await fetch(`/api/parking-lots/${id}/slots`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              slots: slotsToUpdate,
                              detectedSlots: data.total_slots,
                            }),
                          });
                          
                          if (response.ok) {
                            const result = await response.json();
                            
                            // Log adjustment note if present
                            if (result.data.adjustmentNote) {
                              addLog(`ℹ️ ${result.data.adjustmentNote}`);
                            }
                            
                            addLog(`💾 Updated ${result.data.updatedSlots} slot(s) in DB`);
                            
                            // Check for alerts
                            if (result.data.alerts && result.data.alerts.length > 0) {
                              result.data.alerts.forEach((alertData: any) => {
                                if (alertData.type === 'overparking') {
                                  addLog(`🚨 CRITICAL: Overparking violation! ${alertData.alert.metadata.extraVehicles} extra vehicle(s)`);
                                } else if (alertData.type === 'capacity_full') {
                                  addLog(`⚠️ WARNING: Parking lot at full capacity!`);
                                }
                              });
                            }
                          } else {
                            addLog(`❌ Failed to update DB: ${response.statusText}`);
                          }
                        } catch (error) {
                          console.error('Error updating slots:', error);
                          addLog(`❌ DB update error: ${error}`);
                        }
                      }
                    }
                  },
                  (error) => {
                    addLog(`❌ Backend error: ${error}`);
                  }
                );
                wsRef.current = ws;
                addLog(`✓ Connected to AI backend`);

                // Start sending frames
                remoteIntervalRef.current = setInterval(() => {
                  captureAndSendRemoteFrame();
                }, 1000 / remoteFps);
                
                addLog(`🎯 Started frame capture at ${remoteFps} FPS`);
              } catch (error) {
                addLog(`❌ Failed to connect to backend: ${error}`);
              }
            }, 1500);
          }
        }, 100);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && signalingWsRef.current?.readyState === WebSocket.OPEN) {
          signalingWsRef.current.send(JSON.stringify({
            type: 'ice-candidate',
            candidate: event.candidate,
            roomId: roomId
          }));
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (signalingWsRef.current?.readyState === WebSocket.OPEN) {
        signalingWsRef.current.send(JSON.stringify({
          type: 'answer',
          answer: answer,
          roomId: roomId
        }));
        addLog(`📤 Sent answer to camera`);
      }

    } catch (error) {
      addLog(`❌ Error handling offer: ${error}`);
    }
  };

  const captureAndSendRemoteFrame = () => {
    if (!remoteVideoRef.current || !remoteCanvasRef.current || !wsRef.current?.isConnected()) {
      return;
    }

    const canvas = remoteCanvasRef.current;
    const video = remoteVideoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.paused || video.readyState < 2) {
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    setIsProcessing(true);

    canvas.toBlob((blob) => {
      if (!blob) return;
      
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        wsRef.current?.sendFrame(base64, {
          [cameraType === 'gate' ? 'gate_id' : 'lot_id']: parkingLot?._id || 'unknown'
        });
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.85);
  };

  const disconnectRemoteStream = () => {
    if (remoteIntervalRef.current) {
      clearInterval(remoteIntervalRef.current);
      remoteIntervalRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (signalingWsRef.current) {
      signalingWsRef.current.close();
      signalingWsRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
    }

    if (remoteVideoRef.current?.srcObject) {
      const tracks = (remoteVideoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      remoteVideoRef.current.srcObject = null;
    }

    setRemoteConnected(false);
    addLog('✗ Remote stream disconnected');
  };

  // Continuous overlay redraw
  useEffect(() => {
    let animationFrameId: number;
    
    const redrawOverlays = () => {
      if (remoteConnected && remoteOverlayRef.current && remoteVideoRef.current && lastDetection) {
        const overlay = remoteOverlayRef.current;
        const video = remoteVideoRef.current;
        
        const rect = video.getBoundingClientRect();
        overlay.width = rect.width;
        overlay.height = rect.height;
        
        const ctx = overlay.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, overlay.width, overlay.height);
          
          const scaleX = rect.width / video.videoWidth;
          const scaleY = rect.height / video.videoHeight;
          
          if (lastDetection.plates && lastDetection.plates.length > 0) {
            drawPlates(ctx, lastDetection.plates, scaleX, scaleY);
          } else if (lastDetection.slots && lastDetection.slots.length > 0) {
            drawSlots(ctx, lastDetection.slots, scaleX, scaleY);
          }
        }
      }
      
      animationFrameId = requestAnimationFrame(redrawOverlays);
    };
    
    if (remoteConnected) {
      animationFrameId = requestAnimationFrame(redrawOverlays);
    }
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [lastDetection, remoteConnected]);

  // Cleanup
  useEffect(() => {
    return () => {
      disconnectRemoteStream();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading parking lot details...</p>
        </div>
      </div>
    );
  }

  if (error || !parkingLot) {
    return (
      <div className="space-y-6 p-6">
        <Link
          href="/parking-lots"
          className="inline-flex items-center text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Parking Lots
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-12 text-center">
          <p className="text-red-800 text-lg mb-2">{error || 'Parking lot not found'}</p>
          <button
            onClick={() => router.push('/parking-lots')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Go to Parking Lots
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'space-y-6'}`}>
      {/* Header */}
      {!isFullscreen && (
        <div className="flex items-center justify-between">
          <div>
            <Link
              href={`/parking-lots/${id}`}
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Parking Lot Details
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              Live Monitor - {parkingLot.name}
            </h1>
            <p className="text-gray-600 mt-1">{parkingLot.location.address}</p>
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div
        className={`${
          isFullscreen
            ? 'absolute top-4 left-4 right-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg'
            : 'bg-white rounded-lg shadow'
        } p-4 flex items-center justify-between gap-4 flex-wrap`}
      >
        {/* Camera Type Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (remoteConnected) {
                disconnectRemoteStream();
              }
              setCameraType('gate');
            }}
            disabled={remoteConnected}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              cameraType === 'gate'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } disabled:opacity-50`}
          >
            🚪 Gate
          </button>
          <button
            onClick={() => {
              if (remoteConnected) {
                disconnectRemoteStream();
              }
              setCameraType('lot');
            }}
            disabled={remoteConnected}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              cameraType === 'lot'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } disabled:opacity-50`}
          >
            🅿️ Lot
          </button>
        </div>

        {/* Connection Button */}
        <button
          onClick={remoteConnected ? disconnectRemoteStream : connectToRemoteStream}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            remoteConnected
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {remoteConnected ? 'Disconnect' : 'Connect'}
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>
      </div>

      {/* Video Display */}
      <div className={`${isFullscreen ? 'h-screen pt-20' : 'bg-white rounded-lg shadow overflow-hidden'}`}>
        {!remoteConnected ? (
          <div className="p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <Camera className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    Connect Camera to Start Monitoring
                  </h3>
                  <p className="text-sm text-blue-700 mb-3">
                    Room ID: <code className="bg-blue-100 px-2 py-1 rounded font-mono">{roomId}</code>
                  </p>
                  <a
                    href={`/camera?lotId=${id}&type=${cameraType}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                  >
                    <Camera className="w-4 h-4" />
                    Open Camera Page
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative bg-black" style={{ minHeight: isFullscreen ? '100%' : '600px' }}>
            <video
              ref={remoteVideoRef}
              className="w-full h-full"
              autoPlay
              playsInline
              muted
            />
            <canvas
              ref={remoteOverlayRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
            />
            <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-semibold shadow-lg flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              LIVE
            </div>
          </div>
        )}
        <canvas ref={remoteCanvasRef} className="hidden" />
      </div>
    </div>
  );
}
