import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Violation from '@/models/Violation';
import { requireAuth, handleAuthError } from '@/lib/auth';

/**
 * GET /api/violations
 * List all violations with filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    await dbConnect();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const contractorId = searchParams.get('contractorId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Build filter
    const filter: any = {};
    
    if (contractorId) {
      filter.contractorId = contractorId;
    }
    
    if (status && ['pending', 'acknowledged', 'resolved'].includes(status)) {
      filter.status = status;
    }
    
    // Date range filtering
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch violations with pagination
    const [violations, total] = await Promise.all([
      Violation.find(filter)
        .populate('contractorId', 'name email')
        .populate('parkingLotId', 'name location')
        .populate('resolvedBy', 'name email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Violation.countDocuments(filter),
    ]);

    return NextResponse.json({
      data: violations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
