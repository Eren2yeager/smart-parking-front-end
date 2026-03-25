import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSecret } from "@/lib/auth/webhook-auth";

const PARKING_LOT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Webhook: capacity update from AI backend lot monitor.
 * Expects: parking_lot_id, total_slots, occupied, empty (optional), slots (optional), timestamp.
 * parking_lot_id must be 24-char hex. empty is computed as total_slots - occupied if missing.
 */
export async function POST(request: NextRequest) {
  const authError = verifyWebhookSecret(request);
  if (authError) return authError;

  try {
    const data = await request.json();
    const parkingLotId = String(
      data.parking_lot_id ?? data.parkingLotId ?? "",
    ).trim();
    const totalSlots = Number(data.total_slots) || 0;
    const occupied = Number(data.occupied) || 0;
    const emptyProvided = data.empty != null;
    const empty = emptyProvided
      ? Number(data.empty) || 0
      : Math.max(0, totalSlots - occupied);
    const slotsCount = data.slots?.length ?? 0;

    console.log("[AI webhook/capacity] Received:", {
      parkingLotId,
      totalSlots,
      occupied,
      empty: emptyProvided ? data.empty : `(computed=${empty})`,
      slots_count: slotsCount,
    });

    if (!parkingLotId) {
      console.warn(
        "[AI webhook/capacity] Rejected: missing parking_lot_id",
      );
      return NextResponse.json(
        { success: false, error: "Missing parking_lot_id" },
        { status: 400 },
      );
    }
    if (!PARKING_LOT_ID_REGEX.test(parkingLotId)) {
      console.warn(
        "[AI webhook/capacity] Rejected: parking_lot_id must be 24-char hex, got:",
        parkingLotId.slice(0, 30),
      );
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid parking_lot_id: must be 24-character hex (MongoDB ObjectId)",
        },
        { status: 400 },
      );
    }

    const ts = data.timestamp != null ? Number(data.timestamp) : Date.now();
    const timestamp = Number.isFinite(ts)
      ? new Date(ts).toISOString()
      : new Date().toISOString();
    const transformedData = {
      parkingLotId,
      timestamp,
      totalSlots,
      occupied,
      empty,
      slots: (data.slots || []).map((slot: any, index: number) => ({
        slotId: Math.max(
          1,
          Number(slot.slot_id) ?? Number(slot.slotId) ?? index + 1,
        ),
        status:
          slot.status === "occupied" || slot.status === "empty"
            ? slot.status
            : "empty",
        confidence: Math.min(1, Math.max(0, Number(slot.confidence) || 0)),
      })),
      processingTime: Number(data.processing_time_ms) || 0,
    };

    console.log(
      "[AI webhook/capacity] Forwarding to /api/capacity/update:",
      {
        parkingLotId,
        totalSlots,
        occupied,
        empty,
        slots: transformedData.slots.length,
      },
    );

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/capacity/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transformedData),
    });

    const responseText = await response.text();
    if (!response.ok) {
      console.warn(
        "[AI webhook/capacity] /api/capacity/update response:",
        response.status,
        responseText.substring(0, 200),
      );
    }

    if (!response.ok) {
      console.error(
        "[AI webhook/capacity] /api/capacity/update failed:",
        response.status,
        responseText.slice(0, 300),
      );
      return NextResponse.json(
        {
          success: false,
          error: "Failed to process capacity update",
          details: responseText,
        },
        { status: response.status },
      );
    }

    const result = JSON.parse(responseText);
    console.log(
      "[AI webhook/capacity] Success:",
      parkingLotId,
      occupied,
      totalSlots,
    );

    return NextResponse.json({
      success: true,
      message: "Capacity event processed",
      data: result.data,
    });
  } catch (error: any) {
    console.error("[AI webhook/capacity] Error:", error?.message ?? error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process capacity event",
        message: error.message,
      },
      { status: 500 },
    );
  }
}
