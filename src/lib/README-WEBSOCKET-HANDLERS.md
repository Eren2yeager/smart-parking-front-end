# WebSocket Handlers for Python Backend Integration

This directory contains the WebSocket client and handlers for integrating with the Python AI/ML backend.

## Components

### 1. PythonBackendClient (`python-backend-client.ts`)

A server-side WebSocket client that manages connections to the Python backend.

**Features:**
- Separate connections for gate monitoring and lot monitoring
- Automatic reconnection with exponential backoff
- Connection error handling
- Event-based callbacks for detections

**Usage:**
```typescript
import { PythonBackendClient } from '@/lib/python-backend-client';

const client = new PythonBackendClient({
  url: 'ws://localhost:8000',
  maxReconnectAttempts: 10,
  reconnectDelay: 1000,
});

// Register callbacks
client.onPlateDetection((data) => {
  console.log('Plate detected:', data);
});

client.onCapacityUpdate((data) => {
  console.log('Capacity update:', data);
});

// Connect to endpoints
await client.connectGateMonitor('parking-lot-id');
await client.connectLotMonitor('parking-lot-id');

// Disconnect when done
client.disconnectAll();
```

### 2. GateMonitorHandler (`gate-monitor-handler.ts`)

Server-side handler that processes license plate detections from the Python backend.

**Features:**
- Listens for plate detections via WebSocket
- Creates vehicle entry records
- Updates vehicle exit records
- Calculates parking duration
- Updates camera status

**Usage:**
```typescript
import { startGateMonitor, stopGateMonitor } from '@/lib/gate-monitor-handler';

// Start monitoring for a specific parking lot
await startGateMonitor('parking-lot-id');

// Stop monitoring
stopGateMonitor();
```

**What it does:**
1. Receives plate detections from Python backend
2. Checks if plate already has an active entry record
3. If no entry exists → Creates new entry record
4. If entry exists → Updates with exit information and calculates duration
5. Updates gate camera last seen timestamp

### 3. LotMonitorHandler (`lot-monitor-handler.ts`)

Server-side handler that processes parking capacity updates from the Python backend.

**Features:**
- Listens for capacity updates via WebSocket
- Creates capacity logs
- Updates parking lot slot statuses
- Detects violations (occupancy > allocated capacity)
- Creates alerts for capacity warnings and breaches
- Updates camera status

**Usage:**
```typescript
import { startLotMonitor, stopLotMonitor } from '@/lib/lot-monitor-handler';

// Start monitoring for a specific parking lot
await startLotMonitor('parking-lot-id');

// Stop monitoring
stopLotMonitor();
```

**What it does:**
1. Receives capacity updates from Python backend
2. Creates CapacityLog entry with timestamp and slot data
3. Updates ParkingLot slots array with current status
4. Checks if occupancy exceeds contractor's allocated capacity
5. If violation detected → Creates Violation record and Alert
6. Checks if occupancy > 90% → Creates capacity warning Alert
7. Updates lot camera last seen timestamp

## Environment Variables

Add to `.env.local`:
```
NEXT_PUBLIC_PYTHON_BACKEND_URL=ws://localhost:8000
```

## Integration with Next.js

These handlers are designed to run on the server-side. You can start them:

1. **In API routes** - Start handlers when specific endpoints are called
2. **In server components** - Start handlers during server-side rendering
3. **In background services** - Create a separate Node.js process that runs the handlers

### Example: Starting handlers in an API route

```typescript
// app/api/monitoring/start/route.ts
import { NextResponse } from 'next/server';
import { startGateMonitor } from '@/lib/gate-monitor-handler';
import { startLotMonitor } from '@/lib/lot-monitor-handler';

export async function POST(request: Request) {
  const { parkingLotId } = await request.json();
  
  try {
    await startGateMonitor(parkingLotId);
    await startLotMonitor(parkingLotId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to start monitoring' }, { status: 500 });
  }
}
```

## Data Flow

### Entry Detection Flow
```
Camera → Python Backend → WebSocket → GateMonitorHandler
                                          ↓
                                    Check if plate exists
                                          ↓
                                    Create VehicleRecord
                                          ↓
                                    Save to MongoDB
```

### Capacity Update Flow
```
Camera → Python Backend → WebSocket → LotMonitorHandler
                                          ↓
                                    Create CapacityLog
                                          ↓
                                    Update ParkingLot slots
                                          ↓
                                    Check occupancy vs allocated
                                          ↓
                                    If violation → Create Violation + Alert
```

## Error Handling

All handlers include:
- Automatic reconnection with exponential backoff
- Error logging to console
- Graceful degradation on connection failures
- Database error handling

## Next Steps

To complete the real-time system:
1. Implement Server-Sent Events (SSE) for broadcasting updates to clients
2. Create API endpoints for starting/stopping monitors
3. Add monitoring dashboard to show connection status
4. Implement camera offline detection (no data for > 5 minutes)
