import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db/mongodb";
import CapacityLog from "@/models/CapacityLog";
import ParkingLot from "@/models/ParkingLot";
import Contractor from "@/models/Contractor";
import Violation from "@/models/Violation";
import Alert from "@/models/Alert";
import { getSSEManager } from "@/lib/realtime/sse-manager";
import { matchSlotsHybrid, getMatchingStats } from "@/lib/utils/bbox-matcher";

// Validation schema for capacity update
const capacityUpdateSchema = z.object({
  parkingLotId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid parking lot ID"),
  timestamp: z.string().datetime().optional(),
  totalSlots: z.number().int().min(0),
  occupied: z.number().int().min(0),
  empty: z.number().int().min(0),
  slots: z.array(
    z.object({
      slotId: z.number().int().min(1),
      status: z.enum(["occupied", "empty"]),
      confidence: z.number().min(0).max(1),
      bbox: z.object({
        x1: z.number(),
        y1: z.number(),
        x2: z.number(),
        y2: z.number(),
      }).optional(),
    }),
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
          error: "Validation failed",
          details: validationResult.error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    const data = validationResult.data;

    // Fetch parking lot with contractor details
    const parkingLot = await ParkingLot.findById(data.parkingLotId);
    if (!parkingLot) {
      return NextResponse.json(
        { error: "Not found", message: "Parking lot not found" },
        { status: 404 },
      );
    }

    const contractor = await Contractor.findById(parkingLot.contractorId);
    if (!contractor) {
      return NextResponse.json(
        { error: "Not found", message: "Contractor not found" },
        { status: 404 },
      );
    }

    // Calculate occupancy rate
    const occupancyRate =
      data.totalSlots > 0 ? data.occupied / data.totalSlots : 0;

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

    // Update ParkingLot slots array using bbox matching
    // This ensures accurate slot updates even when slot IDs don't match perfectly
    
    // Prepare detected slots with bbox for matching
    const detectedSlotsWithBBox = data.slots.map(slot => ({
      slotId: slot.slotId,
      status: slot.status,
      confidence: slot.confidence,
      bbox: slot.bbox || { x1: 0, y1: 0, x2: 0, y2: 0 },
    }));

    // Prepare DB slots with bbox for matching
    const dbSlotsWithBBox = parkingLot.slots.map(slot => ({
      slotId: slot.slotId,
      bbox: slot.bbox,
      status: slot.status,
    }));

    // Match detected slots with DB slots using hybrid approach (bbox + slot ID)
    const matches = matchSlotsHybrid(detectedSlotsWithBBox, dbSlotsWithBBox, 0.3);
    
    // Get matching statistics for logging
    const stats = getMatchingStats(matches, detectedSlotsWithBBox, dbSlotsWithBBox);
    console.log('[Capacity Update] Slot matching stats:', stats);

    // Update slots based on matches
    const updatedSlots = parkingLot.slots.map((slot) => {
      const matchedDetectedSlot = matches.get(slot.slotId);
      
      if (matchedDetectedSlot) {
        // Update with detected status
        return {
          slotId: slot.slotId,
          bbox: slot.bbox, // Keep original bbox from DB
          status: matchedDetectedSlot.status as "occupied" | "empty",
          lastUpdated: new Date(),
        };
      }
      
      // Slot not detected - keep current status
      return {
        slotId: slot.slotId,
        bbox: slot.bbox,
        status: slot.status as "occupied" | "empty",
        lastUpdated: slot.lastUpdated,
      };
    });

    parkingLot.slots = updatedSlots;
    parkingLot.lotCamera.lastSeen = new Date();
    await parkingLot.save();

    // Check for violations and alerts (avoid duplicates; resolve when occupancy is back to normal)
    const allocatedCapacity = contractor.contractDetails.allocatedCapacity;
    const alerts: any[] = [];
    let violation = null;

    const isBreach = data.occupied > allocatedCapacity;
    const isHighOccupancy = !isBreach && occupancyRate > 0.9;

    if (isBreach) {
      // Only create ONE pending violation per lot – reuse existing if still pending
      let existingViolation = await Violation.findOne({
        parkingLotId: data.parkingLotId,
        contractorId: parkingLot.contractorId,
        violationType: "capacity_breach",
        status: "pending",
      });
      if (existingViolation) {
        violation = existingViolation;
        existingViolation.details.actualOccupancy = data.occupied;
        existingViolation.details.excessVehicles =
          data.occupied - allocatedCapacity;
        const durationMs = Date.now() - existingViolation.timestamp.getTime();
        existingViolation.details.duration = Math.floor(durationMs / 60000);
        await existingViolation.save();
      } else {
        violation = await Violation.create({
          contractorId: parkingLot.contractorId,
          parkingLotId: data.parkingLotId,
          violationType: "capacity_breach",
          timestamp: new Date(),
          details: {
            allocatedCapacity,
            actualOccupancy: data.occupied,
            excessVehicles: data.occupied - allocatedCapacity,
            duration: 0,
          },
          penalty: contractor.contractDetails.penaltyPerViolation,
          status: "pending",
        });
      }

      // Only create breach/violation alerts if we don't already have active ones for this lot
      const hasActiveBreachAlert = await Alert.exists({
        parkingLotId: data.parkingLotId,
        type: "capacity_breach",
        status: "active",
      });
      if (!hasActiveBreachAlert) {
        const breachAlert = await Alert.create({
          type: "capacity_breach",
          severity: "critical",
          parkingLotId: data.parkingLotId,
          contractorId: parkingLot.contractorId,
          title: "Capacity Breach",
          message: `Capacity breach at ${parkingLot.name}: ${data.occupied}/${allocatedCapacity} vehicles (${data.occupied - allocatedCapacity} excess)`,
          metadata: {
            occupancy: data.occupied,
            allocatedCapacity,
            excessVehicles: data.occupied - allocatedCapacity,
            violationId: violation._id,
          },
          status: "active",
        });
        alerts.push(breachAlert);
      }
      const hasActiveViolationAlert = await Alert.exists({
        parkingLotId: data.parkingLotId,
        type: "system",
        "metadata.violationType": "capacity_breach",
        status: "active",
      });
      if (!hasActiveViolationAlert) {
        const violationAlert = await Alert.create({
          type: "system",
          severity: "warning",
          parkingLotId: data.parkingLotId,
          contractorId: parkingLot.contractorId,
          title: "Violation Detected",
          message: `Violation detected at ${parkingLot.name}: Contractor exceeded allocated capacity`,
          metadata: {
            violationId: violation._id,
            violationType: "capacity_breach",
          },
          status: "active",
        });
        alerts.push(violationAlert);
      }
    } else {
      // Occupancy no longer in breach – resolve pending violation and related alerts for this lot
      const pendingViolations = await Violation.find({
        parkingLotId: data.parkingLotId,
        status: "pending",
        violationType: "capacity_breach",
      });
      for (const v of pendingViolations) {
        v.status = "resolved";
        v.resolvedAt = new Date();
        await v.save();
      }
      const resolvedCount = await Alert.updateMany(
        {
          parkingLotId: data.parkingLotId,
          status: "active",
          $or: [
            { type: "capacity_breach" },
            { type: "system", "metadata.violationType": "capacity_breach" },
          ],
        },
        { $set: { status: "resolved", resolvedAt: new Date() } },
      );
      if (resolvedCount.modifiedCount > 0) {
        console.log(
          "[capacity/update] Resolved",
          resolvedCount.modifiedCount,
          "breach-related alert(s) for lot",
          data.parkingLotId,
          "(occupancy back to",
          data.occupied,
          ")",
        );
      }
    }

    if (isHighOccupancy) {
      const hasActiveCapacityFullAlert = await Alert.exists({
        parkingLotId: data.parkingLotId,
        type: "capacity_full",
        status: "active",
      });
      if (!hasActiveCapacityFullAlert) {
        const warningAlert = await Alert.create({
          type: "capacity_full",
          severity: "warning",
          parkingLotId: data.parkingLotId,
          contractorId: parkingLot.contractorId,
          title: "High Occupancy",
          message: `High occupancy at ${parkingLot.name}: ${Math.round(occupancyRate * 100)}% full`,
          metadata: {
            occupancy: data.occupied,
            totalSlots: data.totalSlots,
            occupancyRate,
          },
          status: "active",
        });
        alerts.push(warningAlert);
      }
    } else if (occupancyRate <= 0.9) {
      await Alert.updateMany(
        {
          parkingLotId: data.parkingLotId,
          type: "capacity_full",
          status: "active",
        },
        { $set: { status: "resolved", resolvedAt: new Date() } },
      );
    }

    // Broadcast capacity update to connected clients
    const sseManager = getSSEManager();
    sseManager.broadcastCapacityUpdate({
      parkingLotId: data.parkingLotId,
      totalSlots: data.totalSlots,
      occupied: data.occupied,
      empty: data.empty,
      occupancyRate,
      slots: data.slots,
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
        message: "Capacity update processed successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error processing capacity update:", error?.message ?? error);
    if (error?.stack) console.error(error.stack);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to process capacity update",
        ...(process.env.NODE_ENV === "development" && {
          detail: String(error?.message ?? error),
        }),
      },
      { status: 500 },
    );
  }
}
