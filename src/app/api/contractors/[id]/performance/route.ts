import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Contractor from '@/models/Contractor';
import Violation from '@/models/Violation';
import CapacityLog from '@/models/CapacityLog';
import ParkingLot from '@/models/ParkingLot';
import { requireAuth, handleAuthError } from '@/lib/auth';

/**
 * GET /api/contractors/[id]/performance
 * Get contractor performance metrics including compliance rate, occupancy trends, and violations
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
        { error: 'Invalid contractor ID format' },
        { status: 400 }
      );
    }

    // Fetch contractor
    const contractor = await Contractor.findById(id).lean();

    if (!contractor) {
      return NextResponse.json(
        { error: 'Resource not found', message: 'Contractor not found' },
        { status: 404 }
      );
    }

    // Parse query parameters for date range
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Default to last 30 days if no date range provided
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    } else {
      dateFilter.$gte = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    } else {
      dateFilter.$lte = new Date();
    }

    // Count violations by status
    const [totalViolations, pendingViolations, acknowledgedViolations, resolvedViolations] =
      await Promise.all([
        Violation.countDocuments({
          contractorId: id,
          timestamp: dateFilter,
        }),
        Violation.countDocuments({
          contractorId: id,
          status: 'pending',
          timestamp: dateFilter,
        }),
        Violation.countDocuments({
          contractorId: id,
          status: 'acknowledged',
          timestamp: dateFilter,
        }),
        Violation.countDocuments({
          contractorId: id,
          status: 'resolved',
          timestamp: dateFilter,
        }),
      ]);

    // Get all parking lots for this contractor
    const parkingLots = await ParkingLot.find({ contractorId: id })
      .select('_id')
      .lean();
    const parkingLotIds = parkingLots.map((lot) => lot._id);

    // Count total capacity checks (capacity logs)
    const totalCapacityChecks = await CapacityLog.countDocuments({
      contractorId: id,
      timestamp: dateFilter,
    });

    // Calculate compliance rate
    // Compliance rate = (1 - violations / total_capacity_checks)
    const complianceRate =
      totalCapacityChecks > 0 ? 1 - totalViolations / totalCapacityChecks : 1;

    // Aggregate occupancy trends (daily average for the date range)
    const occupancyTrends = await CapacityLog.aggregate([
      {
        $match: {
          contractorId: contractor._id,
          timestamp: dateFilter,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
          },
          avgOccupancy: { $avg: '$occupied' },
          avgOccupancyRate: { $avg: '$occupancyRate' },
          totalSlots: { $first: '$totalSlots' },
          date: { $first: '$timestamp' },
        },
      },
      {
        $sort: { date: 1 },
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$date',
            },
          },
          avgOccupancy: { $round: ['$avgOccupancy', 2] },
          avgOccupancyRate: { $round: ['$avgOccupancyRate', 4] },
          totalSlots: 1,
        },
      },
    ]);

    // Get recent violations with details
    const recentViolations = await Violation.find({
      contractorId: id,
      timestamp: dateFilter,
    })
      .populate('parkingLotId', 'name location')
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    // Calculate total penalties
    const totalPenalties = await Violation.aggregate([
      {
        $match: {
          contractorId: contractor._id,
          timestamp: dateFilter,
        },
      },
      {
        $group: {
          _id: null,
          totalPenalty: { $sum: '$penalty' },
        },
      },
    ]);

    return NextResponse.json({
      data: {
        contractorId: id,
        contractorName: contractor.name,
        dateRange: {
          start: dateFilter.$gte,
          end: dateFilter.$lte,
        },
        complianceRate: Math.round(complianceRate * 10000) / 100, // Convert to percentage with 2 decimals
        violations: {
          total: totalViolations,
          pending: pendingViolations,
          acknowledged: acknowledgedViolations,
          resolved: resolvedViolations,
          recent: recentViolations,
        },
        totalPenalties: totalPenalties.length > 0 ? totalPenalties[0].totalPenalty : 0,
        occupancyTrends,
        totalCapacityChecks,
      },
    });
  } catch (error) {
    console.error('Error fetching contractor performance:', error);
    return handleAuthError(error);
  }
}
