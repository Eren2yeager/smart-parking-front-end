import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Violation from '@/models/Violation';
import { requireAuth, handleAuthError } from '@/lib/auth';
import mongoose from 'mongoose';

/**
 * GET /api/violations/[id]
 * Fetch single violation by ID
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

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid ID', message: 'The provided violation ID is not valid' },
        { status: 400 }
      );
    }

    // Fetch violation
    const violation = await Violation.findById(id)
      .populate('contractorId', 'name email contactPerson phone')
      .populate('parkingLotId', 'name location totalSlots')
      .populate('resolvedBy', 'name email')
      .lean();

    if (!violation) {
      return NextResponse.json(
        { error: 'Resource not found', message: `Violation with ID '${id}' does not exist` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: violation,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
