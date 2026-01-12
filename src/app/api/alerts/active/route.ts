import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Alert from '@/models/Alert';
import { requireAuth, handleAuthError } from '@/lib/auth';

/**
 * GET /api/alerts/active
 * Filter by status "active"
 * Order by severity (critical, high, medium, low)
 * Return for dashboard display
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    await dbConnect();

    // Define severity order for sorting
    const severityOrder: Record<string, number> = { 
      critical: 1, 
      warning: 2, 
      info: 3 
    };

    // Fetch active alerts
    const alerts = await Alert.find({ status: 'active' })
      .populate('parkingLotId', 'name location')
      .populate('contractorId', 'name email')
      .lean();

    // Sort by severity (critical first, then warning, info)
    const sortedAlerts = alerts.sort((a, b) => {
      const severityA = severityOrder[a.severity] || 999;
      const severityB = severityOrder[b.severity] || 999;
      return severityA - severityB;
    });

    return NextResponse.json({
      data: sortedAlerts,
      count: sortedAlerts.length,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
