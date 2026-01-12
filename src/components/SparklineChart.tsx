'use client';

import { useEffect, useRef } from 'react';
import { theme } from '@/lib/theme';

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  lineWidth?: number;
  showDots?: boolean;
}

export default function SparklineChart({
  data,
  width = 100,
  height = 30,
  color = theme.colors.primary[500],
  lineWidth = 2,
  showDots = false,
}: SparklineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate min and max values
    const minValue = Math.min(...data);
    const maxValue = Math.max(...data);
    const range = maxValue - minValue || 1; // Avoid division by zero

    // Calculate points
    const points: { x: number; y: number }[] = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const normalizedValue = (value - minValue) / range;
      const y = height - normalizedValue * height;
      return { x, y };
    });

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });

    ctx.stroke();

    // Draw dots if enabled
    if (showDots) {
      points.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, lineWidth * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
    }

    // Draw area fill (optional gradient)
    ctx.globalAlpha = 0.1;
    ctx.beginPath();
    ctx.moveTo(points[0].x, height);
    points.forEach((point) => {
      ctx.lineTo(point.x, point.y);
    });
    ctx.lineTo(points[points.length - 1].x, height);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 1;
  }, [data, width, height, color, lineWidth, showDots]);

  if (data.length === 0) {
    return (
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.neutral[100],
          borderRadius: theme.borderRadius.sm,
        }}
      >
        <span
          style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.text.secondary,
          }}
        >
          No data
        </span>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        display: 'block',
      }}
    />
  );
}
