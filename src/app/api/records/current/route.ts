import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import VehicleRecord from '@/models/VehicleRecord';
import { requireAuth, handleAuthError } from '@/lib/auth';

/**
 * GET /api/records/current
 * Get vehicles currently inside (status: 'inside')
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    await dbConnect();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const parkingLotId = searchParams.get('parkingLotId');

    // Build filter for vehicles currently inside
    const filter: any = {
      status: 'inside',
    };

    if (parkingLotId) {
      filter.parkingLotId = parkingLotId;
    }

    // Fetch current vehicle records
    const records = await VehicleRecord.find(filter)
      .populate('parkingLotId', 'name location')
      .populate('contractorId', 'name')
      .sort({ 'entry.timestamp': -1 })
      .lean();

    // Calculate current duration for each record
    const now = new Date();
    const recordsWithDuration = records.map((record) => {
      const entryTime = new Date(record.entry.timestamp);
      const currentDurationMs = now.getTime() - entryTime.getTime();
      const currentDurationMinutes = Math.floor(currentDurationMs / 60000);

      return {
        ...record,
        currentDuration: currentDurationMinutes,
      };
    });

    return NextResponse.json({
      data: recordsWithDuration,
      count: recordsWithDuration.length,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
