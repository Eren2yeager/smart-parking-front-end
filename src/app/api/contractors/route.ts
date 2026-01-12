import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import Contractor from '@/models/Contractor';
import { requireAuth, handleAuthError } from '@/lib/auth';

// Validation schema for creating a contractor
const createContractorSchema = z.object({
  name: z.string().min(1).max(100),
  contactPerson: z.string().min(1).max(100),
  phone: z.string().min(1).max(20),
  email: z.string().email(),
  contractDetails: z.object({
    startDate: z.string().datetime().or(z.date()),
    endDate: z.string().datetime().or(z.date()),
    allocatedCapacity: z.number().int().min(0),
    penaltyPerViolation: z.number().min(0),
  }),
  status: z.enum(['active', 'suspended', 'terminated']).optional(),
});

/**
 * GET /api/contractors
 * List all contractors with filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    await dbConnect();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    // Build filter
    const filter: any = {};
    if (status && ['active', 'suspended', 'terminated'].includes(status)) {
      filter.status = status;
    }

    // Fetch contractors
    const contractors = await Contractor.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      {
        data: contractors,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * POST /api/contractors
 * Create a new contractor
 */
export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createContractorSchema.safeParse(body);

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

    // Create contractor
    const contractor = await Contractor.create({
      name: data.name,
      contactPerson: data.contactPerson,
      phone: data.phone,
      email: data.email,
      contractDetails: {
        startDate: new Date(data.contractDetails.startDate),
        endDate: new Date(data.contractDetails.endDate),
        allocatedCapacity: data.contractDetails.allocatedCapacity,
        penaltyPerViolation: data.contractDetails.penaltyPerViolation,
      },
      status: data.status || 'active',
    });

    return NextResponse.json(
      {
        data: contractor,
        message: 'Contractor created successfully',
      },
      { status: 201 }
    );
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

    console.error('Error creating contractor:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create contractor' },
      { status: 500 }
    );
  }
}
