import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import ParkingLot from '@/models/ParkingLot';
import CapacityLog from '@/models/CapacityLog';
import Alert from '@/models/Alert';
import Violation from '@/models/Violation';
import Contractor from '@/models/Contractor';

// Validation schema for updating slots
const updateSlotsSchema = z.object({
  slots: z.array(
    z.object({
      slotId: z.number().int().min(1),
      status: z.enum(['occupied', 'empty']),
    })
  ),
  detectedSlots: z.number().int().min(0).optional(), // Total slots detected by AI
});

/**
 * PUT /api/parking-lots/[id]/slots
 * Update parking slot occupancy status from AI detection
 * 
 * This endpoint handles real-time updates from the lot camera AI detection.
 * It carefully matches detected slots with database slots by slotId and updates
 * their occupancy status. The AI model may detect fewer or more slots than
 * stored in the database, so we trust the database's totalSlots count.
 */
export async function PUT(
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
    const validationResult = updateSlotsSchema.safeParse(body);

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

    const { slots: detectedSlots, detectedSlots: totalDetected } = validationResult.data;

    // Fetch current parking lot
    const parkingLot = await ParkingLot.findById(id);

    if (!parkingLot) {
      return NextResponse.json(
        { error: 'Resource not found', message: `Parking lot with ID '${id}' does not exist` },
        { status: 404 }
      );
    }

    // Initialize slots array if empty (for parking lots created before slot initialization)
    if (!parkingLot.slots || parkingLot.slots.length === 0) {
      parkingLot.slots = Array.from({ length: parkingLot.totalSlots }, (_, index) => ({
        slotId: index + 1,
        bbox: {
          x1: 0,
          y1: 0,
          x2: 0,
          y2: 0,
        },
        status: 'empty' as const,
        lastUpdated: new Date(),
      }));
      await parkingLot.save();
    }

    // Get AI detection info
    const aiDetectedTotal = totalDetected || detectedSlots.length;
    const aiOccupied = detectedSlots.filter((s) => s.status === 'occupied').length;
    const aiEmpty = detectedSlots.filter((s) => s.status === 'empty').length;
    
    let adjustmentNote = '';
    const now = new Date();
    let updatedCount = 0;

    // MAIN LOGIC: Check occupied count first
    
    // Case 1: AI detected MORE occupied than DB total slots → VIOLATION (Overparking)
    if (aiOccupied > parkingLot.totalSlots) {
      adjustmentNote = `OVERPARKING: AI detected ${aiOccupied} occupied slots, but DB only has ${parkingLot.totalSlots} total slots. Extra vehicles: ${aiOccupied - parkingLot.totalSlots}`;
      
      // Mark all DB slots as occupied (since we're over capacity)
      parkingLot.slots.forEach((slot) => {
        if (slot.status !== 'occupied') {
          slot.status = 'occupied';
          slot.lastUpdated = now;
          updatedCount++;
        }
      });
      
      // Save updated parking lot
      await parkingLot.save();
      
      // For overparking, use the ACTUAL AI occupied count (not limited to totalSlots)
      const occupied = aiOccupied; // Use real count: 40
      const empty = 0; // No empty slots when over capacity
      const occupancyRate = parkingLot.totalSlots > 0 ? occupied / parkingLot.totalSlots : 0; // 40/10 = 4.0 (400%)
      
      // Create capacity log with ACTUAL occupied count
      await CapacityLog.create({
        parkingLotId: id,
        contractorId: parkingLot.contractorId,
        timestamp: now,
        occupied, // 40 (actual count)
        empty, // 0
        totalSlots: parkingLot.totalSlots, // 10
        occupancyRate, // 4.0 (400%)
        slots: parkingLot.slots.map((slot) => ({
          slotId: slot.slotId,
          status: slot.status,
          confidence: 0.85,
        })),
        processingTime: 0,
      });
      
      // Update lot camera lastSeen
      parkingLot.lotCamera.lastSeen = now;
      parkingLot.lotCamera.status = 'active';
      await parkingLot.save();
      
      // Create overparking alert
      const extraVehicles = occupied - parkingLot.totalSlots;
      const existingAlert = await Alert.findOne({
        parkingLotId: id,
        type: 'overparking',
        status: 'active',
      });

      const alerts = [];
      if (!existingAlert) {
        const alert = await Alert.create({
          parkingLotId: id,
          contractorId: parkingLot.contractorId,
          type: 'overparking',
          severity: 'critical',
          title: 'Overparking Violation Detected',
          message: `Parking lot has ${extraVehicles} extra vehicle(s) beyond capacity. Occupied: ${occupied}/${parkingLot.totalSlots}`,
          metadata: {
            occupied,
            totalSlots: parkingLot.totalSlots,
            extraVehicles,
            timestamp: now,
          },
          status: 'active',
        });
        alerts.push({ type: 'overparking', alert });

        // Create violation record for tracking and penalties
        const contractor = await Contractor.findById(parkingLot.contractorId);
        const penaltyPerViolation = contractor?.contractDetails?.penaltyPerViolation || 500;
        
        await Violation.create({
          contractorId: parkingLot.contractorId,
          parkingLotId: id,
          violationType: 'overparking',
          timestamp: now,
          details: {
            allocatedCapacity: parkingLot.totalSlots,
            actualOccupancy: occupied,
            excessVehicles: extraVehicles,
            duration: 0, // Will be updated when resolved
          },
          penalty: penaltyPerViolation * extraVehicles,
          status: 'pending',
        });
      }
      
      return NextResponse.json({
        data: {
          updatedSlots: updatedCount,
          totalSlots: parkingLot.totalSlots,
          occupied,
          empty,
          occupancyRate,
          detectedSlots: detectedSlots.length,
          aiDetectedTotal,
          adjustmentNote,
          alerts: alerts.length > 0 ? alerts : undefined,
        },
        message: `OVERPARKING VIOLATION: ${updatedCount} slot(s) updated, ${extraVehicles} extra vehicle(s) detected`,
      });
    }
    // Case 2: AI occupied equals DB total slots → CAPACITY FULL
    else if (aiOccupied === parkingLot.totalSlots) {
      adjustmentNote = `CAPACITY FULL: All ${parkingLot.totalSlots} slots are occupied.`;
      
      // Update all DB slots to occupied
      parkingLot.slots.forEach((slot) => {
        if (slot.status !== 'occupied') {
          slot.status = 'occupied';
          slot.lastUpdated = now;
          updatedCount++;
        }
      });
    }
    // Case 3: Normal operation - update slots in sequence
    else {
      // If AI detected fewer slots than DB, update what we can see
      if (aiDetectedTotal < parkingLot.totalSlots) {
        adjustmentNote = `AI detected ${aiDetectedTotal} slots (${aiOccupied} occupied). DB has ${parkingLot.totalSlots} slots. Updated ${aiDetectedTotal} visible slots, rest unchanged.`;
      }
      // If AI detected more slots than DB, only update up to DB total
      else if (aiDetectedTotal > parkingLot.totalSlots) {
        adjustmentNote = `AI detected ${aiDetectedTotal} slots (${aiOccupied} occupied). DB has ${parkingLot.totalSlots} slots. Updated first ${parkingLot.totalSlots} slots.`;
      }
      
      // Update slots in sequence (1, 2, 3, ...)
      const slotsToUpdate = Math.min(detectedSlots.length, parkingLot.totalSlots);
      
      for (let i = 0; i < slotsToUpdate; i++) {
        const detectedSlot = detectedSlots[i];
        const dbSlot = parkingLot.slots.find(s => s.slotId === i + 1);
        
        if (dbSlot && dbSlot.status !== detectedSlot.status) {
          dbSlot.status = detectedSlot.status;
          dbSlot.lastUpdated = now;
          updatedCount++;
        }
      }
      
      // Remaining slots stay as they are (not changed)
    }

    // Save updated parking lot
    await parkingLot.save();

    // Calculate current occupancy from actual database slots
    const occupied = parkingLot.slots.filter((s) => s.status === 'occupied').length;
    const empty = parkingLot.slots.filter((s) => s.status === 'empty').length;
    const occupancyRate = parkingLot.totalSlots > 0 ? occupied / parkingLot.totalSlots : 0;

    // Create capacity log entry with all required fields
    await CapacityLog.create({
      parkingLotId: id,
      contractorId: parkingLot.contractorId,
      timestamp: now,
      occupied,
      empty,
      totalSlots: parkingLot.totalSlots,
      occupancyRate,
      slots: parkingLot.slots.map((slot) => ({
        slotId: slot.slotId,
        status: slot.status,
        confidence: 0.85, // Default confidence since we don't have it from detection
      })),
      processingTime: 0, // Processing time not available in this context
    });

    // Update lot camera lastSeen
    parkingLot.lotCamera.lastSeen = now;
    parkingLot.lotCamera.status = 'active';
    await parkingLot.save();

    // Check for alerts and violations
    const alerts = [];
    
    // CRITICAL: Overparking violation (occupied > totalSlots)
    if (occupied > parkingLot.totalSlots) {
      const extraVehicles = occupied - parkingLot.totalSlots;
      
      // Check if there's already an active overparking alert
      const existingAlert = await Alert.findOne({
        parkingLotId: id,
        type: 'overparking',
        status: 'active',
      });

      if (!existingAlert) {
        // Create new overparking alert
        const alert = await Alert.create({
          parkingLotId: id,
          contractorId: parkingLot.contractorId,
          type: 'overparking',
          severity: 'critical',
          title: 'Overparking Violation Detected',
          message: `Parking lot has ${extraVehicles} extra vehicle(s) beyond capacity. Occupied: ${occupied}/${parkingLot.totalSlots}`,
          metadata: {
            occupied,
            totalSlots: parkingLot.totalSlots,
            extraVehicles,
            timestamp: now,
          },
          status: 'active',
        });
        alerts.push({ type: 'overparking', alert });

        // Create violation record for tracking and penalties
        const contractor = await Contractor.findById(parkingLot.contractorId);
        const penaltyPerViolation = contractor?.contractDetails?.penaltyPerViolation || 500;
        
        await Violation.create({
          contractorId: parkingLot.contractorId,
          parkingLotId: id,
          violationType: 'overparking',
          timestamp: now,
          details: {
            allocatedCapacity: parkingLot.totalSlots,
            actualOccupancy: occupied,
            excessVehicles: extraVehicles,
            duration: 0, // Will be updated when resolved
          },
          penalty: penaltyPerViolation * extraVehicles,
          status: 'pending',
        });
      }
    } else {
      // Resolve any active overparking alerts if occupancy is back to normal
      await Alert.updateMany(
        {
          parkingLotId: id,
          type: 'overparking',
          status: 'active',
        },
        {
          status: 'resolved',
          resolvedAt: now,
        }
      );

      // Resolve any pending overparking violations
      await Violation.updateMany(
        {
          parkingLotId: id,
          violationType: 'overparking',
          status: 'pending',
        },
        {
          status: 'resolved',
          resolvedAt: now,
        }
      );
    }

    // WARNING: Capacity full (occupied = totalSlots)
    if (occupied === parkingLot.totalSlots && occupied > 0) {
      // Check if there's already an active capacity_full alert
      const existingAlert = await Alert.findOne({
        parkingLotId: id,
        type: 'capacity_full',
        status: 'active',
      });

      if (!existingAlert) {
        // Create new capacity full alert
        const alert = await Alert.create({
          parkingLotId: id,
          contractorId: parkingLot.contractorId,
          type: 'capacity_full',
          severity: 'warning',
          title: 'Parking Lot at Full Capacity',
          message: `All ${parkingLot.totalSlots} parking slots are now occupied. No more space available.`,
          metadata: {
            occupied,
            totalSlots: parkingLot.totalSlots,
            timestamp: now,
          },
          status: 'active',
        });
        alerts.push({ type: 'capacity_full', alert });
      }
    } else {
      // Resolve any active capacity_full alerts if space becomes available
      await Alert.updateMany(
        {
          parkingLotId: id,
          type: 'capacity_full',
          status: 'active',
        },
        {
          status: 'resolved',
          resolvedAt: now,
        }
      );
    }

    return NextResponse.json({
      data: {
        updatedSlots: updatedCount,
        totalSlots: parkingLot.totalSlots,
        occupied,
        empty,
        occupancyRate,
        detectedSlots: detectedSlots.length,
        aiDetectedTotal: totalDetected,
        adjustmentNote: adjustmentNote || undefined,
        alerts: alerts.length > 0 ? alerts : undefined,
      },
      message: `Updated ${updatedCount} slot(s) successfully`,
    });
  } catch (error: any) {
    console.error('Error updating parking slots:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update parking slots' },
      { status: 500 }
    );
  }
}
