import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import VehicleRecord from '@/models/VehicleRecord';
import { requireAuth, handleAuthError } from '@/lib/auth';

/**
 * GET /api/records/[id]
 * Fetch a single vehicle record by ID
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

    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json(
        { error: 'Invalid ID', message: 'Invalid record ID format' },
        { status: 400 }
      );
    }

    // Fetch vehicle record
    const record = await VehicleRecord.findById(id)
      .populate('parkingLotId', 'name location')
      .populate('contractorId', 'name')
      .lean();

    if (!record) {
      return NextResponse.json(
        { error: 'Not found', message: 'Vehicle record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: record,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
