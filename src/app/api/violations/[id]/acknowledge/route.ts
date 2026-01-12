import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Violation from '@/models/Violation';
import { requireAuth, requireRole, handleAuthError } from '@/lib/auth';
import mongoose from 'mongoose';

/**
 * PUT /api/violations/[id]/acknowledge
 * Acknowledge a violation
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require operator or admin role
    const session = await requireRole(['operator', 'admin']);

    await dbConnect();

    const { id } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid ID', message: 'The provided violation ID is not valid' },
        { status: 400 }
      );
    }

    // Find violation
    const violation = await Violation.findById(id);

    if (!violation) {
      return NextResponse.json(
        { error: 'Resource not found', message: `Violation with ID '${id}' does not exist` },
        { status: 404 }
      );
    }

    // Check if already acknowledged or resolved
    if (violation.status === 'acknowledged') {
      return NextResponse.json(
        { error: 'Invalid operation', message: 'Violation is already acknowledged' },
        { status: 400 }
      );
    }

    if (violation.status === 'resolved') {
      return NextResponse.json(
        { error: 'Invalid operation', message: 'Cannot acknowledge a resolved violation' },
        { status: 400 }
      );
    }

    // Update violation status
    violation.status = 'acknowledged';
    violation.resolvedBy = new mongoose.Types.ObjectId(session.user.id);
    violation.resolvedAt = new Date();

    await violation.save();

    // Populate and return updated violation
    const updatedViolation = await Violation.findById(id)
      .populate('contractorId', 'name email')
      .populate('parkingLotId', 'name location')
      .populate('resolvedBy', 'name email')
      .lean();

    return NextResponse.json({
      data: updatedViolation,
      message: 'Violation acknowledged successfully',
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
