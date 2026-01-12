# Error Handling and Validation Guide

This guide explains how to use the centralized error handling and validation system in the Smart Parking Next.js Application.

## Overview

The error handling system consists of three main components:

1. **Zod Schemas** (`lib/schemas.ts`) - Centralized validation schemas for all API inputs
2. **Error Logger** (`lib/logger.ts`) - Structured logging with error ID generation
3. **Error Handler** (`lib/api-error-handler.ts`) - Middleware for catching and formatting errors

## Requirements Addressed

- **13.5**: Validate all data using Zod schemas before database operations
- **14.1**: Return 400 Bad Request with validation errors for invalid data
- **14.2**: Return 401 Unauthorized for unauthenticated requests
- **14.3**: Return 403 Forbidden for insufficient permissions
- **14.4**: Return 404 Not Found for missing resources
- **14.5**: Return 500 Internal Server Error with error ID
- **14.6**: Use Zod for request body validation
- **14.7**: Log all errors with stack traces for debugging

## Using Zod Schemas

### Import Schemas

```typescript
import {
  createParkingLotSchema,
  updateParkingLotSchema,
  parkingLotQuerySchema,
  // ... other schemas
} from '@/lib/schemas';
```

### Available Schemas

**Parking Lots:**
- `createParkingLotSchema` - For POST /api/parking-lots
- `updateParkingLotSchema` - For PUT /api/parking-lots/[id]
- `initializeSlotsSchema` - For POST /api/parking-lots/[id]/initialize-slots
- `parkingLotQuerySchema` - For GET /api/parking-lots query params

**Contractors:**
- `createContractorSchema` - For POST /api/contractors
- `updateContractorSchema` - For PUT /api/contractors/[id]
- `contractorQuerySchema` - For GET /api/contractors query params

**Vehicle Records:**
- `createEntryRecordSchema` - For POST /api/records/entry
- `createExitRecordSchema` - For POST /api/records/exit
- `vehicleRecordQuerySchema` - For GET /api/records query params

**Capacity:**
- `capacityUpdateSchema` - For POST /api/capacity/update
- `capacityHistoryQuerySchema` - For GET /api/capacity/history query params

**Violations:**
- `acknowledgeViolationSchema` - For PUT /api/violations/[id]/acknowledge
- `resolveViolationSchema` - For PUT /api/violations/[id]/resolve
- `violationQuerySchema` - For GET /api/violations query params

**Alerts:**
- `acknowledgeAlertSchema` - For PUT /api/alerts/[id]/acknowledge
- `alertQuerySchema` - For GET /api/alerts query params

**Analytics:**
- `occupancyTrendsQuerySchema` - For GET /api/analytics/occupancy-trends
- `peakHoursQuerySchema` - For GET /api/analytics/peak-hours

## Using Error Handler

### Method 1: withErrorHandling Wrapper (Recommended)

Wrap your entire route handler with `withErrorHandling`:

```typescript
import { NextRequest } from 'next/server';
import { withErrorHandling, validateRequestBody } from '@/lib/api-error-handler';
import { requireAdmin, successResponse } from '@/lib/api-helpers';
import { createParkingLotSchema } from '@/lib/schemas';

export const POST = withErrorHandling(async (request: NextRequest) => {
  // All errors thrown here will be automatically caught and formatted
  await requireAdmin();
  const data = await validateRequestBody(request, createParkingLotSchema);
  
  // Your business logic here
  const result = await createParkingLot(data);
  
  return successResponse(result, 'Created successfully', 201);
});
```

### Method 2: Manual Error Handling

Use `handleApiError` in a try-catch block:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, validateRequestBody } from '@/lib/api-error-handler';
import { createParkingLotSchema } from '@/lib/schemas';

export async function POST(request: NextRequest) {
  try {
    const data = await validateRequestBody(request, createParkingLotSchema);
    // Your logic here
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, { route: 'POST /api/parking-lots' });
  }
}
```

## Custom Error Classes

Throw specific error types for different scenarios:

```typescript
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} from '@/lib/api-error-handler';

// 400 - Validation Error
throw new ValidationError('Invalid input', { field: 'email' });

// 401 - Authentication Error
throw new AuthenticationError('Please log in');

// 403 - Authorization Error
throw new AuthorizationError('Admin role required');

// 404 - Not Found Error
throw new NotFoundError('Parking lot', parkingLotId);

// 409 - Conflict Error
throw new ConflictError('Email already exists');

// 500 - Internal Server Error
throw new InternalServerError('Database connection failed');
```

## Validation Helpers

### Validate Request Body

```typescript
import { validateRequestBody } from '@/lib/api-error-handler';
import { createParkingLotSchema } from '@/lib/schemas';

const data = await validateRequestBody(request, createParkingLotSchema);
// data is now typed and validated
```

### Validate Query Parameters

```typescript
import { validateQueryParams } from '@/lib/api-error-handler';
import { parkingLotQuerySchema } from '@/lib/schemas';

const query = validateQueryParams(
  request.nextUrl.searchParams,
  parkingLotQuerySchema
);
// query is now typed and validated
```

### Ensure Resource Exists

```typescript
import { ensureExists } from '@/lib/api-error-handler';

const parkingLot = await ParkingLot.findById(id);
ensureExists(parkingLot, 'Parking lot', id);
// Throws NotFoundError if parkingLot is null
```

## Using the Logger

### Import Logger

```typescript
import { logger } from '@/lib/logger';
```

### Log Levels

```typescript
// Error - Critical errors requiring immediate attention
const errorId = logger.error('Failed to create record', error, {
  userId: user.id,
  operation: 'create',
});

// Warning - Warning conditions that should be reviewed
logger.warn('High occupancy detected', {
  parkingLotId: lot.id,
  occupancy: 95,
});

// Info - Informational messages about system operation
logger.info('User logged in', { userId: user.id });

// Debug - Detailed debugging information (development only)
logger.debug('Processing capacity update', { data });
```

### Specialized Logging Methods

```typescript
// Log API requests
logger.logRequest('POST', '/api/parking-lots', { userId: user.id });

// Log API responses
logger.logResponse('POST', '/api/parking-lots', 201, { parkingLotId: lot.id });

// Log database operations
logger.logDbOperation('create', 'ParkingLot', { name: lot.name });

// Log WebSocket events
logger.logWebSocketEvent('capacity_update', { parkingLotId: lot.id });
```

## Complete Example

Here's a complete example of an API route using all the error handling features:

```typescript
import { NextRequest } from 'next/server';
import {
  withErrorHandling,
  validateRequestBody,
  validateQueryParams,
  ensureExists,
  NotFoundError,
} from '@/lib/api-error-handler';
import { requireAdmin, successResponse, paginatedResponse } from '@/lib/api-helpers';
import { createParkingLotSchema, parkingLotQuerySchema } from '@/lib/schemas';
import { logger } from '@/lib/logger';
import ParkingLot from '@/models/ParkingLot';
import dbConnect from '@/lib/mongodb';

// POST - Create parking lot
export const POST = withErrorHandling(async (request: NextRequest) => {
  // 1. Authenticate and authorize
  const session = await requireAdmin();
  
  // 2. Connect to database
  await dbConnect();
  
  // 3. Validate request body
  const data = await validateRequestBody(request, createParkingLotSchema);
  
  // 4. Log the operation
  logger.info('Creating parking lot', {
    userId: session.user.id,
    name: data.name,
  });
  
  // 5. Create the resource
  const parkingLot = await ParkingLot.create({
    ...data,
    gateCamera: {
      id: `gate_${Date.now()}`,
      status: 'active',
      lastSeen: new Date(),
    },
    lotCamera: {
      id: `lot_${Date.now()}`,
      status: 'active',
      lastSeen: new Date(),
    },
    slots: [],
    status: 'active',
  });
  
  // 6. Return success response
  return successResponse(parkingLot, 'Parking lot created successfully', 201);
});

// GET - List parking lots
export const GET = withErrorHandling(async (request: NextRequest) => {
  // 1. Authenticate
  await requireAuth();
  
  // 2. Connect to database
  await dbConnect();
  
  // 3. Validate query parameters
  const query = validateQueryParams(
    request.nextUrl.searchParams,
    parkingLotQuerySchema
  );
  
  // 4. Fetch data with pagination
  const filter = query.status ? { status: query.status } : {};
  const [parkingLots, total] = await Promise.all([
    ParkingLot.find(filter)
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    ParkingLot.countDocuments(filter),
  ]);
  
  // 5. Return paginated response
  return paginatedResponse(parkingLots, query.page, query.limit, total);
});

// DELETE - Soft delete parking lot
export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  // 1. Authenticate and authorize
  const session = await requireAdmin();
  
  // 2. Connect to database
  await dbConnect();
  
  // 3. Find resource and ensure it exists
  const parkingLot = await ParkingLot.findById(params.id);
  ensureExists(parkingLot, 'Parking lot', params.id);
  
  // 4. Log the operation
  logger.info('Deleting parking lot', {
    userId: session.user.id,
    parkingLotId: params.id,
  });
  
  // 5. Perform soft delete
  parkingLot.status = 'inactive';
  await parkingLot.save();
  
  // 6. Return success response
  return successResponse(parkingLot, 'Parking lot deleted successfully');
});
```

## Error Response Formats

### Validation Error (400)

```json
{
  "error": "Validation failed",
  "message": "Request validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "totalSlots",
      "message": "Must be a positive number"
    }
  ]
}
```

### Authentication Error (401)

```json
{
  "error": "Authentication required",
  "message": "Please log in to access this resource"
}
```

### Authorization Error (403)

```json
{
  "error": "Insufficient permissions",
  "message": "Admin role required for this operation"
}
```

### Not Found Error (404)

```json
{
  "error": "Resource not found",
  "message": "Parking lot with ID '507f1f77bcf86cd799439011' not found"
}
```

### Conflict Error (409)

```json
{
  "error": "Conflict",
  "message": "Duplicate email: A record with this email already exists",
  "details": {
    "field": "email"
  }
}
```

### Internal Server Error (500)

```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred. Please try again later.",
  "errorId": "err_abc123xyz"
}
```

## Best Practices

1. **Always use `withErrorHandling`** - Wrap all route handlers for consistent error handling
2. **Validate early** - Validate inputs before performing any business logic
3. **Use specific error types** - Throw appropriate error classes for different scenarios
4. **Log context** - Include relevant context when logging errors
5. **Don't expose internals** - Never expose database errors or stack traces to clients
6. **Use error IDs** - Error IDs help track and debug issues in production
7. **Consistent responses** - Use helper functions for consistent response formats

## Migration Guide

To migrate existing API routes to use the new error handling system:

1. Import the error handling utilities
2. Wrap the handler with `withErrorHandling`
3. Replace inline validation with `validateRequestBody` or `validateQueryParams`
4. Replace manual error responses with error classes
5. Add logging for important operations
6. Use helper functions for consistent responses

### Before

```typescript
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.issues },
        { status: 400 }
      );
    }
    
    // Business logic...
    
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### After

```typescript
export const POST = withErrorHandling(async (request: NextRequest) => {
  await requireAdmin();
  const data = await validateRequestBody(request, schema);
  
  // Business logic...
  
  return successResponse(result, 'Created successfully', 201);
});
```

## Testing Error Handling

When writing tests, you can test error scenarios by checking the response format:

```typescript
import { POST } from './route';

test('returns 400 for invalid input', async () => {
  const request = new NextRequest('http://localhost/api/test', {
    method: 'POST',
    body: JSON.stringify({ invalid: 'data' }),
  });
  
  const response = await POST(request);
  expect(response.status).toBe(400);
  
  const body = await response.json();
  expect(body.error).toBe('Validation failed');
  expect(body.details).toBeDefined();
});
```
