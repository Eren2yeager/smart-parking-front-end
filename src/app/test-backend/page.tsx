'use client';

import { useState, useRef, useEffect } from 'react';
import { ParkingWebSocket } from '@/lib/websocket-client';

type TestMode = 'http' | 'websocket' | 'stream' | 'remote';
type EndpointType = 'gate' | 'lot' | 'vehicle';

export default function TestBackendPage() {
  const [backendUrl, setBackendUrl] = useState('http://localhost:8000');
  const [testMode, setTestMode] = useState<TestMode>('http');
  const [endpointType, setEndpointType] = useState<EndpointType>('gate');
  
  // WebSocket state
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<ParkingWebSocket | null>(null);
  
  // Stream state
  const [streaming, setStreaming] = useState(false);
  const [streamFps, setStreamFps] = useState(10);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Image preview state
  const [imagePreview, setImagePreview] = useState<string>('');
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Results state
  const [results, setResults] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastDetection, setLastDetection] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastFrameSentRef = useRef<number>(0);
  
  // Video playback state
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoFps, setVideoFps] = useState(10);
  const videoFileRef = useRef<HTMLVideoElement>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoOverlayRef = useRef<HTMLCanvasElement>(null);
  const videoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const detectionBufferRef = useRef<Map<number, any>>(new Map()); // Frame number -> detection
  const frameCounterRef = useRef<number>(0);

  // WebRTC Remote Stream state
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [roomId, setRoomId] = useState('parking-camera-1');
  const [signalingUrl, setSignalingUrl] = useState('ws://localhost:8000');
  const [remoteFps, setRemoteFps] = useState(10);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteCanvasRef = useRef<HTMLCanvasElement>(null);
  const remoteOverlayRef = useRef<HTMLCanvasElement>(null);
  const remoteIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingWsRef = useRef<WebSocket | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
    setLogs(prev => [...prev.slice(-30), `[${timestamp}] ${message}`]);
  };

  // Draw bounding boxes - separate functions for clarity
  const drawPlates = (ctx: CanvasRenderingContext2D, plates: any[], scaleX: number = 1, scaleY: number = 1) => {
    plates.forEach((plate: any) => {
      const bbox = plate.bbox;
      const plateNumber = plate.plate_number || 'UNKNOWN';
      const confidence = plate.ocr_confidence || plate.confidence || 0;
      const isNew = plate.is_new !== undefined ? plate.is_new : true;
      
      // Scale coordinates
      const x1 = bbox.x1 * scaleX;
      const y1 = bbox.y1 * scaleY;
      const x2 = bbox.x2 * scaleX;
      const y2 = bbox.y2 * scaleY;
      
      // Draw rectangle with glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = isNew ? '#00ff00' : '#ffff00';
      ctx.strokeStyle = isNew ? '#00ff00' : '#ffff00';
      ctx.lineWidth = 4;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.shadowBlur = 0;
      
      // Draw label background
      const label = `${plateNumber} (${(confidence * 100).toFixed(0)}%)`;
      ctx.font = 'bold 20px Arial';
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = isNew ? '#00ff00' : '#ffff00';
      ctx.fillRect(x1, y1 - 35, textWidth + 10, 35);
      
      // Draw label text
      ctx.fillStyle = '#000000';
      ctx.fillText(label, x1 + 5, y1 - 10);
    });
  };

  const drawSlots = (ctx: CanvasRenderingContext2D, slots: any[], scaleX: number = 1, scaleY: number = 1) => {
    slots.forEach((slot: any) => {
      const bbox = slot.bbox;
      const status = slot.status || slot.class || 'unknown';
      const confidence = slot.confidence || 0;
      
      // Scale coordinates
      const x1 = bbox.x1 * scaleX;
      const y1 = bbox.y1 * scaleY;
      const x2 = bbox.x2 * scaleX;
      const y2 = bbox.y2 * scaleY;
      
      // Draw rectangle with glow
      ctx.shadowBlur = 8;
      ctx.shadowColor = status === 'occupied' ? '#ff0000' : '#00ff00';
      ctx.strokeStyle = status === 'occupied' ? '#ff0000' : '#00ff00';
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.shadowBlur = 0;
      
      // Draw label background
      const label = `${status.toUpperCase()} (${(confidence * 100).toFixed(0)}%)`;
      ctx.font = 'bold 16px Arial';
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = status === 'occupied' ? 'rgba(255, 0, 0, 0.9)' : 'rgba(0, 255, 0, 0.9)';
      ctx.fillRect(x1, y1 - 28, textWidth + 10, 28);
      
      // Draw label text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x1 + 5, y1 - 8);
    });
  };

  const drawVehicles = (ctx: CanvasRenderingContext2D, vehicles: any[], scaleX: number = 1, scaleY: number = 1) => {
    vehicles.forEach((vehicle: any) => {
      const bbox = vehicle.bbox;
      const confidence = vehicle.confidence || 0;
      
      // Scale coordinates
      const x1 = bbox.x1 * scaleX;
      const y1 = bbox.y1 * scaleY;
      const x2 = bbox.x2 * scaleX;
      const y2 = bbox.y2 * scaleY;
      
      // Draw rectangle
      ctx.strokeStyle = '#0088ff';
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      
      // Draw label
      const label = `VEHICLE (${(confidence * 100).toFixed(0)}%)`;
      ctx.font = 'bold 16px Arial';
      ctx.fillStyle = '#0088ff';
      ctx.fillText(label, x1 + 5, y1 - 8);
    });
  };

  // HTTP API Testing
  const testHttpApi = async () => {
    if (!selectedFile) {
      addLog('❌ No file selected');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    const endpoints = {
      gate: '/api/recognize-plate',
      lot: '/api/detect-parking-slots',
      vehicle: '/api/detect-vehicle'
    };

    try {
      addLog(`📤 Testing ${endpoints[endpointType]}...`);
      const response = await fetch(`${backendUrl}${endpoints[endpointType]}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('API Result:', result); // Debug log
      addLog(`✓ Response received`);
      setResults(prev => [{ type: 'http', endpoint: endpointType, data: result, timestamp: Date.now() }, ...prev.slice(0, 9)]);
      
      // Draw bounding boxes on image
      if (imageCanvasRef.current && imagePreview) {
        const img = new Image();
        img.onload = () => {
          const canvas = imageCanvasRef.current!;
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            
            // Draw based on endpoint type
            if (endpointType === 'gate' && result.plates) {
              addLog(`Drawing ${result.plates.length} plates`);
              drawPlates(ctx, result.plates, 1, 1); // No scaling for static images
            } else if (endpointType === 'lot' && result.slots) {
              addLog(`Drawing ${result.slots.length} slots`);
              drawSlots(ctx, result.slots, 1, 1); // No scaling for static images
            } else if (endpointType === 'vehicle' && result.vehicles) {
              addLog(`Drawing ${result.vehicles.length} vehicles`);
              drawVehicles(ctx, result.vehicles, 1, 1); // No scaling for static images
            } else {
              addLog(`⚠️ No detections found in result`);
              console.log('Result structure:', result);
            }
          }
        };
        img.src = imagePreview;
      }
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // WebSocket Testing
  const connectWebSocket = async () => {
    if (wsRef.current?.isConnected()) {
      addLog('Already connected');
      return;
    }

    const wsEndpoint = endpointType === 'gate' ? '/ws/gate-monitor' : '/ws/lot-monitor';
    
    try {
      const ws = new ParkingWebSocket(`${backendUrl.replace('http', 'ws')}${wsEndpoint}`);
      await ws.connect(
        (data) => {
          console.log('WebSocket data:', data); // Debug log
          
          setIsProcessing(false); // Mark processing complete
          
          if (data.type === 'connection') {
            addLog(`✓ Connected to ${endpointType} monitor`);
          } else if (data.type === 'plate_detection') {
            if (data.plates_detected > 0) {
              addLog(`🚗 ${data.plates_detected} plate(s) - ${data.processing_time_ms}ms`);
            }
            setResults(prev => [{ type: 'websocket', endpoint: endpointType, data, timestamp: Date.now() }, ...prev.slice(0, 9)]);
            setLastDetection(data);
            
            // Draw on image if available
            if (imageCanvasRef.current && imagePreview) {
              const img = new Image();
              img.onload = () => {
                const canvas = imageCanvasRef.current!;
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0);
                  if (data.plates && data.plates.length > 0) {
                    drawPlates(ctx, data.plates, 1, 1); // No scaling for static images
                  }
                }
              };
              img.src = imagePreview;
            }
          } else if (data.type === 'capacity_update') {
            addLog(`🅿️ ${data.occupied}/${data.total_slots} (${(data.occupancy_rate * 100).toFixed(0)}%) - ${data.processing_time_ms}ms`);
            setResults(prev => [{ type: 'websocket', endpoint: endpointType, data, timestamp: Date.now() }, ...prev.slice(0, 9)]);
            setLastDetection(data);
            
            // Draw on image if available
            if (imageCanvasRef.current && imagePreview) {
              const img = new Image();
              img.onload = () => {
                const canvas = imageCanvasRef.current!;
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0);
                  if (data.slots && data.slots.length > 0) {
                    drawSlots(ctx, data.slots, 1, 1); // No scaling for static images
                  }
                }
              };
              img.src = imagePreview;
            }
          }
        },
        (error) => {
          addLog(`❌ WebSocket error: ${error}`);
          setWsConnected(false);
        }
      );
      wsRef.current = ws;
      setWsConnected(true);
    } catch (error) {
      addLog(`❌ Failed to connect: ${error}`);
    }
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
      setWsConnected(false);
      addLog('✗ Disconnected');
    }
  };

  const sendFrameToWebSocket = async () => {
    if (!selectedFile || !wsRef.current?.isConnected()) {
      addLog('❌ No file or not connected');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      wsRef.current?.sendFrame(base64, {
        [endpointType === 'gate' ? 'gate_id' : 'lot_id']: 'test_1'
      });
      addLog(`📤 Frame sent`);
      
      // Set preview for drawing
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  // Video file playback
  const startVideoPlayback = async () => {
    if (!selectedFile || !wsRef.current?.isConnected()) {
      addLog('❌ No video file or not connected');
      return;
    }

    if (!selectedFile.type.startsWith('video/')) {
      addLog('❌ Selected file is not a video');
      return;
    }

    try {
      const videoUrl = URL.createObjectURL(selectedFile);
      
      if (videoFileRef.current) {
        videoFileRef.current.src = videoUrl;
        await videoFileRef.current.play();
      }

      // Reset frame counter and buffer
      frameCounterRef.current = 0;
      detectionBufferRef.current.clear();

      // Start sending frames
      videoIntervalRef.current = setInterval(() => {
        captureAndSendVideoFrame();
      }, 1000 / videoFps);

      setVideoPlaying(true);
      addLog(`✓ Video playback started at ${videoFps} FPS`);
      addLog(`⚠️ Note: Detections may lag by ~200-500ms due to processing time`);
    } catch (error) {
      addLog(`❌ Video playback error: ${error}`);
    }
  };

  const stopVideoPlayback = () => {
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }

    if (videoFileRef.current) {
      videoFileRef.current.pause();
      videoFileRef.current.currentTime = 0;
    }

    // Clear detection buffer
    frameCounterRef.current = 0;
    detectionBufferRef.current.clear();

    setVideoPlaying(false);
    addLog('✗ Video playback stopped');
  };

  const captureAndSendVideoFrame = () => {
    if (!videoFileRef.current || !videoCanvasRef.current || !wsRef.current?.isConnected()) return;

    const canvas = videoCanvasRef.current;
    const video = videoFileRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.paused || video.ended) {
      if (video.ended) {
        stopVideoPlayback();
        addLog('✓ Video playback completed');
      }
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const currentFrame = frameCounterRef.current++;
    const currentTime = video.currentTime;

    canvas.toBlob((blob) => {
      if (!blob) return;
      
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        wsRef.current?.sendFrame(base64, {
          [endpointType === 'gate' ? 'gate_id' : 'lot_id']: 'video_file',
          frame_number: currentFrame,
          timestamp: currentTime
        });
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.8);
  };

  // Handle file selection
  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const preview = reader.result as string;
        setImagePreview(preview);
        
        // Draw initial image on canvas
        if (imageCanvasRef.current) {
          const img = new Image();
          img.onload = () => {
            const canvas = imageCanvasRef.current!;
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
            }
          };
          img.src = preview;
        }
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview('');
    }
  };

  // Webcam Streaming
  const startWebcamStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Connect WebSocket first
      if (!wsRef.current?.isConnected()) {
        await connectWebSocket();
      }

      // Start sending frames
      streamIntervalRef.current = setInterval(() => {
        captureAndSendFrame();
      }, 1000 / streamFps);

      setStreaming(true);
      addLog(`✓ Webcam streaming started at ${streamFps} FPS`);
    } catch (error) {
      addLog(`❌ Webcam error: ${error}`);
    }
  };

  const stopWebcamStream = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    setStreaming(false);
    addLog('✗ Webcam streaming stopped');
  };

  const captureAndSendFrame = () => {
    if (!videoRef.current || !canvasRef.current || !wsRef.current?.isConnected()) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    setIsProcessing(true); // Mark as processing
    lastFrameSentRef.current = Date.now();

    canvas.toBlob((blob) => {
      if (!blob) return;
      
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        wsRef.current?.sendFrame(base64, {
          [endpointType === 'gate' ? 'gate_id' : 'lot_id']: 'webcam_stream'
        });
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.85); // Slightly higher quality
  };

  // Continuous overlay redraw for smooth real-time feeling
  useEffect(() => {
    let animationFrameId: number;
    
    const redrawOverlays = () => {
      // For webcam stream
      if (streaming && overlayCanvasRef.current && videoRef.current && lastDetection) {
        const overlay = overlayCanvasRef.current;
        const video = videoRef.current;
        
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
      
      // For video file playback
      if (videoPlaying && videoOverlayRef.current && videoFileRef.current && lastDetection) {
        const overlay = videoOverlayRef.current;
        const video = videoFileRef.current;
        
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

      // For remote WebRTC stream
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
      
      // Continue animation loop
      animationFrameId = requestAnimationFrame(redrawOverlays);
    };
    
    // Start animation loop
    if (streaming || videoPlaying || remoteConnected) {
      animationFrameId = requestAnimationFrame(redrawOverlays);
    }
    
    // Cleanup
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [lastDetection, streaming, videoPlaying, remoteConnected, endpointType]);

  // WebRTC Remote Stream Functions
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
          console.log('Signaling message:', data.type, data);
          
          switch (data.type) {
            case 'connected':
              addLog(`✓ Signaling ready (Client ID: ${data.clientId})`);
              break;
              
            case 'offer':
              addLog(`📥 Received offer from camera`);
              await handleOffer(data.offer);
              break;
              
            case 'answer':
              // This shouldn't happen (we're the answerer), but log it
              addLog(`⚠️ Received answer (unexpected)`);
              break;
              
            case 'ice-candidate':
              if (data.candidate && peerConnectionRef.current) {
                await peerConnectionRef.current.addIceCandidate(
                  new RTCIceCandidate(data.candidate)
                );
                addLog(`🧊 Added ICE candidate`);
              } else if (data.candidate && !peerConnectionRef.current) {
                addLog(`⚠️ Received ICE candidate but no peer connection yet`);
              }
              break;
              
            case 'user-joined':
              addLog(`👤 User joined: ${data.userId}`);
              break;
              
            case 'user-left':
              addLog(`👋 User left: ${data.userId}`);
              break;
              
            default:
              addLog(`❓ Unknown message type: ${data.type}`);
          }
        } catch (error) {
          addLog(`❌ Message error: ${error}`);
          console.error('Signaling error:', error);
        }
      };

      ws.onerror = (error) => {
        addLog(`❌ WebSocket error`);
        console.error(error);
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
      
      // Create peer connection
      const config: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };
      
      const pc = new RTCPeerConnection(config);
      peerConnectionRef.current = pc;
      addLog(`✓ Peer connection created`);

      // Handle incoming stream
      pc.ontrack = (event) => {
        addLog(`📹 Received remote stream with ${event.streams[0].getTracks().length} tracks`);
        console.log('Remote stream tracks:', event.streams[0].getTracks());
        
        // Set state first to render video element
        setRemoteConnected(true);
        
        // Use setTimeout to ensure video element is rendered
        setTimeout(() => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
            addLog(`✓ Video element srcObject set`);
            
            // Wait for video to be ready
            remoteVideoRef.current.onloadedmetadata = () => {
              addLog(`✓ Video metadata loaded: ${remoteVideoRef.current?.videoWidth}x${remoteVideoRef.current?.videoHeight}`);
            };
            
            remoteVideoRef.current.onplay = () => {
              addLog(`▶️ Video playing`);
            };
            
            remoteVideoRef.current.onerror = (e) => {
              addLog(`❌ Video error: ${e}`);
              console.error('Video error:', e);
            };
            
            // Connect to Python backend WebSocket for AI processing
            setTimeout(async () => {
              if (!wsRef.current?.isConnected()) {
                addLog(`🔗 Connecting to AI backend...`);
                await connectWebSocket();
              }

              // Start sending frames to Python backend
              remoteIntervalRef.current = setInterval(() => {
                captureAndSendRemoteFrame();
              }, 1000 / remoteFps);
              
              addLog(`🎯 Started frame capture at ${remoteFps} FPS`);
            }, 1500); // Wait 1.5 seconds for video to stabilize
          } else {
            addLog(`❌ Video element ref is null!`);
          }
        }, 100); // Wait 100ms for React to render the video element
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && signalingWsRef.current?.readyState === WebSocket.OPEN) {
          signalingWsRef.current.send(JSON.stringify({
            type: 'ice-candidate',
            candidate: event.candidate,
            roomId: roomId
          }));
          addLog(`📤 Sent ICE candidate`);
        } else if (!event.candidate) {
          addLog(`✓ ICE gathering complete`);
        }
      };

      pc.onconnectionstatechange = () => {
        addLog(`🔗 Connection state: ${pc.connectionState}`);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          disconnectRemoteStream();
        }
      };
      
      pc.oniceconnectionstatechange = () => {
        addLog(`🧊 ICE connection state: ${pc.iceConnectionState}`);
      };

      // Set remote description and create answer
      addLog(`📥 Setting remote description...`);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      addLog(`✓ Remote description set`);
      
      addLog(`📝 Creating answer...`);
      const answer = await pc.createAnswer();
      addLog(`✓ Answer created`);
      
      await pc.setLocalDescription(answer);
      addLog(`✓ Local description set`);

      // Send answer back
      if (signalingWsRef.current?.readyState === WebSocket.OPEN) {
        signalingWsRef.current.send(JSON.stringify({
          type: 'answer',
          answer: answer,
          roomId: roomId
        }));
        addLog(`📤 Sent answer to camera`);
      } else {
        addLog(`❌ Cannot send answer - signaling not connected`);
      }

    } catch (error) {
      addLog(`❌ Error handling offer: ${error}`);
      console.error('Offer handling error:', error);
    }
  };

  const captureAndSendRemoteFrame = () => {
    if (!remoteVideoRef.current || !remoteCanvasRef.current) {
      console.log('Missing refs:', { video: !!remoteVideoRef.current, canvas: !!remoteCanvasRef.current });
      return;
    }

    if (!wsRef.current?.isConnected()) {
      console.log('WebSocket not connected');
      return;
    }

    const canvas = remoteCanvasRef.current;
    const video = remoteVideoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.log('No canvas context');
      return;
    }
    
    if (video.paused || video.readyState < 2) {
      console.log('Video not ready:', { paused: video.paused, readyState: video.readyState });
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    setIsProcessing(true); // Mark as processing
    lastFrameSentRef.current = Date.now();

    canvas.toBlob((blob) => {
      if (!blob) return;
      
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        wsRef.current?.sendFrame(base64, {
          [endpointType === 'gate' ? 'gate_id' : 'lot_id']: 'remote_phone'
        });
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.85); // Slightly higher quality
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

    if (remoteVideoRef.current?.srcObject) {
      const tracks = (remoteVideoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      remoteVideoRef.current.srcObject = null;
    }

    setRemoteConnected(false);
    addLog('✗ Remote stream disconnected');
  };

  // Cleanup
  useEffect(() => {
    return () => {
      stopWebcamStream();
      stopVideoPlayback();
      disconnectWebSocket();
      disconnectRemoteStream();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 p-4 md:p-8 text-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-6 mb-6 border border-indigo-500">
          <div className="flex items-center gap-4">
            <div className="text-5xl">🖥️</div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Python Backend Test Interface</h1>
              <p className="text-indigo-100">Test HTTP APIs, WebSocket connections, and live streaming with AI detection</p>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-gray-800 rounded-xl shadow-2xl p-6 mb-6 border border-indigo-500/30">
          <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            Configuration
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-indigo-300">Backend URL</label>
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-indigo-500/50 rounded-md text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-indigo-300">Test Mode</label>
              <select
                value={testMode}
                onChange={(e) => setTestMode(e.target.value as TestMode)}
                className="w-full px-3 py-2 bg-gray-900 border border-indigo-500/50 rounded-md text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="http">HTTP API</option>
                <option value="websocket">WebSocket</option>
                <option value="stream">Webcam Stream</option>
                <option value="remote">Remote Stream (Phone)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-indigo-300">Endpoint</label>
              <select
                value={endpointType}
                onChange={(e) => setEndpointType(e.target.value as EndpointType)}
                className="w-full px-3 py-2 bg-gray-900 border border-indigo-500/50 rounded-md text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="gate">Gate Monitor (Plates)</option>
                <option value="lot">Lot Monitor (Capacity)</option>
                <option value="vehicle">Vehicle Detection</option>
              </select>
            </div>
          </div>
        </div>

        {/* HTTP API Testing */}
        {testMode === 'http' && (
          <div className="bg-gray-800 rounded-xl shadow-2xl p-6 mb-6 border border-indigo-500/30">
            <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
              <span className="text-2xl">🔗</span>
              HTTP API Testing
            </h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-indigo-300">Upload Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
              />
            </div>

            {imagePreview && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2 text-indigo-300">Image with Detections:</p>
                <div className="border border-indigo-500/50 rounded bg-black p-2 inline-block">
                  <canvas ref={imageCanvasRef} className="max-w-full" style={{ maxHeight: '500px' }} />
                </div>
              </div>
            )}

            <button
              onClick={testHttpApi}
              disabled={!selectedFile || loading}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all transform hover:scale-105"
            >
              {loading ? 'Testing...' : '📤 Test API'}
            </button>
          </div>
        )}

        {/* WebSocket Testing */}
        {testMode === 'websocket' && (
          <div className="bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">⚡ WebSocket Testing</h2>
            
            <div className="flex gap-4 mb-4 flex-wrap">
              <button
                onClick={wsConnected ? disconnectWebSocket : connectWebSocket}
                className={`px-6 py-2 rounded-md text-white ${
                  wsConnected ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {wsConnected ? '🔴 Disconnect' : '🟢 Connect'}
              </button>

              {wsConnected && (
                <>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                    className="text-sm bg-blue-700 rounded-sm"
                  />
                  
                  {selectedFile && !selectedFile.type.startsWith('video/') && (
                    <button
                      onClick={sendFrameToWebSocket}
                      disabled={!selectedFile}
                      className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md disabled:bg-gray-300"
                    >
                      📤 Send Frame
                    </button>
                  )}
                  
                  {selectedFile && selectedFile.type.startsWith('video/') && (
                    <>
                      <div className="flex items-center gap-2">
                        <label className="text-sm">FPS: {videoFps}</label>
                        <input
                          type="range"
                          min="1"
                          max="30"
                          value={videoFps}
                          onChange={(e) => setVideoFps(Number(e.target.value))}
                          disabled={videoPlaying}
                          className="w-32"
                        />
                      </div>
                      <button
                        onClick={videoPlaying ? stopVideoPlayback : startVideoPlayback}
                        className={`px-6 py-2 rounded-md text-white ${
                          videoPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                      >
                        {videoPlaying ? '⏹️ Stop Video' : '▶️ Play Video'}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>

            {wsConnected && selectedFile && selectedFile.type.startsWith('video/') && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Video Playback with Detections:</p>
                <div className="bg-yellow-50 text-black border border-yellow-300 rounded p-2 mb-2 text-xs">
                  ⚠️ <strong>Note:</strong> Bounding boxes may lag by 200-500ms due to AI processing time. 
                  Lower FPS (3-5) reduces lag. This is normal for real-time detection.
                </div>
                <div className="relative bg-black rounded-lg overflow-hidden inline-block">
                  <video
                    ref={videoFileRef}
                    className="max-w-full"
                    style={{ maxHeight: '400px' }}
                    loop
                  />
                  <canvas
                    ref={videoOverlayRef}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  />
                  {videoPlaying && (
                    <div className="absolute top-2 left-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      🎬 PLAYING
                    </div>
                  )}
                </div>
                <canvas ref={videoCanvasRef} className="hidden" />
              </div>
            )}

            {wsConnected && imagePreview && !selectedFile?.type.startsWith('video/') && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Image with Detections:</p>
                <div className="border rounded bg-gray-100 p-2 inline-block">
                  <canvas ref={imageCanvasRef} className="max-w-full" style={{ maxHeight: '500px' }} />
                </div>
              </div>
            )}

            {wsConnected && (
              <div className="text-sm text-green-600">✓ Connected to {endpointType} monitor</div>
            )}
          </div>
        )}

        {/* Webcam Streaming */}
        {testMode === 'stream' && (
          <div className="bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">📹 Webcam Streaming</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Stream FPS: {streamFps}
                <span className="text-xs text-gray-400 ml-2">(Backend processes ~{Math.round(streamFps / 5)} FPS)</span>
              </label>
              <input
                type="range"
                min="5"
                max="30"
                value={streamFps}
                onChange={(e) => setStreamFps(Number(e.target.value))}
                disabled={streaming}
                className="w-full accent-indigo-600"
              />
              <p className="text-xs text-indigo-400 mt-1">
                💡 Higher FPS = smoother video, but backend still processes every 5th frame
              </p>
            </div>

            <div className="flex gap-4 mb-4">
              <button
                onClick={streaming ? stopWebcamStream : startWebcamStream}
                className={`px-6 py-2 rounded-md text-white ${
                  streaming ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {streaming ? '⏹️ Stop Stream' : '▶️ Start Stream'}
              </button>
            </div>

            <div className="relative bg-black rounded-lg overflow-hidden" style={{ maxWidth: '640px' }}>
              <video
                ref={videoRef}
                className="w-full"
                autoPlay
                playsInline
                muted
              />
              <canvas
                ref={overlayCanvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              />
              {streaming && (
                <>
                  <div className="absolute top-2 left-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    🔴 LIVE
                  </div>
                  {isProcessing && (
                    <div className="absolute top-2 right-2 bg-yellow-500/90 text-black px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                      ⚡ AI Processing...
                    </div>
                  )}
                </>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* Remote Stream (Phone) */}
        {testMode === 'remote' && (
          <div className="bg-gray-800 rounded-xl shadow-2xl p-6 mb-6 border border-indigo-500/30">
            <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
              <span className="text-2xl">📱</span>
              Remote Stream (Phone Camera)
            </h2>
            
            <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border border-blue-500/30 rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-2 text-blue-300 flex items-center gap-2">
                <span className="text-xl">📋</span>
                Setup Instructions
              </h3>
              <ol className="text-sm space-y-1 list-decimal list-inside text-blue-200">
                <li>Make sure Python backend is running (port 8000)</li>
                <li>Open <a href="/camera" className="text-blue-400 underline hover:text-blue-300">/camera</a> page on your phone</li>
                <li>Enter the same Room ID on both devices</li>
                <li>Click "Connect to Stream" here</li>
                <li>Click "Start Streaming" on phone</li>
                <li>Video will appear with real-time AI detections!</li>
              </ol>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-indigo-300">Backend WebSocket URL</label>
                <input
                  type="text"
                  value={signalingUrl}
                  onChange={(e) => setSignalingUrl(e.target.value)}
                  disabled={remoteConnected}
                  className="w-full px-3 py-2 bg-gray-900 border border-indigo-500/50 rounded-md text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                  placeholder="ws://localhost:8000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-indigo-300">Room ID</label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  disabled={remoteConnected}
                  className="w-full px-3 py-2 bg-gray-900 border border-indigo-500/50 rounded-md text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                  placeholder="parking-camera-1"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-indigo-300">
                Stream FPS: {remoteFps}
                <span className="text-xs text-gray-400 ml-2">(Backend processes ~{Math.round(remoteFps / 5)} FPS)</span>
              </label>
              <input
                type="range"
                min="5"
                max="30"
                value={remoteFps}
                onChange={(e) => setRemoteFps(Number(e.target.value))}
                disabled={remoteConnected}
                className="w-full accent-indigo-600"
              />
              <p className="text-xs text-indigo-400 mt-1">
                💡 Bounding boxes persist across frames for smooth real-time feeling
              </p>
            </div>

            <div className="flex gap-4 mb-4">
              <button
                onClick={remoteConnected ? disconnectRemoteStream : connectToRemoteStream}
                className={`px-6 py-2 rounded-md text-white font-semibold transition-all transform hover:scale-105 ${
                  remoteConnected ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700' : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                }`}
              >
                {remoteConnected ? '🔴 Disconnect' : '🟢 Connect to Stream'}
              </button>
            </div>

            {/* Connection Status */}
            <div className="mb-4 p-4 bg-gray-900/50 rounded-lg border border-indigo-500/30">
              <div className="text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-indigo-300">Signaling:</span>
                  <span className={signalingWsRef.current?.readyState === WebSocket.OPEN ? 'text-green-400 font-semibold' : 'text-red-400'}>
                    {signalingWsRef.current?.readyState === WebSocket.OPEN ? '✓ Connected' : '✗ Disconnected'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-300">WebRTC:</span>
                  <span className={remoteConnected ? 'text-green-400 font-semibold' : 'text-gray-400'}>
                    {remoteConnected ? '✓ Stream Active' : '○ No Stream'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-300">AI Backend:</span>
                  <span className={wsRef.current?.isConnected() ? 'text-green-400 font-semibold' : 'text-gray-400'}>
                    {wsRef.current?.isConnected() ? '✓ Connected' : '○ Not Connected'}
                  </span>
                </div>
              </div>
            </div>

            {remoteConnected && (
              <div className="relative bg-black rounded-lg overflow-hidden border border-indigo-500/50" style={{ maxWidth: '640px' }}>
                <video
                  ref={remoteVideoRef}
                  className="w-full"
                  autoPlay
                  playsInline
                  muted
                />
                <canvas
                  ref={remoteOverlayRef}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                />
                <div className="absolute top-2 left-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                  📱 REMOTE
                </div>
                {isProcessing && (
                  <div className="absolute top-2 right-2 bg-yellow-500/90 text-black px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                    ⚡ AI Processing...
                  </div>
                )}
              </div>
            )}
            <canvas ref={remoteCanvasRef} className="hidden" />


          </div>
        )}

        {/* Results Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-indigo-500/30">
            <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Results
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.length === 0 ? (
                <p className="text-gray-400">No results yet</p>
              ) : (
                results.map((result, idx) => (
                  <div key={idx} className="border border-indigo-500/30 rounded p-3 text-sm bg-gray-900/50">
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold text-indigo-300">{result.type.toUpperCase()} - {result.endpoint}</span>
                      <span className="text-gray-400 text-xs">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="bg-black p-2 rounded text-xs overflow-x-auto text-green-400 font-mono">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-indigo-500/30">
            <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
              <span className="text-2xl">📝</span>
              Activity Logs
            </h2>
            <div className="bg-black border border-green-500/30 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto shadow-inner">
              {logs.length === 0 ? (
                <div className="text-gray-500">Waiting for activity...</div>
              ) : (
                logs.map((log, idx) => <div key={idx} className="hover:bg-green-500/10 px-2 py-1 rounded">{log}</div>)
              )}
            </div>
          </div>
        </div>

        {/* Quick Info */}
        <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 rounded-xl p-6">
          <h3 className="font-semibold mb-3 text-indigo-300 flex items-center gap-2">
            <span className="text-xl">💡</span>
            Quick Guide
          </h3>
          <ul className="text-sm space-y-2 text-indigo-200">
            <li><strong className="text-white">HTTP API:</strong> Upload image → Test API → See results</li>
            <li><strong className="text-white">WebSocket:</strong> Connect → Send frames → Real-time results</li>
            <li><strong className="text-white">Webcam Stream:</strong> Start stream → Live detection → Stop when done</li>
            <li><strong className="text-white">Remote Stream:</strong> Connect phone camera → Real-time AI processing</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
