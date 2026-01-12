import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ParkingLot from '@/models/ParkingLot';
import CapacityLog from '@/models/CapacityLog';
import Violation from '@/models/Violation';
import { requireAuth, handleAuthError } from '@/lib/auth';

/**
 * GET /api/analytics/dashboard
 * Get dashboard summary statistics
 * - Count total parking lots
 * - Sum total capacity across all lots
 * - Calculate current occupancy from latest logs
 * - Count active violations
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    await dbConnect();

    // Count total parking lots (active only)
    const totalParkingLots = await ParkingLot.countDocuments({ status: 'active' });

    // Sum total capacity across all active parking lots
    const capacityResult = await ParkingLot.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          totalCapacity: { $sum: '$totalSlots' },
        },
      },
    ]);
    const totalCapacity = capacityResult.length > 0 ? capacityResult[0].totalCapacity : 0;

    // Calculate current occupancy from latest logs
    // Get all active parking lots
    const parkingLots = await ParkingLot.find({ status: 'active' }).select('_id').lean();
    const parkingLotIds = parkingLots.map((lot) => lot._id);

    // Get latest capacity log for each parking lot and sum occupancy
    const occupancyResult = await CapacityLog.aggregate([
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
          latestOccupied: { $first: '$occupied' },
        },
      },
      {
        $group: {
          _id: null,
          currentOccupancy: { $sum: '$latestOccupied' },
        },
      },
    ]);
    const currentOccupancy = occupancyResult.length > 0 ? occupancyResult[0].currentOccupancy : 0;

    // Count active violations (pending and acknowledged)
    const activeViolations = await Violation.countDocuments({
      status: { $in: ['pending', 'acknowledged'] },
    });

    // Calculate occupancy rate
    const occupancyRate = totalCapacity > 0 ? (currentOccupancy / totalCapacity) * 100 : 0;

    return NextResponse.json({
      data: {
        totalParkingLots,
        totalCapacity,
        currentOccupancy,
        occupancyRate: Math.round(occupancyRate * 100) / 100, // Round to 2 decimal places
        activeViolations,
      },
      message: 'Dashboard summary retrieved successfully',
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
