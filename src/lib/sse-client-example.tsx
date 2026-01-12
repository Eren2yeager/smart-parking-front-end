/**
 * Example usage of SSE Client in a React component
 * 
 * This is a reference implementation showing how to use the SSE client
 * in a Next.js client component for real-time dashboard updates.
 */

'use client';

import { useEffect, useState } from 'react';
import { createSSEClient, CapacityUpdateEvent, AlertEvent, ViolationEvent } from './sse-client';

export function DashboardWithSSE() {
  const [capacityUpdates, setCapacityUpdates] = useState<CapacityUpdateEvent[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [violations, setViolations] = useState<ViolationEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Create SSE client
    const sseClient = createSSEClient();

    // Register event handlers
    sseClient.onConnected((data) => {
      console.log('Connected to SSE:', data);
      setIsConnected(true);
    });

    sseClient.onCapacityUpdate((data) => {
      console.log('Capacity update:', data);
      setCapacityUpdates((prev) => [data, ...prev].slice(0, 10)); // Keep last 10
    });

    sseClient.onAlert((data) => {
      console.log('New alert:', data);
      setAlerts((prev) => [data, ...prev].slice(0, 10)); // Keep last 10
    });

    sseClient.onViolation((data) => {
      console.log('New violation:', data);
      setViolations((prev) => [data, ...prev].slice(0, 10)); // Keep last 10
    });

    // Connect to SSE endpoint
    sseClient.connect();

    // Cleanup on unmount
    return () => {
      sseClient.disconnect();
      setIsConnected(false);
    };
  }, []);

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold">Real-time Dashboard</h2>
        <p className="text-sm text-gray-600">
          Connection status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Capacity Updates */}
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-2">Capacity Updates</h3>
          <div className="space-y-2">
            {capacityUpdates.length === 0 ? (
              <p className="text-sm text-gray-500">No updates yet</p>
            ) : (
              capacityUpdates.map((update, index) => (
                <div key={index} className="text-sm border-b pb-2">
                  <p>Lot: {update.parkingLotId}</p>
                  {update.occupied !== undefined && (
                    <p>Occupancy: {update.occupied}/{update.totalSlots}</p>
                  )}
                  {update.event && <p>Event: {update.event}</p>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-2">Alerts</h3>
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <p className="text-sm text-gray-500">No alerts yet</p>
            ) : (
              alerts.map((alert, index) => (
                <div key={index} className="text-sm border-b pb-2">
                  <p className="font-medium">{alert.type}</p>
                  <p className="text-xs">{alert.message}</p>
                  <p className="text-xs text-gray-500">Severity: {alert.severity}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Violations */}
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-2">Violations</h3>
          <div className="space-y-2">
            {violations.length === 0 ? (
              <p className="text-sm text-gray-500">No violations yet</p>
            ) : (
              violations.map((violation, index) => (
                <div key={index} className="text-sm border-b pb-2">
                  <p className="font-medium">{violation.violationType}</p>
                  <p className="text-xs">
                    Excess: {violation.details.excessVehicles} vehicles
                  </p>
                  <p className="text-xs text-gray-500">
                    Penalty: ${violation.penalty}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
