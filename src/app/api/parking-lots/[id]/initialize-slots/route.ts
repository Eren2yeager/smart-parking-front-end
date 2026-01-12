import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import ParkingLot from '@/models/ParkingLot';

// Validation schema for initializing slots with bounding boxes
const initializeSlotsSchema = z.object({
  slots: z.array(
    z.object({
      slotId: z.number().int().min(1),
      bbox: z.object({
        x1: z.number(),
        y1: z.number(),
        x2: z.number(),
        y2: z.number(),
      }),
      status: z.enum(['occupied', 'empty']).optional(),
    })
  ),
});

/**
 * POST /api/parking-lots/[id]/initialize-slots
 * Initialize or update slot bounding boxes from AI detection
 * 
 * This endpoint is used to set up the actual slot locations (bounding boxes)
 * from an AI detection result. Typically called once during parking lot setup
 * or when recalibrating slot positions.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id } = await params;

    // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'Parking lot ID must be a valid ObjectId' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = initializeSlotsSchema.safeParse(body);

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

    const { slots: detectedSlots } = validationResult.data;

    // Fetch parking lot
    const parkingLot = await ParkingLot.findById(id);

    if (!parkingLot) {
      return NextResponse.json(
        { error: 'Resource not found', message: `Parking lot with ID '${id}' does not exist` },
        { status: 404 }
      );
    }

    // Create or update slots with bounding boxes
    const now = new Date();
    const slotsMap = new Map(detectedSlots.map((s) => [s.slotId, s]));

    // If slots array is empty or doesn't match totalSlots, initialize it
    if (!parkingLot.slots || parkingLot.slots.length !== parkingLot.totalSlots) {
      parkingLot.slots = Array.from({ length: parkingLot.totalSlots }, (_, index) => {
        const slotId = index + 1;
        const detected = slotsMap.get(slotId);
        
        return {
          slotId,
          bbox: detected?.bbox || { x1: 0, y1: 0, x2: 0, y2: 0 },
          status: (detected?.status || 'empty') as 'occupied' | 'empty',
          lastUpdated: now,
        };
      });
    } else {
      // Update existing slots with new bounding boxes
      parkingLot.slots.forEach((slot) => {
        const detected = slotsMap.get(slot.slotId);
        if (detected) {
          slot.bbox = detected.bbox;
          if (detected.status) {
            slot.status = detected.status;
          }
          slot.lastUpdated = now;
        }
      });
    }

    await parkingLot.save();

    const slotsWithBbox = parkingLot.slots.filter(
      (s) => s.bbox.x1 !== 0 || s.bbox.y1 !== 0 || s.bbox.x2 !== 0 || s.bbox.y2 !== 0
    ).length;

    return NextResponse.json({
      data: {
        totalSlots: parkingLot.totalSlots,
        slotsInitialized: slotsWithBbox,
        slotsWithoutBbox: parkingLot.totalSlots - slotsWithBbox,
      },
      message: `Initialized ${slotsWithBbox} slot(s) with bounding boxes`,
    });
  } catch (error: any) {
    console.error('Error initializing slots:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to initialize slots' },
      { status: 500 }
    );
  }
}
