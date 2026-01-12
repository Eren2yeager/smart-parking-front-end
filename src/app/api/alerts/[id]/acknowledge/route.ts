import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Alert from '@/models/Alert';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { Types } from 'mongoose';

/**
 * PUT /api/alerts/[id]/acknowledge
 * Update alert status to "acknowledged"
 * Record acknowledging user ID and timestamp
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication (operator or admin)
    const session = await requireAuth();

    await dbConnect();

    const { id } = await params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid alert ID' },
        { status: 400 }
      );
    }

    // Find the alert
    const alert = await Alert.findById(id);

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    // Update alert status to acknowledged
    alert.status = 'acknowledged';
    alert.acknowledgedBy = new Types.ObjectId(session.user.id);
    alert.acknowledgedAt = new Date();

    await alert.save();

    // Populate references for response
    await alert.populate([
      { path: 'parkingLotId', select: 'name location' },
      { path: 'contractorId', select: 'name email' },
      { path: 'acknowledgedBy', select: 'name email' },
    ]);

    return NextResponse.json({
      message: 'Alert acknowledged successfully',
      data: alert,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
