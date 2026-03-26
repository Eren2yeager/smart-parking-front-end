"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Maximize,
  Minimize,
  Camera,
  Activity,
  Wifi,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { ParkingWebSocket } from "@/lib/realtime/websocket-client";
import { BoundingBoxCanvas } from "@/components/detection/BoundingBoxCanvas";
import { Button } from "@/components/shadcnComponents/button";
import { Badge } from "@/components/shadcnComponents/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcnComponents/card";

interface ParkingLot {
  _id: string;
  name: string;
  location: {
    address: string;
  };
  gateCamera: {
    id: string;
    status: "active" | "inactive";
  };
  lotCamera: {
    id: string;
    status: "active" | "inactive";
  };
}

type CameraType = "gate" | "lot";

export default function LiveMonitorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [parkingLot, setParkingLot] = useState<ParkingLot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Camera controls
  const [cameraType, setCameraType] = useState<CameraType>("gate");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // WebRTC Remote Stream state
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [signalingUrl] = useState(
    process.env.NEXT_PUBLIC_AI_BACKEND_WS_URL || "ws://localhost:8000",
  );
  const [remoteFps] = useState(2); // Reduced from 10 to 2 FPS to prevent queue buildup
  const [lastDetection, setLastDetection] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const isProcessingRef = useRef(false); // Track processing state to prevent frame queue buildup

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteCanvasRef = useRef<HTMLCanvasElement>(null);
  const remoteIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingWsRef = useRef<WebSocket | null>(null);
  const wsRef = useRef<ParkingWebSocket | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
    setLogs((prev) => [...prev.slice(-20), `[${timestamp}] ${message}`]);
  };

  // Fetch parking lot details
  useEffect(() => {
    const fetchParkingLot = async () => {
      try {
        setError(null);
        const response = await fetch(`/api/parking-lots/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Parking lot not found");
          }
          throw new Error("Failed to fetch parking lot details");
        }

        const result = await response.json();
        setParkingLot(result.data);

        // Set room ID based on parking lot and camera type
        setRoomId(`${result.data._id}-${cameraType}`);
      } catch (err: any) {
        console.error("Error fetching parking lot:", err);
        setError(err.message || "Failed to load parking lot details");
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
      document.documentElement
        .requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
        })
        .catch((err) => {
          console.error("Error attempting to enable fullscreen:", err);
        });
    } else {
      document
        .exitFullscreen()
        .then(() => {
          setIsFullscreen(false);
        })
        .catch((err) => {
          console.error("Error attempting to exit fullscreen:", err);
        });
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Handle fullscreen toggle
  const connectToRemoteStream = async () => {
    try {
      addLog(`🔗 Connecting to signaling server...`);

      const wsUrl = `${signalingUrl}/ws/webrtc-signaling`;
      const ws = new WebSocket(wsUrl);
      signalingWsRef.current = ws;

      ws.onopen = () => {
        addLog(`✓ Connected to signaling server`);
        addLog(`📡 Joining room: ${roomId}`);
        ws.send(
          JSON.stringify({
            type: "join-room",
            roomId: roomId,
          }),
        );
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "connected":
              addLog(`✓ Signaling ready`);
              break;

            case "offer":
              addLog(`📥 Received offer from camera`);
              await handleOffer(data.offer);
              break;

            case "ice-candidate":
              if (data.candidate && peerConnectionRef.current) {
                await peerConnectionRef.current.addIceCandidate(
                  new RTCIceCandidate(data.candidate),
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
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
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
              const wsEndpoint =
                cameraType === "gate" ? "/ws/gate-monitor" : "/ws/lot-monitor";

              try {
                const ws = new ParkingWebSocket(`${signalingUrl}${wsEndpoint}`);
                await ws.connect(
                  async (data) => {
                    setIsProcessing(false);
                    // Normalize single-plate WS payload to { plates: [...] } so overlay can draw
                    if (
                      data.event_type === "plate_detected" &&
                      data.plate_number &&
                      !data.plates
                    ) {
                      data = {
                        ...data,
                        type: "plate_detection",
                        plates_detected: 1,
                        plates: [
                          {
                            plate_number: data.plate_number,
                            confidence: data.confidence ?? 0,
                            bbox: data.bbox ?? { x1: 0, y1: 0, x2: 0, y2: 0 },
                          },
                        ],
                      };
                    }
                    setLastDetection(data);

                    const isAiBackendPlate =
                      data.event_type === "plate_detected" && data.plate_number;
                    const isLegacyPlate =
                      data.type === "plate_detection" &&
                      (data.plates_detected ?? 0) > 0;

                    if (isAiBackendPlate) {
                      addLog(
                        `🚗 Plate: ${data.plate_number} (AI backend → DB via webhook)`,
                      );
                    } else if (isLegacyPlate) {
                      addLog(`🚗 ${data.plates_detected} plate(s) detected`);
                      if (cameraType === "gate" && data.plates?.length > 0) {
                        for (const plate of data.plates) {
                          if (
                            plate.plate_number &&
                            plate.plate_number !== "UNKNOWN"
                          ) {
                            try {
                              const response = await fetch(
                                "/api/records/entry",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    parkingLotId: id,
                                    plateNumber: plate.plate_number,
                                    gateId:
                                      parkingLot?.gateCamera.id || "unknown",
                                    confidence:
                                      plate.ocr_confidence ??
                                      plate.confidence ??
                                      0,
                                  }),
                                },
                              );
                              if (response.ok) {
                                const result = await response.json();
                                if (result.data?.duplicate) {
                                  addLog(`⏭️ Duplicate: ${plate.plate_number}`);
                                } else if (result.data?.alreadyInside) {
                                  addLog(
                                    `ℹ️ Already inside: ${plate.plate_number}`,
                                  );
                                } else {
                                  addLog(
                                    `✅ Entry recorded: ${plate.plate_number}`,
                                  );
                                }
                              } else {
                                addLog(
                                  `❌ Failed to record entry: ${plate.plate_number}`,
                                );
                              }
                            } catch (error) {
                              console.error("Error recording entry:", error);
                              addLog(`❌ Entry error: ${plate.plate_number}`);
                            }
                          }
                        }
                      }
                    }

                    const isCapacityUpdate =
                      data.type === "capacity_update" ||
                      data.event_type === "capacity_update";
                    if (isCapacityUpdate) {
                      const occ = data.occupied ?? 0;
                      const tot = data.total_slots ?? 0;
                      addLog(`🅿️ ${occ}/${tot} slots`);
                      if (cameraType === "lot" && data.slots?.length > 0) {
                        try {
                          const slotsToUpdate = data.slots.map(
                            (slot: any, index: number) => ({
                              slotId: index + 1, // Assign sequential slot IDs
                              status: slot.status || slot.class || "empty",
                            }),
                          );

                          const response = await fetch(
                            `/api/parking-lots/${id}/slots`,
                            {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                slots: slotsToUpdate,
                                detectedSlots: data.total_slots,
                              }),
                            },
                          );

                          if (response.ok) {
                            const result = await response.json();

                            // Log adjustment note if present
                            if (result.data.adjustmentNote) {
                              addLog(`ℹ️ ${result.data.adjustmentNote}`);
                            }

                            addLog(
                              `💾 Updated ${result.data.updatedSlots} slot(s) in DB`,
                            );

                            // Check for alerts
                            if (
                              result.data.alerts &&
                              result.data.alerts.length > 0
                            ) {
                              result.data.alerts.forEach((alertData: any) => {
                                if (alertData.type === "overparking") {
                                  addLog(
                                    `🚨 CRITICAL: Overparking violation! ${alertData.alert.metadata.extraVehicles} extra vehicle(s)`,
                                  );
                                } else if (alertData.type === "capacity_full") {
                                  addLog(
                                    `⚠️ WARNING: Parking lot at full capacity!`,
                                  );
                                }
                              });
                            }
                          } else {
                            addLog(
                              `❌ Failed to update DB: ${response.statusText}`,
                            );
                          }
                        } catch (error) {
                          console.error("Error updating slots:", error);
                          addLog(`❌ DB update error: ${error}`);
                        }
                      }
                    }
                  },
                  (error) => {
                    addLog(`❌ Backend error: ${error}`);
                  },
                  () => {
                    addLog("✗ Backend connection closed");
                    disconnectRemoteStream();
                  },
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
        if (
          event.candidate &&
          signalingWsRef.current?.readyState === WebSocket.OPEN
        ) {
          signalingWsRef.current.send(
            JSON.stringify({
              type: "ice-candidate",
              candidate: event.candidate,
              roomId: roomId,
            }),
          );
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (signalingWsRef.current?.readyState === WebSocket.OPEN) {
        signalingWsRef.current.send(
          JSON.stringify({
            type: "answer",
            answer: answer,
            roomId: roomId,
          }),
        );
        addLog(`📤 Sent answer to camera`);
      }
    } catch (error) {
      addLog(`❌ Error handling offer: ${error}`);
    }
  };

  const captureAndSendRemoteFrame = () => {
    if (
      !remoteVideoRef.current ||
      !remoteCanvasRef.current ||
      !wsRef.current?.isConnected()
    ) {
      return;
    }

    const canvas = remoteCanvasRef.current;
    const video = remoteVideoRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx || video.paused || video.readyState < 2) {
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    setIsProcessing(true);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          const lotId = id || parkingLot?._id || "unknown";
          wsRef.current?.sendFrame(base64, {
            parking_lot_id: lotId,
            parkingLotId: lotId,
            camera_id:
              cameraType === "gate"
                ? parkingLot?.gateCamera?.id
                : parkingLot?.lotCamera?.id,
            gate_id: cameraType === "gate" ? lotId : undefined,
            lot_id: cameraType === "lot" ? lotId : undefined,
          });
        };
        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      0.85,
    );
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

    if (remoteVideoRef.current) {
      const video = remoteVideoRef.current;
      if (video.srcObject) {
        const tracks = (video.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
        video.srcObject = null;
      }
      video.removeAttribute("src");
      video.load();
    }

    setLastDetection(null);
    setRemoteConnected(false);
    addLog("✗ Remote stream disconnected");
  };

  // Cleanup
  useEffect(() => {
    return () => {
      disconnectRemoteStream();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#0a0b0d]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-[#9ca3af]">
            Loading parking lot details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !parkingLot) {
    return (
      <div className="space-y-6 p-6">
        <Link
          href="/parking-lots"
          className="inline-flex items-center text-blue-600 dark:text-[#818cf8] hover:text-blue-700 dark:hover:text-[#a5b4fc]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Parking Lots
        </Link>
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <p className="text-red-800 dark:text-red-300 text-lg mb-4">
              {error || "Parking lot not found"}
            </p>
            <Button
              onClick={() => router.push("/parking-lots")}
              variant="destructive"
            >
              Go to Parking Lots
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className={`${isFullscreen ? "fixed inset-0 z-50 bg-black dark:bg-black" : "space-y-6"}`}
    >
      {/* Header */}
      {!isFullscreen && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <Link
              href={`/parking-lots/${id}`}
              className="inline-flex items-center text-blue-600 dark:text-[#818cf8] hover:text-blue-700 dark:hover:text-[#a5b4fc] mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Parking Lot Details
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-[#e5e7eb]">
              Live Monitor - {parkingLot.name}
            </h1>
            <p className="text-gray-600 dark:text-[#9ca3af] mt-1">
              {parkingLot.location.address}
            </p>
          </div>

          {/* Status Indicators */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={remoteConnected ? "success" : "secondary"}
              className="flex items-center gap-1.5"
            >
              {remoteConnected ? (
                <>
                  <Wifi className="w-3 h-3" />
                  Connected
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  Disconnected
                </>
              )}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1.5">
              <Camera className="w-3 h-3" />
              {cameraType === "gate" ? "Gate Camera" : "Lot Camera"}
            </Badge>
            {isProcessing && (
              <Badge variant="default" className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 animate-pulse" />
                Processing
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <Card
        className={`${
          isFullscreen
            ? "absolute top-4 left-4 right-4 z-10 bg-white/95 dark:bg-[#111316]/95 backdrop-blur-sm shadow-lg"
            : ""
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Camera Type Selector */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  if (remoteConnected) {
                    disconnectRemoteStream();
                  }
                  setCameraType("gate");
                }}
                disabled={remoteConnected}
                variant={cameraType === "gate" ? "default" : "outline"}
                size="sm"
              >
                🚪 Gate
              </Button>
              <Button
                onClick={() => {
                  if (remoteConnected) {
                    disconnectRemoteStream();
                  }
                  setCameraType("lot");
                }}
                disabled={remoteConnected}
                variant={cameraType === "lot" ? "default" : "outline"}
                size="sm"
              >
                🅿️ Lot
              </Button>
            </div>

            {/* Connection Button */}
            <Button
              onClick={
                remoteConnected ? disconnectRemoteStream : connectToRemoteStream
              }
              variant={remoteConnected ? "destructive" : "default"}
              className={
                remoteConnected
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {remoteConnected ? "Disconnect" : "Connect"}
            </Button>

            {/* Fullscreen Toggle */}
            <Button onClick={toggleFullscreen} variant="outline" size="icon">
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Video Display */}
      <Card
        className={`${isFullscreen ? "h-screen pt-20 border-0 rounded-none" : "overflow-hidden"}`}
      >
        {!remoteConnected ? (
          <CardContent className="p-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="flex justify-between w-full gap-3">
                <div className="flex gap-4 items-center">
                  <Camera className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1 shrink-0" />
                  <div>

                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
                    Connect Camera to Start Monitoring
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
                    Room ID:{" "}
                    <code className="bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded font-mono text-blue-900 dark:text-blue-300">
                      {roomId}
                    </code>
                  </p>
                  </div>
                </div>
                <Button asChild>
                  <a
                    href={`/camera?lotId=${id}&type=${cameraType}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Open Camera Page
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        ) : (
          <div
            className="relative bg-black"
            style={{ minHeight: isFullscreen ? "100%" : "600px" }}
          >
            <video
              id="live-monitor-video"
              ref={remoteVideoRef}
              className="w-full h-full"
              autoPlay
              playsInline
              muted
            />
            <BoundingBoxCanvas
              imageId="live-monitor-video"
              detections={
                lastDetection?.plates && lastDetection.plates.length > 0
                  ? lastDetection.plates
                  : lastDetection?.slots && lastDetection.slots.length > 0
                    ? lastDetection.slots
                    : null
              }
              type={
                lastDetection?.plates && lastDetection.plates.length > 0
                  ? "plates"
                  : "slots"
              }
            />
            {/* Live Indicator */}
            <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-semibold shadow-lg flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              LIVE
            </div>

            {/* Detection Info */}
            {lastDetection && (
              <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm shadow-lg">
                {lastDetection.plates && lastDetection.plates.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    <span>{lastDetection.plates.length} plate(s) detected</span>
                  </div>
                ) : lastDetection.slots && lastDetection.slots.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    <span>
                      {lastDetection.occupied ?? 0}/
                      {lastDetection.total_slots ?? 0} occupied
                    </span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
        <canvas ref={remoteCanvasRef} className="hidden" />
      </Card>

      {/* Activity Log */}
      {!isFullscreen && logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activity Log
            </CardTitle>
            <CardDescription>Real-time monitoring events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 dark:bg-[#0a0b0d] rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-xs space-y-1">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`${
                    log.includes("❌") || log.includes("✗")
                      ? "text-red-600 dark:text-red-400"
                      : log.includes("✓") || log.includes("✅")
                        ? "text-green-600 dark:text-green-400"
                        : log.includes("⚠️") || log.includes("🚨")
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-gray-700 dark:text-[#9ca3af]"
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
