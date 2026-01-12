import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { requireRole, handleAuthError } from '@/lib/auth';
import { updateUserRoleSchema } from '@/lib/schemas';

/**
 * PUT /api/users/[id]/role
 * Update user role
 * Requirements: 5.7, 5.8
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin role
    const session = await requireRole(['admin']);

    await dbConnect();

    const { id: userId } = await params;

    // Prevent admin from changing their own role
    if (session.user.id === userId) {
      return NextResponse.json(
        { error: 'Cannot change your own role', message: 'You cannot modify your own role' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateUserRoleSchema.safeParse(body);

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

    const { role } = validationResult.data;

    // Update user role
    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true }
    ).select('_id email name role image lastLogin createdAt');

    if (!user) {
      return NextResponse.json(
        { error: 'User not found', message: 'User with this ID does not exist' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: user,
      message: 'User role updated successfully. User will need to re-authenticate.',
    });
  } catch (error: any) {
    if (error.name === 'AuthenticationError' || error.name === 'AuthorizationError') {
      return handleAuthError(error);
    }

    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update user role' },
      { status: 500 }
    );
  }
}
