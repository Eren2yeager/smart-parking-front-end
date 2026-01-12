import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import Contractor from '@/models/Contractor';
import ParkingLot from '@/models/ParkingLot';
import CapacityLog from '@/models/CapacityLog';
import { requireAuth, handleAuthError } from '@/lib/auth';

// Validation schema for updating a contractor
const updateContractorSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  contactPerson: z.string().min(1).max(100).optional(),
  phone: z.string().min(1).max(20).optional(),
  email: z.string().email().optional(),
  contractDetails: z
    .object({
      startDate: z.string().datetime().or(z.date()).optional(),
      endDate: z.string().datetime().or(z.date()).optional(),
      allocatedCapacity: z.number().int().min(0).optional(),
      penaltyPerViolation: z.number().min(0).optional(),
    })
    .optional(),
  status: z.enum(['active', 'suspended', 'terminated']).optional(),
});

/**
 * GET /api/contractors/[id]
 * Get contractor details with assigned parking lots and current occupancy
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

    // Fetch assigned parking lots
    const parkingLots = await ParkingLot.find({ contractorId: id })
      .select('_id name location totalSlots status')
      .lean();

    // Calculate current total occupancy across all lots
    let totalOccupancy = 0;
    const lotsWithOccupancy = await Promise.all(
      parkingLots.map(async (lot) => {
        const latestLog = await CapacityLog.findOne({
          parkingLotId: lot._id,
        })
          .sort({ timestamp: -1 })
          .lean();

        const occupied = latestLog ? latestLog.occupied : 0;
        totalOccupancy += occupied;

        return {
          ...lot,
          currentOccupancy: latestLog
            ? {
                occupied: latestLog.occupied,
                empty: latestLog.empty,
                occupancyRate: latestLog.occupancyRate,
                lastUpdated: latestLog.timestamp,
              }
            : null,
        };
      })
    );

    return NextResponse.json({
      data: {
        ...contractor,
        assignedParkingLots: lotsWithOccupancy,
        currentTotalOccupancy: totalOccupancy,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * PUT /api/contractors/[id]
 * Update contractor details
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin role
    const session = await requireAuth();
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions', message: 'Admin role required' },
        { status: 403 }
      );
    }

    await dbConnect();

    const { id } = await params;

    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json(
        { error: 'Invalid contractor ID format' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateContractorSchema.safeParse(body);

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

    const data = validationResult.data;

    // Build update object
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.status !== undefined) updateData.status = data.status;

    // Handle nested contractDetails updates
    if (data.contractDetails) {
      const contractor = await Contractor.findById(id);
      if (!contractor) {
        return NextResponse.json(
          { error: 'Resource not found', message: 'Contractor not found' },
          { status: 404 }
        );
      }

      updateData.contractDetails = {
        startDate: data.contractDetails.startDate
          ? new Date(data.contractDetails.startDate)
          : contractor.contractDetails.startDate,
        endDate: data.contractDetails.endDate
          ? new Date(data.contractDetails.endDate)
          : contractor.contractDetails.endDate,
        allocatedCapacity:
          data.contractDetails.allocatedCapacity !== undefined
            ? data.contractDetails.allocatedCapacity
            : contractor.contractDetails.allocatedCapacity,
        penaltyPerViolation:
          data.contractDetails.penaltyPerViolation !== undefined
            ? data.contractDetails.penaltyPerViolation
            : contractor.contractDetails.penaltyPerViolation,
      };
    }

    // Update contractor
    const updatedContractor = await Contractor.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedContractor) {
      return NextResponse.json(
        { error: 'Resource not found', message: 'Contractor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: updatedContractor,
      message: 'Contractor updated successfully',
    });
  } catch (error: any) {
    if (error.name === 'AuthenticationError' || error.name === 'AuthorizationError') {
      return handleAuthError(error);
    }

    // Handle duplicate email error
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Duplicate email', message: 'Contractor with this email already exists' },
        { status: 409 }
      );
    }

    console.error('Error updating contractor:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update contractor' },
      { status: 500 }
    );
  }
}
