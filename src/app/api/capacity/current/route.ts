import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CapacityLog from '@/models/CapacityLog';
import ParkingLot from '@/models/ParkingLot';

/**
 * GET /api/capacity/current
 * Get latest CapacityLog for each parking lot
 * - Optionally filter by parkingLotId
 * - Return current occupancy data
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const parkingLotId = searchParams.get('parkingLotId');

    // If parkingLotId is provided, get latest log for that lot
    if (parkingLotId) {
      // Validate parkingLotId format
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

      // Get latest capacity log for this parking lot
      const latestLog = await CapacityLog.findOne({ parkingLotId })
        .sort({ timestamp: -1 })
        .populate('parkingLotId', 'name location')
        .populate('contractorId', 'name')
        .lean();

      if (!latestLog) {
        return NextResponse.json(
          {
            data: null,
            message: 'No capacity logs found for this parking lot',
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          data: latestLog,
          message: 'Current capacity retrieved successfully',
        },
        { status: 200 }
      );
    }

    // Get latest log for each parking lot
    // First, get all active parking lots
    const parkingLots = await ParkingLot.find({ status: 'active' }).select('_id').lean();
    const parkingLotIds = parkingLots.map((lot) => lot._id);

    // Get latest capacity log for each parking lot using aggregation
    const latestLogs = await CapacityLog.aggregate([
      {
        $match: {
          parkingLotId: { $in: parkingLotIds },
        },
      },
      {
        $sort: { timestamp: -1 },
      },
      {
        $group: {
          _id: '$parkingLotId',
          latestLog: { $first: '$$ROOT' },
        },
      },
      {
        $replaceRoot: { newRoot: '$latestLog' },
      },
      {
        $lookup: {
          from: 'parkinglots',
          localField: 'parkingLotId',
          foreignField: '_id',
          as: 'parkingLot',
        },
      },
      {
        $lookup: {
          from: 'contractors',
          localField: 'contractorId',
          foreignField: '_id',
          as: 'contractor',
        },
      },
      {
        $unwind: {
          path: '$parkingLot',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$contractor',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          parkingLotId: 1,
          contractorId: 1,
          timestamp: 1,
          totalSlots: 1,
          occupied: 1,
          empty: 1,
          occupancyRate: 1,
          processingTime: 1,
          createdAt: 1,
          'parkingLot.name': 1,
          'parkingLot.location': 1,
          'contractor.name': 1,
        },
      },
      {
        $sort: { 'parkingLot.name': 1 },
      },
    ]);

    return NextResponse.json(
      {
        data: latestLogs,
        count: latestLogs.length,
        message: 'Current capacity for all parking lots retrieved successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error retrieving current capacity:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve current capacity',
      },
      { status: 500 }
    );
  }
}
