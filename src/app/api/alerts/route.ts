import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Alert from '@/models/Alert';
import { requireAuth, handleAuthError } from '@/lib/auth';

/**
 * GET /api/alerts
 * Get alerts with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const parkingLotId = searchParams.get('parkingLotId');
    const contractorId = searchParams.get('contractorId');
    const type = searchParams.get('type');
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    const query: any = {};
    if (parkingLotId) query.parkingLotId = parkingLotId;
    if (contractorId) query.contractorId = contractorId;
    if (type) query.type = type;
    if (status) query.status = status;

    // Fetch alerts
    const alerts = await Alert.find(query)
      .populate('parkingLotId', 'name location')
      .populate('contractorId', 'name contactPerson phone')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      data: alerts,
      count: alerts.length,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
