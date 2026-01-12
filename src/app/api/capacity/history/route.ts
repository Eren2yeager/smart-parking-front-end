import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CapacityLog from '@/models/CapacityLog';
import ParkingLot from '@/models/ParkingLot';

/**
 * GET /api/capacity/history
 * Query CapacityLogs by date range
 * - Filter by parkingLotId
 * - Aggregate by interval (hourly, daily)
 * - Return time-series data for charts
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const parkingLotId = searchParams.get('parkingLotId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const interval = searchParams.get('interval') || 'hourly'; // hourly or daily

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'startDate and endDate are required',
        },
        { status: 400 }
      );
    }

    // Validate interval
    if (!['hourly', 'daily'].includes(interval)) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'interval must be either "hourly" or "daily"',
        },
        { status: 400 }
      );
    }

    // Validate parkingLotId if provided
    if (parkingLotId && !/^[0-9a-fA-F]{24}$/.test(parkingLotId)) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Invalid parking lot ID format' },
        { status: 400 }
      );
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Invalid date format',
        },
        { status: 400 }
      );
    }

    if (start >= end) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'startDate must be before endDate',
        },
        { status: 400 }
      );
    }

    // If parkingLotId is provided, verify it exists
    if (parkingLotId) {
      const parkingLot = await ParkingLot.findById(parkingLotId).lean();
      if (!parkingLot) {
        return NextResponse.json(
          { error: 'Not found', message: 'Parking lot not found' },
          { status: 404 }
        );
      }
    }

    // Build match query
    const matchQuery: any = {
      timestamp: {
        $gte: start,
        $lte: end,
      },
    };

    if (parkingLotId) {
      matchQuery.parkingLotId = parkingLotId;
    }

    // Determine grouping format based on interval
    let dateFormat: any;
    if (interval === 'hourly') {
      dateFormat = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' },
        hour: { $hour: '$timestamp' },
      };
    } else {
      // daily
      dateFormat = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' },
      };
    }

    // Aggregate capacity logs by interval
    const aggregatedData = await CapacityLog.aggregate([
      {
        $match: matchQuery,
      },
      {
        $group: {
          _id: dateFormat,
          avgOccupied: { $avg: '$occupied' },
          maxOccupied: { $max: '$occupied' },
          minOccupied: { $min: '$occupied' },
          avgOccupancyRate: { $avg: '$occupancyRate' },
          totalSlots: { $first: '$totalSlots' },
          count: { $sum: 1 },
          parkingLotId: { $first: '$parkingLotId' },
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
          '_id.day': 1,
          '_id.hour': 1,
        },
      },
      {
        $project: {
          _id: 0,
          timestamp: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day',
              hour: { $ifNull: ['$_id.hour', 0] },
            },
          },
          avgOccupied: { $round: ['$avgOccupied', 2] },
          maxOccupied: 1,
          minOccupied: 1,
          avgOccupancyRate: { $round: ['$avgOccupancyRate', 4] },
          totalSlots: 1,
          count: 1,
          parkingLotId: 1,
        },
      },
    ]);

    // If parkingLotId is provided, also include parking lot details
    let parkingLotDetails = null;
    if (parkingLotId) {
      parkingLotDetails = await ParkingLot.findById(parkingLotId)
        .select('name location contractorId')
        .populate('contractorId', 'name')
        .lean();
    }

    return NextResponse.json(
      {
        data: aggregatedData,
        count: aggregatedData.length,
        interval,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        parkingLot: parkingLotDetails,
        message: 'Capacity history retrieved successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error retrieving capacity history:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve capacity history',
      },
      { status: 500 }
    );
  }
}
