import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import CapacityLog from '@/models/CapacityLog';
import ParkingLot from '@/models/ParkingLot';
import Contractor from '@/models/Contractor';
import Violation from '@/models/Violation';
import Alert from '@/models/Alert';
import { getSSEManager } from '@/lib/sse-manager';

// Validation schema for capacity update
const capacityUpdateSchema = z.object({
  parkingLotId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid parking lot ID'),
  timestamp: z.string().datetime().optional(),
  totalSlots: z.number().int().min(0),
  occupied: z.number().int().min(0),
  empty: z.number().int().min(0),
  slots: z.array(
    z.object({
      slotId: z.number().int().min(1),
      status: z.enum(['occupied', 'empty']),
      confidence: z.number().min(0).max(1),
    })
  ),
  processingTime: z.number().min(0).optional().default(0),
});

/**
 * POST /api/capacity/update
 * Process capacity update from Python backend
 * - Create CapacityLog entry
 * - Update ParkingLot slots array
 * - Check for violations (occupancy > allocated)
 * - Create Violation and Alert if threshold exceeded
 * - Broadcast update to connected clients
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Parse and validate request body
    const body = await request.json();
    const validationResult = capacityUpdateSchema.safeParse(body);

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

    // Fetch parking lot with contractor details
    const parkingLot = await ParkingLot.findById(data.parkingLotId);
    if (!parkingLot) {
      return NextResponse.json(
        { error: 'Not found', message: 'Parking lot not found' },
        { status: 404 }
      );
    }

    const contractor = await Contractor.findById(parkingLot.contractorId);
    if (!contractor) {
      return NextResponse.json(
        { error: 'Not found', message: 'Contractor not found' },
        { status: 404 }
      );
    }

    // Calculate occupancy rate
    const occupancyRate = data.totalSlots > 0 ? data.occupied / data.totalSlots : 0;

    // Create CapacityLog entry
    const capacityLog = await CapacityLog.create({
      parkingLotId: data.parkingLotId,
      contractorId: parkingLot.contractorId,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      totalSlots: data.totalSlots,
      occupied: data.occupied,
      empty: data.empty,
      occupancyRate,
      slots: data.slots,
      processingTime: data.processingTime,
    });

    // Update ParkingLot slots array
    const updatedSlots = parkingLot.slots.map((slot) => {
      const updatedSlot = data.slots.find((s) => s.slotId === slot.slotId);
      if (updatedSlot) {
        return {
          slotId: slot.slotId,
          bbox: slot.bbox,
          status: updatedSlot.status,
          lastUpdated: new Date(),
        };
      }
      return {
        slotId: slot.slotId,
        bbox: slot.bbox,
        status: slot.status,
        lastUpdated: slot.lastUpdated,
      };
    });

    parkingLot.slots = updatedSlots;
    parkingLot.lotCamera.lastSeen = new Date();
    await parkingLot.save();

    // Check for violations and alerts
    const allocatedCapacity = contractor.contractDetails.allocatedCapacity;
    const alerts = [];
    let violation = null;

    // Check for capacity breach (occupancy > allocated)
    if (data.occupied > allocatedCapacity) {
      // Create Violation
      violation = await Violation.create({
        contractorId: parkingLot.contractorId,
        parkingLotId: data.parkingLotId,
        violationType: 'capacity_breach',
        timestamp: new Date(),
        details: {
          allocatedCapacity,
          actualOccupancy: data.occupied,
          excessVehicles: data.occupied - allocatedCapacity,
          duration: 0,
        },
        penalty: contractor.contractDetails.penaltyPerViolation,
        status: 'pending',
      });

      // Create critical alert for capacity breach
      const breachAlert = await Alert.create({
        type: 'capacity_breach',
        severity: 'critical',
        parkingLotId: data.parkingLotId,
        contractorId: parkingLot.contractorId,
        message: `Capacity breach at ${parkingLot.name}: ${data.occupied}/${allocatedCapacity} vehicles (${data.occupied - allocatedCapacity} excess)`,
        data: {
          occupancy: data.occupied,
          allocatedCapacity,
          excessVehicles: data.occupied - allocatedCapacity,
          violationId: violation._id,
        },
        status: 'active',
      });
      alerts.push(breachAlert);

      // Also create violation_detected alert
      const violationAlert = await Alert.create({
        type: 'violation_detected',
        severity: 'high',
        parkingLotId: data.parkingLotId,
        contractorId: parkingLot.contractorId,
        message: `Violation detected at ${parkingLot.name}: Contractor exceeded allocated capacity`,
        data: {
          violationId: violation._id,
          violationType: 'capacity_breach',
        },
        status: 'active',
      });
      alerts.push(violationAlert);
    }
    // Check for capacity warning (occupancy > 90% of total)
    else if (occupancyRate > 0.9) {
      const warningAlert = await Alert.create({
        type: 'capacity_warning',
        severity: 'medium',
        parkingLotId: data.parkingLotId,
        contractorId: parkingLot.contractorId,
        message: `High occupancy at ${parkingLot.name}: ${Math.round(occupancyRate * 100)}% full`,
        data: {
          occupancy: data.occupied,
          totalSlots: data.totalSlots,
          occupancyRate,
        },
        status: 'active',
      });
      alerts.push(warningAlert);
    }

    // Broadcast capacity update to connected clients
    const sseManager = getSSEManager();
    sseManager.broadcastCapacityUpdate({
      parkingLotId: data.parkingLotId,
      totalSlots: data.totalSlots,
      occupied: data.occupied,
      empty: data.empty,
      occupancyRate,
      timestamp: capacityLog.timestamp,
    });

    // Broadcast alerts to connected clients
    alerts.forEach((alert) => {
      sseManager.broadcastAlert({
        _id: alert._id.toString(),
        type: alert.type,
        severity: alert.severity,
        parkingLotId: alert.parkingLotId.toString(),
        contractorId: alert.contractorId?.toString(),
        message: alert.message,
        status: alert.status,
        createdAt: alert.createdAt,
      });
    });

    // Broadcast violation to connected clients
    if (violation) {
      sseManager.broadcastViolation({
        _id: violation._id.toString(),
        contractorId: violation.contractorId.toString(),
        parkingLotId: violation.parkingLotId.toString(),
        violationType: violation.violationType,
        timestamp: violation.timestamp,
        details: violation.details,
        penalty: violation.penalty,
        status: violation.status,
      });
    }

    return NextResponse.json(
      {
        data: {
          capacityLog,
          violation,
          alerts,
        },
        message: 'Capacity update processed successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error processing capacity update:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to process capacity update',
      },
      { status: 500 }
    );
  }
}
