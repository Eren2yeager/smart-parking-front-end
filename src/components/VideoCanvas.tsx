'use client';

import { useEffect, useRef, useState } from 'react';
import { WebSocketManager, VideoFrame, ConnectionStatus, Detection } from '@/lib/websocket-manager';

interface VideoCanvasProps {
  wsUrl: string;
  cameraType: 'gate' | 'lot';
  onDetection?: (detection: Detection) => void;
  onConnectionChange?: (status: ConnectionStatus) => void;
  className?: string;
}

export default function VideoCanvas({
  wsUrl,
  cameraType,
  onDetection,
  onConnectionChange,
  className = '',
}: VideoCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsManagerRef = useRef<WebSocketManager | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Failed to get canvas context');
      return;
    }

    // Initialize WebSocket Manager
    const wsManager = new WebSocketManager({
      url: wsUrl,
      onFrame: (frame: VideoFrame) => {
        renderFrame(ctx, canvas, frame);
        setIsLoading(false);
        
        // Notify parent of detections
        if (onDetection && frame.detections.length > 0) {
          frame.detections.forEach(detection => onDetection(detection));
        }
      },
      onStatusChange: (status: ConnectionStatus) => {
        if (onConnectionChange) {
          onConnectionChange(status);
        }
        
        if (status === 'connected') {
          setError(null);
          setIsLoading(true);
        } else if (status === 'disconnected') {
          setIsLoading(false);
        }
      },
      onError: (errorMsg: string) => {
        setError(errorMsg);
        setIsLoading(false);
      },
    });

    wsManagerRef.current = wsManager;

    // Connect to WebSocket
    wsManager.connect().catch((err) => {
      console.error('Failed to connect:', err);
      setError('Failed to connect to camera feed');
      setIsLoading(false);
    });

    // Cleanup on unmount
    return () => {
      wsManager.disconnect();
      wsManagerRef.current = null;
    };
  }, [wsUrl, onDetection, onConnectionChange]);

  /**
   * Render video frame with detection overlays
   */
  const renderFrame = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    frame: VideoFrame
  ) => {
    const img = new Image();
    
    img.onload = () => {
      // Resize canvas to match image dimensions
      if (canvas.width !== img.width || canvas.height !== img.height) {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      // Draw the video frame
      ctx.drawImage(img, 0, 0);

      // Draw detection overlays
      frame.detections.forEach((detection) => {
        drawDetection(ctx, detection, cameraType);
      });
    };

    img.onerror = () => {
      console.error('Failed to load frame image');
    };

    // Set image source (base64 encoded)
    img.src = frame.frame.startsWith('data:') 
      ? frame.frame 
      : `data:image/jpeg;base64,${frame.frame}`;
  };

  /**
   * Draw detection bounding box and label
   */
  const drawDetection = (
    ctx: CanvasRenderingContext2D,
    detection: Detection,
    cameraType: 'gate' | 'lot'
  ) => {
    const { bbox, label, confidence, type, status } = detection;

    // Determine color based on detection type and status
    let color: string;
    if (cameraType === 'gate' || type === 'plate') {
      // Blue for license plates
      color = '#3B82F6';
    } else if (status === 'empty') {
      // Green for empty slots
      color = '#10B981';
    } else if (status === 'occupied') {
      // Red for occupied slots
      color = '#EF4444';
    } else {
      // Default gray
      color = '#6B7280';
    }

    // Draw bounding box
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(
      bbox.x1,
      bbox.y1,
      bbox.x2 - bbox.x1,
      bbox.y2 - bbox.y1
    );

    // Draw label background
    if (label) {
      const labelText = `${label} (${Math.round(confidence * 100)}%)`;
      ctx.font = '14px sans-serif';
      const textMetrics = ctx.measureText(labelText);
      const textWidth = textMetrics.width;
      const textHeight = 20;
      const padding = 4;

      // Position label above bounding box
      const labelX = bbox.x1;
      const labelY = bbox.y1 - textHeight - padding;

      // Draw label background
      ctx.fillStyle = color;
      ctx.fillRect(
        labelX,
        labelY,
        textWidth + padding * 2,
        textHeight
      );

      // Draw label text
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(labelText, labelX + padding, labelY + textHeight - padding);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain bg-black"
        style={{ maxHeight: '100vh' }}
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Connecting to camera feed...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <div className="text-white text-center p-6 bg-red-600 rounded-lg">
            <p className="font-semibold mb-2">Connection Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
