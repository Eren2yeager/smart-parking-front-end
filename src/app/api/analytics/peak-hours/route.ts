import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CapacityLog from '@/models/CapacityLog';
import ParkingLot from '@/models/ParkingLot';
import { requireAuth, handleAuthError } from '@/lib/auth';

/**
 * GET /api/analytics/peak-hours
 * Get peak hours analysis with heatmap data
 * - Query CapacityLogs for date range
 * - Aggregate by hour of day and day of week
 * - Calculate average occupancy for each time slot
 * - Return heatmap data
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

    // Aggregate by hour of day and day of week
    const heatmapData = await CapacityLog.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: '$timestamp' }, // 1 = Sunday, 7 = Saturday
            hour: { $hour: '$timestamp' }, // 0-23
          },
          avgOccupied: { $avg: '$occupied' },
          avgOccupancyRate: { $avg: '$occupancyRate' },
          maxOccupied: { $max: '$occupied' },
          minOccupied: { $min: '$occupied' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          dayOfWeek: '$_id.dayOfWeek',
          hour: '$_id.hour',
          avgOccupied: { $round: ['$avgOccupied', 2] },
          avgOccupancyRate: { $round: [{ $multiply: ['$avgOccupancyRate', 100] }, 2] },
          maxOccupied: 1,
          minOccupied: 1,
          dataPoints: '$count',
        },
      },
      {
        $sort: { dayOfWeek: 1, hour: 1 },
      },
    ]);

    // Transform data into a more usable format for heatmap visualization
    // Create a 7x24 matrix (7 days x 24 hours)
    const matrix: number[][] = Array(7)
      .fill(0)
      .map(() => Array(24).fill(0));

    heatmapData.forEach((item) => {
      // dayOfWeek: 1 = Sunday, convert to 0-indexed (0 = Sunday)
      const dayIndex = item.dayOfWeek - 1;
      const hourIndex = item.hour;
      matrix[dayIndex][hourIndex] = item.avgOccupancyRate;
    });

    // Day labels (Sunday to Saturday)
    const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Hour labels (0-23)
    const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);

    return NextResponse.json({
      data: {
        heatmap: heatmapData,
        matrix,
        dayLabels,
        hourLabels,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        parkingLotId: parkingLotId || null,
      },
      message: 'Peak hours analysis retrieved successfully',
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
