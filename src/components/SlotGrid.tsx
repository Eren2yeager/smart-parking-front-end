'use client';

import { useEffect, useState } from 'react';
import { Car, Square } from 'lucide-react';
import { useIsMobile, useIsTablet } from '@/lib/responsive-utils';

interface Slot {
  slotId: number;
  bbox: { x1: number; y1: number; x2: number; y2: number };
  status: 'occupied' | 'empty';
  lastUpdated: string;
}

interface SlotGridProps {
  slots: Slot[];
  totalSlots: number;
}

export default function SlotGrid({ slots, totalSlots }: SlotGridProps) {
  const [displaySlots, setDisplaySlots] = useState<Slot[]>(slots);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  useEffect(() => {
    setDisplaySlots(slots);
  }, [slots]);

  // Calculate occupancy percentage
  const occupiedCount = displaySlots.filter((s) => s.status === 'occupied').length;
  const occupancyPercentage = totalSlots > 0 ? (occupiedCount / totalSlots) * 100 : 0;

  // If no slots are initialized yet, show placeholder
  if (slots.length === 0) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 md:p-12 text-center">
        <Square className="w-8 h-8 md:w-12 md:h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-sm md:text-base text-gray-600 mb-2">Parking slots not initialized</p>
        <p className="text-xs md:text-sm text-gray-500">
          Slots will appear once the first capacity detection is received from the camera
        </p>
      </div>
    );
  }

  // Calculate grid dimensions - adjust for mobile
  const baseSlotsPerRow = Math.ceil(Math.sqrt(totalSlots));
  const slotsPerRow = isMobile 
    ? Math.min(baseSlotsPerRow, 6) // Max 6 columns on mobile
    : isTablet 
    ? Math.min(baseSlotsPerRow, 8) // Max 8 columns on tablet
    : baseSlotsPerRow;
  const rows = Math.ceil(totalSlots / slotsPerRow);

  // Create a map of slot statuses for quick lookup
  const slotStatusMap = new Map<number, Slot>();
  displaySlots.forEach((slot) => {
    slotStatusMap.set(slot.slotId, slot);
  });

  // Generate grid cells
  const gridCells = [];
  for (let i = 1; i <= totalSlots; i++) {
    const slot = slotStatusMap.get(i);
    gridCells.push({
      slotId: i,
      status: slot?.status || 'empty',
      lastUpdated: slot?.lastUpdated,
    });
  }

  const formatLastUpdated = (timestamp: string | undefined) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-4">
      {/* Occupancy Percentage Display */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-sm text-gray-600">Occupancy Rate</p>
          <p className="text-2xl font-bold text-gray-900">{occupancyPercentage.toFixed(1)}%</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Occupied / Total</p>
          <p className="text-lg font-semibold text-gray-900">
            {occupiedCount} / {totalSlots}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 md:gap-6 text-xs md:text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 md:w-4 md:h-4 bg-green-500 rounded"></div>
          <span className="text-gray-700">Empty</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded"></div>
          <span className="text-gray-700">Occupied</span>
        </div>
      </div>

      {/* Grid */}
      <div className="relative">
        <div
          className="grid gap-1.5 md:gap-2"
          style={{
            gridTemplateColumns: `repeat(${slotsPerRow}, minmax(0, 1fr))`,
          }}
        >
          {gridCells.map((cell) => (
            <div
              key={cell.slotId}
              className={`
                relative aspect-square rounded-md md:rounded-lg border-2 transition-all duration-300
                flex items-center justify-center cursor-pointer
                ${
                  cell.status === 'occupied'
                    ? 'bg-red-100 border-red-300 hover:bg-red-200 hover:border-red-400'
                    : 'bg-green-100 border-green-300 hover:bg-green-200 hover:border-green-400'
                }
                ${hoveredSlot === cell.slotId ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
              `}
              onMouseEnter={() => setHoveredSlot(cell.slotId)}
              onMouseLeave={() => setHoveredSlot(null)}
            >
              {/* Slot Icon */}
              {cell.status === 'occupied' ? (
                <Car className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-red-700`} />
              ) : (
                <Square className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-green-700`} />
              )}

              {/* Slot Number */}
              <span
                className={`
                  absolute bottom-0.5 right-0.5 md:bottom-1 md:right-1 text-[10px] md:text-xs font-medium
                  ${cell.status === 'occupied' ? 'text-red-700' : 'text-green-700'}
                `}
              >
                {cell.slotId}
              </span>

              {/* Tooltip */}
              {hoveredSlot === cell.slotId && !isMobile && (
                <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
                  <div className="space-y-1">
                    <div className="font-semibold">Slot #{cell.slotId}</div>
                    <div className="capitalize">Status: {cell.status}</div>
                    <div>Updated: {formatLastUpdated(cell.lastUpdated)}</div>
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs md:text-sm text-gray-600 pt-4 border-t border-gray-200">
        <span>
          Total Slots: <span className="font-medium text-gray-900">{totalSlots}</span>
        </span>
        <div className="flex items-center gap-4">
          <span>
            Occupied:{' '}
            <span className="font-medium text-red-700">
              {displaySlots.filter((s) => s.status === 'occupied').length}
            </span>
          </span>
          <span>
            Empty:{' '}
            <span className="font-medium text-green-700">
              {displaySlots.filter((s) => s.status === 'empty').length}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
