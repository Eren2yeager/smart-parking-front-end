import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import { requireAuth, requireRole, handleAuthError } from '@/lib/auth';
import { updateSettingsSchema } from '@/lib/schemas';
import { Types } from 'mongoose';

// Fixed ID for the single settings document
const SETTINGS_ID = '000000000000000000000001';

/**
 * GET /api/settings
 * Fetch system settings
 * Requirements: 5.1
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    await dbConnect();

    // Fetch settings document
    let settings = await Settings.findById(SETTINGS_ID).lean();

    // Return default values if not found
    if (!settings) {
      const defaultSettings = {
        _id: new Types.ObjectId(SETTINGS_ID),
        alertThresholds: {
          capacityWarning: 90,
          cameraOfflineTimeout: 5,
        },
        pythonBackend: {
          httpUrl: process.env.PYTHON_BACKEND_URL || 'http://localhost:8000',
          wsUrl: process.env.PYTHON_BACKEND_WS_URL || 'ws://localhost:8000',
        },
        cameras: {
          gateFrameSkip: 2,
          lotFrameSkip: 5,
        },
        updatedAt: new Date(),
        updatedBy: new Types.ObjectId(),
      };

      return NextResponse.json({
        data: defaultSettings,
      });
    }

    return NextResponse.json({
      data: settings,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * PUT /api/settings
 * Update system settings
 * Requirements: 5.9, 5.10, 5.11, 5.12
 */
export async function PUT(request: NextRequest) {
  try {
    // Require admin role
    const session = await requireRole(['admin']);

    await dbConnect();

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateSettingsSchema.safeParse(body);

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
    const updateData: any = {
      updatedBy: new Types.ObjectId(session.user.id),
    };

    if (data.alertThresholds) {
      updateData.alertThresholds = data.alertThresholds;
    }

    if (data.pythonBackend) {
      updateData.pythonBackend = data.pythonBackend;
    }

    if (data.cameras) {
      updateData.cameras = data.cameras;
    }

    // Update or create settings document
    const settings = await Settings.findByIdAndUpdate(
      SETTINGS_ID,
      updateData,
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return NextResponse.json({
      data: settings,
      message: 'Settings updated successfully',
    });
  } catch (error: any) {
    if (error.name === 'AuthenticationError' || error.name === 'AuthorizationError') {
      return handleAuthError(error);
    }

    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
