import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Violation from '@/models/Violation';
import { requireAuth, handleAuthError } from '@/lib/auth';

/**
 * GET /api/violations/summary
 * Get violation summary aggregated by contractor
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    await dbConnect();

    // Aggregate violations by contractor
    const summary = await Violation.aggregate([
      {
        $group: {
          _id: '$contractorId',
          totalViolations: { $sum: 1 },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          acknowledgedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'acknowledged'] }, 1, 0] },
          },
          resolvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
          totalPenalties: { $sum: '$penalty' },
        },
      },
      {
        $lookup: {
          from: 'contractors',
          localField: '_id',
          foreignField: '_id',
          as: 'contractor',
        },
      },
      {
        $unwind: '$contractor',
      },
      {
        $project: {
          _id: 1,
          contractorName: '$contractor.name',
          contractorEmail: '$contractor.email',
          totalViolations: 1,
          pendingCount: 1,
          acknowledgedCount: 1,
          resolvedCount: 1,
          totalPenalties: 1,
        },
      },
      {
        $sort: { totalViolations: -1 },
      },
    ]);

    // Calculate overall totals
    const overallTotals = summary.reduce(
      (acc, item) => ({
        totalViolations: acc.totalViolations + item.totalViolations,
        pendingCount: acc.pendingCount + item.pendingCount,
        acknowledgedCount: acc.acknowledgedCount + item.acknowledgedCount,
        resolvedCount: acc.resolvedCount + item.resolvedCount,
        totalPenalties: acc.totalPenalties + item.totalPenalties,
      }),
      {
        totalViolations: 0,
        pendingCount: 0,
        acknowledgedCount: 0,
        resolvedCount: 0,
        totalPenalties: 0,
      }
    );

    return NextResponse.json({
      data: {
        byContractor: summary,
        overall: overallTotals,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
