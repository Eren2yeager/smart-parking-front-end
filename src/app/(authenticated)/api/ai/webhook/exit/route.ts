import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSecret } from "@/lib/auth/webhook-auth";

const PARKING_LOT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Webhook: vehicle exit from AI backend gate monitor.
 * Expects: parking_lot_id, plate_number, camera_id/gate_id, confidence; optional duration_seconds.
 */
export async function POST(request: NextRequest) {
  const authError = verifyWebhookSecret(request);
  if (authError) return authError;

  try {
    const data = await request.json();
    const parkingLotId = String(
      data.parking_lot_id ?? data.parkingLotId ?? "",
    ).trim();
    const plateNumber = (data.plate_number ?? data.plateNumber ?? "")
      .toString()
      .trim();
    const gateId = String(
      data.camera_id ?? data.gate_id ?? data.gateId ?? "ai-gate",
    );
    const confidence =
      typeof data.confidence === "number"
        ? Math.min(1, Math.max(0, data.confidence))
        : 0.9;

    console.log("[AI webhook/exit] Received:", {
      parkingLotId,
      plateNumber: plateNumber ? `${plateNumber.slice(0, 6)}…` : "",
      gateId,
    });

    if (!parkingLotId || !plateNumber) {
      console.warn(
        "[AI webhook/exit] Rejected: missing parking_lot_id or plate_number",
      );
      return NextResponse.json(
        { success: false, error: "Missing parking_lot_id or plate_number" },
        { status: 400 },
      );
    }
    if (!PARKING_LOT_ID_REGEX.test(parkingLotId)) {
      console.warn(
        "[AI webhook/exit] Rejected: invalid parking_lot_id (must be 24-char hex)",
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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/records/exit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parkingLotId,
        plateNumber,
        gateId,
        confidence,
      }),
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.warn(
        "[AI webhook/exit] records/exit returned",
        response.status,
        JSON.stringify(responseData).slice(0, 200),
      );
      return NextResponse.json(
        {
          success: false,
          error:
            responseData.error || responseData.message || "Records API error",
          data: responseData,
        },
        {
          status:
            response.status >= 400 && response.status < 500
              ? response.status
              : 500,
        },
      );
    }

    console.log(
      "[AI webhook/exit] Success:",
      plateNumber ? `${plateNumber.slice(0, 6)}…` : "",
    );
    return NextResponse.json({
      success: true,
      message: "Exit event processed",
      data: responseData.data,
    });
  } catch (error: any) {
    console.error("[AI webhook/exit] Error:", error?.message ?? error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process exit event",
        message: error?.message,
      },
      { status: 500 },
    );
  }
}
