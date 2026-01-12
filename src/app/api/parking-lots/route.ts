import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import ParkingLot from '@/models/ParkingLot';
import CapacityLog from '@/models/CapacityLog';
import { requireAuth, handleAuthError } from '@/lib/auth';

// Validation schema for creating a parking lot
const createParkingLotSchema = z.object({
  name: z.string().min(1).max(100),
  location: z.object({
    address: z.string().min(1),
    coordinates: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
  }),
  totalSlots: z.number().int().min(1).max(500),
  contractorId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid contractor ID'),
});

/**
 * GET /api/parking-lots
 * List all parking lots with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    await dbConnect();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const contractorId = searchParams.get('contractorId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Build filter
    const filter: any = {};
    if (status && (status === 'active' || status === 'inactive')) {
      filter.status = status;
    }
    if (contractorId) {
      filter.contractorId = contractorId;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch parking lots
    const [parkingLots, total] = await Promise.all([
      ParkingLot.find(filter)
        .populate('contractorId', 'name status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ParkingLot.countDocuments(filter),
    ]);

    // Get current occupancy for each parking lot from latest CapacityLog
    const parkingLotsWithOccupancy = await Promise.all(
      parkingLots.map(async (lot) => {
        const latestLog = await CapacityLog.findOne({
          parkingLotId: lot._id,
        })
          .sort({ timestamp: -1 })
          .lean();

        return {
          ...lot,
          currentOccupancy: latestLog
            ? {
                occupied: latestLog.occupied,
                empty: latestLog.empty,
                occupancyRate: latestLog.occupancyRate,
                lastUpdated: latestLog.timestamp,
              }
            : null,
        };
      })
    );

    return NextResponse.json(
      {
        data: parkingLotsWithOccupancy,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * POST /api/parking-lots
 * Create a new parking lot
 */
export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createParkingLotSchema.safeParse(body);

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

    // Generate unique camera IDs
    const timestamp = Date.now();
    const gateCameraId = `gate_${timestamp}_${Math.random().toString(36).substring(7)}`;
    const lotCameraId = `lot_${timestamp}_${Math.random().toString(36).substring(7)}`;

    // Initialize slots array with placeholder slots
    // Each slot starts as 'empty' with default bbox coordinates
    const slots = Array.from({ length: data.totalSlots }, (_, index) => ({
      slotId: index + 1,
      bbox: {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
      },
      status: 'empty' as const,
      lastUpdated: new Date(),
    }));

    // Create parking lot
    const parkingLot = await ParkingLot.create({
      name: data.name,
      location: data.location,
      totalSlots: data.totalSlots,
      contractorId: data.contractorId,
      gateCamera: {
        id: gateCameraId,
        status: 'active',
        lastSeen: new Date(),
      },
      lotCamera: {
        id: lotCameraId,
        status: 'active',
        lastSeen: new Date(),
      },
      slots: slots,
      status: 'active',
    });

    return NextResponse.json(
      {
        data: parkingLot,
        message: 'Parking lot created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.name === 'AuthenticationError' || error.name === 'AuthorizationError') {
      return handleAuthError(error);
    }

    // Handle duplicate camera ID error
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Duplicate camera ID', message: 'Camera ID already exists' },
        { status: 409 }
      );
    }

    console.error('Error creating parking lot:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create parking lot' },
      { status: 500 }
    );
  }
}
