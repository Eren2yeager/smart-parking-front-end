import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import ParkingLot from '@/models/ParkingLot';
import CapacityLog from '@/models/CapacityLog';
import { requireAuth, handleAuthError } from '@/lib/auth';

// Validation schema for updating a parking lot
const updateParkingLotSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  location: z
    .object({
      address: z.string().min(1),
      coordinates: z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      }),
    })
    .optional(),
  totalSlots: z.number().int().min(1).max(500).optional(),
  contractorId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid contractor ID').optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

/**
 * GET /api/parking-lots/[id]
 * Get a single parking lot by ID with contractor details and current occupancy
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    await requireAuth();

    await dbConnect();

    const { id } = await params;

    // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'Parking lot ID must be a valid ObjectId' },
        { status: 400 }
      );
    }

    // Fetch parking lot with contractor details
    const parkingLot = await ParkingLot.findById(id)
      .populate('contractorId', 'name contactPerson phone email status contractDetails')
      .lean();

    if (!parkingLot) {
      return NextResponse.json(
        { error: 'Resource not found', message: `Parking lot with ID '${id}' does not exist` },
        { status: 404 }
      );
    }

    // Get current occupancy from latest CapacityLog
    const latestLog = await CapacityLog.findOne({
      parkingLotId: id,
    })
      .sort({ timestamp: -1 })
      .lean();

    const response = {
      ...parkingLot,
      currentOccupancy: latestLog
        ? {
            occupied: latestLog.occupied,
            empty: latestLog.empty,
            occupancyRate: latestLog.occupancyRate,
            lastUpdated: latestLog.timestamp,
          }
        : null,
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * PUT /api/parking-lots/[id]
 * Update a parking lot
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin role
    const session = await requireAuth();
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions', message: 'Admin role required' },
        { status: 403 }
      );
    }

    await dbConnect();

    const { id } = await params;

    // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'Parking lot ID must be a valid ObjectId' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateParkingLotSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Update parking lot
    const parkingLot = await ParkingLot.findByIdAndUpdate(
      id,
      {
        ...data,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).lean();

    if (!parkingLot) {
      return NextResponse.json(
        { error: 'Resource not found', message: `Parking lot with ID '${id}' does not exist` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: parkingLot,
      message: 'Parking lot updated successfully',
    });
  } catch (error: any) {
    if (error.name === 'AuthenticationError' || error.name === 'AuthorizationError') {
      return handleAuthError(error);
    }

    console.error('Error updating parking lot:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update parking lot' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/parking-lots/[id]
 * Soft delete a parking lot (set status to inactive)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin role
    const session = await requireAuth();
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions', message: 'Admin role required' },
        { status: 403 }
      );
    }

    await dbConnect();

    const { id } = await params;

    // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'Parking lot ID must be a valid ObjectId' },
        { status: 400 }
      );
    }

    // Perform soft delete by setting status to inactive
    const parkingLot = await ParkingLot.findByIdAndUpdate(
      id,
      {
        status: 'inactive',
        updatedAt: new Date(),
      },
      { new: true }
    ).lean();

    if (!parkingLot) {
      return NextResponse.json(
        { error: 'Resource not found', message: `Parking lot with ID '${id}' does not exist` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: parkingLot,
      message: 'Parking lot deleted successfully',
    });
  } catch (error: any) {
    if (error.name === 'AuthenticationError' || error.name === 'AuthorizationError') {
      return handleAuthError(error);
    }

    console.error('Error deleting parking lot:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to delete parking lot' },
      { status: 500 }
    );
  }
}
