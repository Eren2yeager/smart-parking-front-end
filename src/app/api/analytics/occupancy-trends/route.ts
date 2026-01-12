import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CapacityLog from '@/models/CapacityLog';
import ParkingLot from '@/models/ParkingLot';
import { requireAuth, handleAuthError } from '@/lib/auth';

/**
 * GET /api/analytics/occupancy-trends
 * Get occupancy trends over time
 * - Query CapacityLogs for date range
 * - Filter by parkingLotId (optional)
 * - Aggregate by hour or day
 * - Return time-series data
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const parkingLotId = searchParams.get('parkingLotId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const interval = searchParams.get('interval') || 'hour'; // 'hour' or 'day'

    // Validate date range
    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'startDate and endDate are required',
        },
        { status: 400 }
      );
    }

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

    // Validate interval
    if (!['hour', 'day'].includes(interval)) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'interval must be "hour" or "day"',
        },
        { status: 400 }
      );
    }

    // Build match query
    const matchQuery: any = {
      timestamp: {
        $gte: start,
        $lte: end,
      },
    };

    // If parkingLotId is provided, validate and add to query
    if (parkingLotId) {
      if (!/^[0-9a-fA-F]{24}$/.test(parkingLotId)) {
        return NextResponse.json(
          { error: 'Validation failed', message: 'Invalid parking lot ID format' },
          { status: 400 }
        );
      }

      // Check if parking lot exists
      const parkingLot = await ParkingLot.findById(parkingLotId).lean();
      if (!parkingLot) {
        return NextResponse.json(
          { error: 'Not found', message: 'Parking lot not found' },
          { status: 404 }
        );
      }

      matchQuery.parkingLotId = parkingLot._id;
    }

    // Build aggregation pipeline based on interval
    let dateFormat: any;
    let groupId: any;

    if (interval === 'hour') {
      // Group by year, month, day, and hour
      groupId = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' },
        hour: { $hour: '$timestamp' },
      };
      dateFormat = '%Y-%m-%dT%H:00:00.000Z';
    } else {
      // Group by year, month, and day
      groupId = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' },
      };
      dateFormat = '%Y-%m-%dT00:00:00.000Z';
    }

    const trends = await CapacityLog.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: groupId,
          avgOccupied: { $avg: '$occupied' },
          avgOccupancyRate: { $avg: '$occupancyRate' },
          maxOccupied: { $max: '$occupied' },
          minOccupied: { $min: '$occupied' },
          totalSlots: { $first: '$totalSlots' },
          count: { $sum: 1 },
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
          avgOccupancyRate: { $round: [{ $multiply: ['$avgOccupancyRate', 100] }, 2] },
          maxOccupied: 1,
          minOccupied: 1,
          totalSlots: 1,
          dataPoints: '$count',
        },
      },
      { $sort: { timestamp: 1 } },
    ]);

    return NextResponse.json({
      data: {
        trends,
        interval,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        parkingLotId: parkingLotId || null,
      },
      message: 'Occupancy trends retrieved successfully',
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
