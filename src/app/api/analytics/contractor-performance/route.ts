import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Contractor from '@/models/Contractor';
import ParkingLot from '@/models/ParkingLot';
import CapacityLog from '@/models/CapacityLog';
import Violation from '@/models/Violation';
import { requireAuth, handleAuthError } from '@/lib/auth';

/**
 * GET /api/analytics/contractor-performance
 * Get contractor performance comparison
 * - For each contractor, calculate compliance rate
 * - Count violations
 * - Calculate average occupancy
 * - Return comparison data
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build date filter if provided
    let dateFilter: any = {};
    if (startDate && endDate) {
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

      dateFilter = {
        timestamp: {
          $gte: start,
          $lte: end,
        },
      };
    }

    // Get all active contractors
    const contractors = await Contractor.find({ status: 'active' }).lean();

    // Build performance data for each contractor
    const performanceData = await Promise.all(
      contractors.map(async (contractor) => {
        // Get parking lots assigned to this contractor
        const parkingLots = await ParkingLot.find({
          contractorId: contractor._id,
          status: 'active',
        }).lean();

        const parkingLotIds = parkingLots.map((lot) => lot._id);

        // Count violations for this contractor
        const violationFilter: any = { contractorId: contractor._id };
        if (dateFilter.timestamp) {
          violationFilter.timestamp = dateFilter.timestamp;
        }
        const violationCount = await Violation.countDocuments(violationFilter);

        // Calculate average occupancy from capacity logs
        const capacityFilter: any = { contractorId: contractor._id };
        if (dateFilter.timestamp) {
          capacityFilter.timestamp = dateFilter.timestamp;
        }

        const occupancyStats = await CapacityLog.aggregate([
          { $match: capacityFilter },
          {
            $group: {
              _id: null,
              avgOccupied: { $avg: '$occupied' },
              avgOccupancyRate: { $avg: '$occupancyRate' },
              totalDataPoints: { $sum: 1 },
            },
          },
        ]);

        const avgOccupied =
          occupancyStats.length > 0 ? Math.round(occupancyStats[0].avgOccupied * 100) / 100 : 0;
        const avgOccupancyRate =
          occupancyStats.length > 0
            ? Math.round(occupancyStats[0].avgOccupancyRate * 10000) / 100
            : 0;
        const totalDataPoints = occupancyStats.length > 0 ? occupancyStats[0].totalDataPoints : 0;

        // Calculate compliance rate
        // Compliance rate = (total capacity checks - violations) / total capacity checks
        // If no data points, compliance rate is 100%
        const complianceRate =
          totalDataPoints > 0
            ? Math.round(((totalDataPoints - violationCount) / totalDataPoints) * 10000) / 100
            : 100;

        return {
          contractorId: contractor._id,
          contractorName: contractor.name,
          allocatedCapacity: contractor.contractDetails.allocatedCapacity,
          assignedParkingLots: parkingLots.length,
          violationCount,
          avgOccupied,
          avgOccupancyRate,
          complianceRate,
          totalDataPoints,
        };
      })
    );

    // Sort by compliance rate (lowest first to highlight problematic contractors)
    performanceData.sort((a, b) => a.complianceRate - b.complianceRate);

    return NextResponse.json({
      data: {
        contractors: performanceData,
        dateRange: dateFilter.timestamp
          ? {
              startDate: dateFilter.timestamp.$gte.toISOString(),
              endDate: dateFilter.timestamp.$lte.toISOString(),
            }
          : null,
      },
      message: 'Contractor performance data retrieved successfully',
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
