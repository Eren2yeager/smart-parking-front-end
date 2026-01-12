import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import VehicleRecord from '@/models/VehicleRecord';
import { requireAuth, handleAuthError } from '@/lib/auth';

/**
 * GET /api/records
 * List vehicle records with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    await dbConnect();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const parkingLotId = searchParams.get('parkingLotId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Build filter
    const filter: any = {};

    if (parkingLotId) {
      filter.parkingLotId = parkingLotId;
    }

    if (status && (status === 'inside' || status === 'exited')) {
      filter.status = status;
    }

    // Date range filter on entry timestamp
    if (startDate || endDate) {
      filter['entry.timestamp'] = {};
      if (startDate) {
        filter['entry.timestamp'].$gte = new Date(startDate);
      }
      if (endDate) {
        filter['entry.timestamp'].$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch vehicle records
    const [records, total] = await Promise.all([
      VehicleRecord.find(filter)
        .populate('parkingLotId', 'name location')
        .populate('contractorId', 'name')
        .sort({ 'entry.timestamp': -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      VehicleRecord.countDocuments(filter),
    ]);

    return NextResponse.json(
      {
        data: records,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}
