import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { requireRole, handleAuthError } from '@/lib/auth';

/**
 * GET /api/users
 * List all users
 * Requirements: 5.7
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin role
    await requireRole(['admin']);

    await dbConnect();

    // Fetch all users
    const users = await User.find({})
      .select('_id email name role image lastLogin createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      data: users,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
