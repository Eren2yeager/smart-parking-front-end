/**
 * Helper utilities for API routes demonstrating error handling usage
 * This file provides examples and reusable patterns for API development
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from './auth';
import {
  handleApiError,
  withErrorHandling,
  validateRequestBody,
  validateQueryParams,
  ensureExists,
  AuthorizationError,
  NotFoundError,
} from './api-error-handler';
import { logger } from './logger';

/**
 * Example: Require admin role for an operation
 */
export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== 'admin') {
    throw new AuthorizationError('Admin role required for this operation');
  }
  return session;
}

/**
 * Example: Require operator or admin role
 */
export async function requireOperatorOrAdmin() {
  const session = await requireAuth();
  if (session.user.role !== 'admin' && session.user.role !== 'operator') {
    throw new AuthorizationError('Operator or admin role required for this operation');
  }
  return session;
}

/**
 * Example: Log API request for debugging
 */
export function logApiRequest(request: NextRequest, additionalContext?: Record<string, any>) {
  logger.logRequest(
    request.method,
    request.nextUrl.pathname,
    {
      ...additionalContext,
      searchParams: Object.fromEntries(request.nextUrl.searchParams),
    }
  );
}

/**
 * Example: Create success response with consistent format
 */
export function successResponse(
  data: any,
  message?: string,
  status: number = 200
): NextResponse {
  const response: any = { data };
  if (message) {
    response.message = message;
  }
  return NextResponse.json(response, { status });
}

/**
 * Example: Create paginated response
 */
export function paginatedResponse(
  data: any[],
  page: number,
  limit: number,
  total: number
): NextResponse {
  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// ============================================================================
// Example API Route Pattern
// ============================================================================

/**
 * Example of a complete API route using all error handling utilities
 * 
 * This demonstrates the recommended pattern for building API routes:
 * 1. Use withErrorHandling wrapper
 * 2. Validate inputs with schemas
 * 3. Check authentication/authorization
 * 4. Use ensureExists for database lookups
 * 5. Return consistent response formats
 */

/*
import { NextRequest } from 'next/server';
import { withErrorHandling, validateRequestBody, ensureExists } from '@/lib/api-error-handler';
import { requireAdmin, successResponse } from '@/lib/api-helpers';
import { createParkingLotSchema } from '@/lib/schemas';
import ParkingLot from '@/models/ParkingLot';
import dbConnect from '@/lib/mongodb';

export const POST = withErrorHandling(async (request: NextRequest) => {
  // 1. Validate authentication and authorization
  await requireAdmin();

  // 2. Connect to database
  await dbConnect();

  // 3. Validate request body
  const data = await validateRequestBody(request, createParkingLotSchema);

  // 4. Perform business logic
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

  // 5. Return success response
  return successResponse(parkingLot, 'Parking lot created successfully', 201);
});

export const GET = withErrorHandling(async (request: NextRequest) => {
  // 1. Validate authentication
  await requireAuth();

  // 2. Connect to database
  await dbConnect();

  // 3. Validate query parameters
  const query = validateQueryParams(
    request.nextUrl.searchParams,
    parkingLotQuerySchema
  );

  // 4. Fetch data
  const parkingLots = await ParkingLot.find({ status: query.status })
    .skip((query.page - 1) * query.limit)
    .limit(query.limit);

  const total = await ParkingLot.countDocuments({ status: query.status });

  // 5. Return paginated response
  return paginatedResponse(parkingLots, query.page, query.limit, total);
});

// Example of a route with dynamic parameter
export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  // 1. Validate authentication and authorization
  await requireAdmin();

  // 2. Connect to database
  await dbConnect();

  // 3. Find and validate resource exists
  const parkingLot = await ParkingLot.findById(params.id);
  ensureExists(parkingLot, 'Parking lot', params.id);

  // 4. Perform soft delete
  parkingLot.status = 'inactive';
  await parkingLot.save();

  // 5. Return success response
  return successResponse(parkingLot, 'Parking lot deleted successfully');
});
*/
