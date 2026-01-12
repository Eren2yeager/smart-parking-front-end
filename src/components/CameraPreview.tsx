'use client';

import { useEffect, useRef } from 'react';
import { Detection } from '@/lib/webrtc-client';

interface CameraPreviewProps {
  stream: MediaStream | null;
  detections: Detection[];
  onFrame?: (frame: ImageData) => void;
}

/**
 * CameraPreview component displays camera feed with detection overlays
 * Requirements: 2.5
 */
export default function CameraPreview({ stream, detections, onFrame }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Setup video stream
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  // Draw detections on canvas overlay
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas size to video size
    canvas.width = video.videoWidth || video.clientWidth;
    canvas.height = video.videoHeight || video.clientHeight;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw each detection
    detections.forEach((detection) => {
      const { bbox, type, label, confidence, status } = detection;

      // Determine color based on detection type and status
      let color = '#3B82F6'; // blue for plates
      if (type === 'slot') {
        color = status === 'occupied' ? '#EF4444' : '#10B981'; // red for occupied, green for empty
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
      if (label || confidence) {
        const labelText = label
          ? `${label} (${Math.round(confidence * 100)}%)`
          : `${Math.round(confidence * 100)}%`;

        ctx.font = '14px sans-serif';
        const textMetrics = ctx.measureText(labelText);
        const textWidth = textMetrics.width;
        const textHeight = 20;

        // Background
        ctx.fillStyle = color;
        ctx.fillRect(bbox.x1, bbox.y1 - textHeight - 4, textWidth + 8, textHeight + 4);

        // Text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(labelText, bbox.x1 + 4, bbox.y1 - 8);
      }
    });

    // Call onFrame callback if provided
    if (onFrame && video.videoWidth > 0) {
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = video.videoWidth;
      frameCanvas.height = video.videoHeight;
      const frameCtx = frameCanvas.getContext('2d');
      if (frameCtx) {
        frameCtx.drawImage(video, 0, 0);
        const imageData = frameCtx.getImageData(0, 0, frameCanvas.width, frameCanvas.height);
        onFrame(imageData);
      }
    }
  }, [detections, onFrame]);

  return (
    <div className="relative w-full h-full bg-black">
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />

      {/* Canvas overlay for detections */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
      />

      {/* No stream placeholder */}
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-900/50 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-pulse">📹</div>
            <div className="text-lg text-purple-300">Camera preview will appear here</div>
          </div>
        </div>
      )}

      {/* Detection count indicator */}
      {stream && detections.length > 0 && (
        <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm font-medium backdrop-blur-sm">
          {detections.length} detection{detections.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
