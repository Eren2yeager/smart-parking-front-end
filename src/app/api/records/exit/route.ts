import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import VehicleRecord from '@/models/VehicleRecord';

// Validation schema for exit detection
const exitDetectionSchema = z.object({
  plateNumber: z.string().min(1).max(20),
  parkingLotId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid parking lot ID'),
  gateId: z.string().min(1),
  confidence: z.number().min(0).max(1),
  imageUrl: z.string().url().optional(),
  detectionData: z.any().optional(),
});

/**
 * POST /api/records/exit
 * Update a vehicle record with exit information
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Parse and validate request body
    const body = await request.json();
    const validationResult = exitDetectionSchema.safeParse(body);

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

    // Find existing VehicleRecord by plate and lot with status 'inside'
    const existingRecord = await VehicleRecord.findOne({
      plateNumber: data.plateNumber.toUpperCase(),
      parkingLotId: data.parkingLotId,
      status: 'inside',
    });

    if (!existingRecord) {
      return NextResponse.json(
        {
          error: 'Not found',
          message: 'No active entry record found for this vehicle',
        },
        { status: 404 }
      );
    }

    // Calculate duration in minutes
    const exitTimestamp = new Date();
    const entryTimestamp = existingRecord.entry.timestamp;
    const durationMs = exitTimestamp.getTime() - entryTimestamp.getTime();
    const durationMinutes = Math.floor(durationMs / 60000);

    // Update with exit timestamp and duration
    existingRecord.exit = {
      timestamp: exitTimestamp,
      gateId: data.gateId,
      confidence: data.confidence,
      imageUrl: data.imageUrl,
      detectionData: data.detectionData,
    };
    existingRecord.duration = durationMinutes;
    existingRecord.status = 'exited';

    await existingRecord.save();

    return NextResponse.json(
      {
        data: existingRecord,
        message: 'Exit record updated successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating exit record:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to update exit record',
      },
      { status: 500 }
    );
  }
}
