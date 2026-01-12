import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import VehicleRecord from '@/models/VehicleRecord';
import ParkingLot from '@/models/ParkingLot';

// Validation schema for vehicle entry
const vehicleEntrySchema = z.object({
  parkingLotId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid parking lot ID'),
  plateNumber: z.string().min(1).max(20),
  gateId: z.string(),
  confidence: z.number().min(0).max(1),
  image: z.string().optional(), // Base64 image
});

/**
 * POST /api/records/entry
 * Record vehicle entry from gate camera
 * 
 * Handles deduplication: If the same plate was detected within the last 2 minutes,
 * ignore the duplicate detection to prevent multiple records for the same entry.
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Parse and validate request body
    const body = await request.json();
    const validationResult = vehicleEntrySchema.safeParse(body);

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

    const { parkingLotId, plateNumber, gateId, confidence, image } = validationResult.data;

    // Fetch parking lot to get contractor ID
    const parkingLot = await ParkingLot.findById(parkingLotId);
    if (!parkingLot) {
      return NextResponse.json(
        { error: 'Parking lot not found' },
        { status: 404 }
      );
    }

    // DEDUPLICATION: Check if this plate was detected in the last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    
    const recentRecord = await VehicleRecord.findOne({
      parkingLotId,
      plateNumber: plateNumber.toUpperCase(),
      'entry.timestamp': { $gte: twoMinutesAgo },
    }).sort({ 'entry.timestamp': -1 });

    if (recentRecord) {
      // Duplicate detection within 2 minutes - ignore it
      const timeSinceLastDetection = Date.now() - new Date(recentRecord.entry.timestamp).getTime();
      const secondsAgo = Math.floor(timeSinceLastDetection / 1000);
      
      return NextResponse.json({
        data: {
          duplicate: true,
          existingRecord: recentRecord._id,
          message: `Plate ${plateNumber} was already detected ${secondsAgo} seconds ago. Ignoring duplicate.`,
          timeSinceLastDetection: secondsAgo,
        },
        message: 'Duplicate detection ignored',
      });
    }

    // Check if vehicle is already inside (has an active entry without exit)
    const activeRecord = await VehicleRecord.findOne({
      parkingLotId,
      plateNumber: plateNumber.toUpperCase(),
      status: 'inside',
    });

    if (activeRecord) {
      // Vehicle is already inside - this might be a re-entry or duplicate
      // Update the entry timestamp to the latest detection
      return NextResponse.json({
        data: {
          alreadyInside: true,
          existingRecord: activeRecord._id,
          message: `Vehicle ${plateNumber} is already inside the parking lot.`,
        },
        message: 'Vehicle already inside',
      });
    }

    // Create new vehicle entry record
    const now = new Date();
    const vehicleRecord = await VehicleRecord.create({
      parkingLotId,
      contractorId: parkingLot.contractorId,
      plateNumber: plateNumber.toUpperCase(),
      entry: {
        timestamp: now,
        gateId,
        confidence,
        imageUrl: image,
        detectionData: {},
      },
      status: 'inside',
    });

    // Update gate camera lastSeen
    parkingLot.gateCamera.lastSeen = now;
    parkingLot.gateCamera.status = 'active';
    await parkingLot.save();

    return NextResponse.json(
      {
        data: vehicleRecord,
        message: 'Vehicle entry recorded successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error recording vehicle entry:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to record vehicle entry' },
      { status: 500 }
    );
  }
}
