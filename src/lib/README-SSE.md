# Server-Sent Events (SSE) Implementation

This directory contains the implementation of Server-Sent Events for real-time dashboard updates in the Smart Parking Management System.

## Overview

The SSE implementation provides real-time updates to connected clients for:
- **Capacity Updates**: Real-time parking lot occupancy changes
- **Alerts**: System alerts for capacity warnings, breaches, and camera issues
- **Violations**: Contractor capacity violations
- **Vehicle Events**: Entry and exit events from gate monitoring

## Architecture

### Server-Side Components

#### 1. SSE Manager (`sse-manager.ts`)
- Singleton service that manages all SSE client connections
- Maintains a registry of connected clients
- Provides methods to broadcast events to all clients
- Handles client disconnections and cleanup
- Sends periodic ping messages to keep connections alive

**Key Methods:**
- `addClient(id, controller)`: Register a new client connection
- `removeClient(id)`: Remove a disconnected client
- `broadcast(event)`: Send event to all connected clients
- `broadcastCapacityUpdate(data)`: Broadcast capacity update
- `broadcastAlert(data)`: Broadcast new alert
- `broadcastViolation(data)`: Broadcast new violation

#### 2. SSE Endpoint (`/api/sse/dashboard/route.ts`)
- Next.js API route that handles SSE connections
- Creates a ReadableStream for each client
- Registers clients with the SSE Manager
- Handles client disconnections via abort signal
- Returns proper SSE headers (Content-Type: text/event-stream)

#### 3. Integration Points
The SSE Manager is integrated into:
- **Capacity Update API** (`/api/capacity/update/route.ts`): Broadcasts capacity changes
- **Lot Monitor Handler** (`lot-monitor-handler.ts`): Broadcasts real-time capacity updates from Python backend
- **Gate Monitor Handler** (`gate-monitor-handler.ts`): Broadcasts vehicle entry/exit events

### Client-Side Components

#### SSE Client (`sse-client.ts`)
- Client-side utility for connecting to SSE endpoint
- Uses native EventSource API
- Provides type-safe event handling
- Implements automatic reconnection with exponential backoff
- Supports multiple event listeners per event type

**Key Methods:**
- `connect()`: Establish connection to SSE endpoint
- `disconnect()`: Close connection
- `on(eventType, callback)`: Register event listener
- `off(eventType, callback)`: Unregister event listener
- `onCapacityUpdate(callback)`: Convenience method for capacity updates
- `onAlert(callback)`: Convenience method for alerts
- `onViolation(callback)`: Convenience method for violations

## Usage

### Server-Side: Broadcasting Events

```typescript
import { getSSEManager } from '@/lib/sse-manager';

// Get the SSE manager instance
const sseManager = getSSEManager();

// Broadcast capacity update
sseManager.broadcastCapacityUpdate({
  parkingLotId: 'lot_123',
  totalSlots: 100,
  occupied: 75,
  empty: 25,
  occupancyRate: 0.75,
  timestamp: new Date(),
});

// Broadcast alert
sseManager.broadcastAlert({
  _id: 'alert_456',
  type: 'capacity_warning',
  severity: 'medium',
  parkingLotId: 'lot_123',
  message: 'Parking lot is 90% full',
  status: 'active',
  createdAt: new Date(),
});

// Broadcast violation
sseManager.broadcastViolation({
  _id: 'violation_789',
  contractorId: 'contractor_123',
  parkingLotId: 'lot_123',
  violationType: 'capacity_breach',
  timestamp: new Date(),
  details: {
    allocatedCapacity: 50,
    actualOccupancy: 60,
    excessVehicles: 10,
    duration: 0,
  },
  penalty: 5000,
  status: 'pending',
});
```

### Client-Side: Receiving Events

```typescript
'use client';

import { useEffect, useState } from 'react';
import { createSSEClient } from '@/lib/sse-client';

export function DashboardComponent() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Create SSE client
    const sseClient = createSSEClient();

    // Handle connection
    sseClient.onConnected((data) => {
      console.log('Connected:', data.clientId);
      setIsConnected(true);
    });

    // Handle capacity updates
    sseClient.onCapacityUpdate((data) => {
      console.log('Capacity update:', data);
      // Update UI with new capacity data
    });

    // Handle alerts
    sseClient.onAlert((data) => {
      console.log('New alert:', data);
      // Show alert notification
    });

    // Handle violations
    sseClient.onViolation((data) => {
      console.log('New violation:', data);
      // Update violations list
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
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      {/* Dashboard UI */}
    </div>
  );
}
```

## Event Types

### Capacity Update Event
```typescript
{
  type: 'capacity_update',
  data: {
    parkingLotId: string;
    totalSlots: number;
    occupied: number;
    empty: number;
    occupancyRate: number;
    timestamp: Date;
    // Optional fields for gate events
    event?: 'vehicle_entry' | 'vehicle_exit';
    plateNumber?: string;
    duration?: number;
  }
}
```

### Alert Event
```typescript
{
  type: 'alert',
  data: {
    _id: string;
    type: 'capacity_warning' | 'capacity_breach' | 'camera_offline' | 'violation_detected';
    severity: 'low' | 'medium' | 'high' | 'critical';
    parkingLotId: string;
    contractorId?: string;
    message: string;
    status: 'active' | 'acknowledged' | 'resolved';
    createdAt: Date;
  }
}
```

### Violation Event
```typescript
{
  type: 'violation',
  data: {
    _id: string;
    contractorId: string;
    parkingLotId: string;
    violationType: 'overparking' | 'unauthorized_vehicle' | 'capacity_breach';
    timestamp: Date;
    details: {
      allocatedCapacity: number;
      actualOccupancy: number;
      excessVehicles: number;
      duration: number;
    };
    penalty: number;
    status: 'pending' | 'acknowledged' | 'resolved';
  }
}
```

### Ping Event
```typescript
{
  type: 'ping',
  data: {
    timestamp: Date;
  }
}
```

## Connection Management

### Automatic Reconnection
The SSE client implements automatic reconnection with exponential backoff:
- Initial delay: 2 seconds
- Maximum attempts: 5
- Backoff strategy: Exponential (2s, 4s, 8s, 16s, 32s)

### Keep-Alive
The server sends ping events every 30 seconds to keep connections alive and detect disconnected clients.

### Client Cleanup
When a client disconnects:
1. The abort signal is triggered
2. The SSE Manager removes the client from the registry
3. The ReadableStream controller is closed
4. Resources are cleaned up

## Testing

### Manual Testing
1. Start the Next.js development server
2. Open the browser console
3. Navigate to a page that uses the SSE client
4. Trigger events (capacity updates, alerts, violations)
5. Verify events are received in the console

### Integration Testing
```typescript
// Test SSE endpoint
const response = await fetch('/api/sse/dashboard');
expect(response.headers.get('content-type')).toBe('text/event-stream');

// Test SSE Manager
const sseManager = getSSEManager();
sseManager.broadcastCapacityUpdate({ /* data */ });
// Verify clients receive the event
```

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 4.6**: System broadcasts capacity updates to all connected dashboard clients in real-time
- **Requirement 7.5**: System broadcasts new alerts to all connected dashboard clients in real-time
- **Requirement 10.2**: Dashboard updates capacity displays within 2 seconds when capacity updates are received

## Performance Considerations

- **Memory**: Each connected client maintains a small amount of memory for the controller and metadata
- **Network**: SSE uses HTTP/1.1 long-polling, which is efficient for server-to-client communication
- **Scalability**: For high-traffic scenarios, consider using Redis pub/sub to coordinate across multiple server instances
- **Browser Limits**: Browsers typically limit 6 concurrent connections per domain (SSE counts as one)

## Future Enhancements

1. **Redis Integration**: Use Redis pub/sub for multi-instance deployments
2. **Event Filtering**: Allow clients to subscribe to specific parking lots or event types
3. **Event History**: Send recent events to newly connected clients
4. **Compression**: Enable gzip compression for SSE responses
5. **Authentication**: Add authentication to SSE endpoint for security
