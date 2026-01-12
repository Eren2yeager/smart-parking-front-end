'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { theme } from '@/lib/theme';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface ParkingLotLocation {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  occupancy: number;
  totalSlots: number;
}

interface MapViewProps {
  parkingLots: ParkingLotLocation[];
  onMarkerClick?: (lotId: string) => void;
}

export default function MapView({ parkingLots, onMarkerClick }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    // Initialize map only once
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map centered on first parking lot or default location
    const defaultCenter: [number, number] = parkingLots.length > 0
      ? [parkingLots[0].location.lat, parkingLots[0].location.lng]
      : [28.6139, 77.2090]; // Delhi, India default

    const map = L.map(mapContainerRef.current).setView(defaultCenter, 12);

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (parkingLots.length === 0) return;

    // Add markers for each parking lot
    const bounds = L.latLngBounds([]);

    parkingLots.forEach((lot) => {
      const { lat, lng } = lot.location;
      const occupancyRate = lot.totalSlots > 0 
        ? Math.round((lot.occupancy / lot.totalSlots) * 100) 
        : 0;

      // Create custom icon based on occupancy
      const iconColor = occupancyRate >= 90 
        ? theme.colors.error[500] 
        : occupancyRate >= 70 
        ? theme.colors.warning[500] 
        : theme.colors.success[500];

      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background-color: ${iconColor};
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="
              transform: rotate(45deg);
              color: white;
              font-weight: bold;
              font-size: 12px;
            ">${occupancyRate}%</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      const marker = L.marker([lat, lng], { icon: customIcon })
        .addTo(mapRef.current!)
        .bindPopup(`
          <div style="font-family: ${theme.typography.fontFamily.sans}; min-width: 200px;">
            <h3 style="
              font-size: ${theme.typography.fontSize.base};
              font-weight: ${theme.typography.fontWeight.bold};
              color: ${theme.colors.text.primary};
              margin: 0 0 ${theme.spacing[2]} 0;
            ">${lot.name}</h3>
            <div style="
              font-size: ${theme.typography.fontSize.sm};
              color: ${theme.colors.text.secondary};
              margin-bottom: ${theme.spacing[2]};
            ">
              <div style="margin-bottom: ${theme.spacing[1]};">
                <strong>Occupancy:</strong> ${lot.occupancy} / ${lot.totalSlots} slots
              </div>
              <div style="margin-bottom: ${theme.spacing[1]};">
                <strong>Rate:</strong> ${occupancyRate}%
              </div>
            </div>
            <div style="
              width: 100%;
              height: 8px;
              background-color: ${theme.colors.neutral[200]};
              border-radius: ${theme.borderRadius.full};
              overflow: hidden;
            ">
              <div style="
                width: ${occupancyRate}%;
                height: 100%;
                background-color: ${iconColor};
                transition: width ${theme.transitions.duration.base} ${theme.transitions.timing.ease};
              "></div>
            </div>
          </div>
        `);

      // Add click handler
      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(lot.id));
      }

      markersRef.current.push(marker);
      bounds.extend([lat, lng]);
    });

    // Fit map to show all markers
    if (parkingLots.length > 1) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else if (parkingLots.length === 1) {
      mapRef.current.setView(
        [parkingLots[0].location.lat, parkingLots[0].location.lng],
        14
      );
    }
  }, [parkingLots, onMarkerClick]);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900">Parking Lots Map</h3>
        <p className="text-sm text-gray-600 mt-1">
          {parkingLots.length} location{parkingLots.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div 
        ref={mapContainerRef} 
        className="w-full h-[400px] md:h-[500px]"
        style={{ zIndex: 0 }}
      />
    </div>
  );
}
