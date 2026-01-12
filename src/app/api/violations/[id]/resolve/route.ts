import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import Violation from '@/models/Violation';
import { requireAuth, requireRole, handleAuthError } from '@/lib/auth';
import mongoose from 'mongoose';

// Validation schema for resolve request
const resolveViolationSchema = z.object({
  notes: z.string().optional(),
});

/**
 * PUT /api/violations/[id]/resolve
 * Resolve a violation
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

    // Parse and validate request body
    const body = await request.json();
    const validationResult = resolveViolationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const { notes } = validationResult.data;

    // Find violation
    const violation = await Violation.findById(id);

    if (!violation) {
      return NextResponse.json(
        { error: 'Resource not found', message: `Violation with ID '${id}' does not exist` },
        { status: 404 }
      );
    }

    // Check if already resolved
    if (violation.status === 'resolved') {
      return NextResponse.json(
        { error: 'Invalid operation', message: 'Violation is already resolved' },
        { status: 400 }
      );
    }

    // Update violation status
    violation.status = 'resolved';
    violation.resolvedBy = new mongoose.Types.ObjectId(session.user.id);
    violation.resolvedAt = new Date();
    if (notes) {
      violation.notes = notes;
    }

    await violation.save();

    // Populate and return updated violation
    const updatedViolation = await Violation.findById(id)
      .populate('contractorId', 'name email')
      .populate('parkingLotId', 'name location')
      .populate('resolvedBy', 'name email')
      .lean();

    return NextResponse.json({
      data: updatedViolation,
      message: 'Violation resolved successfully',
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
