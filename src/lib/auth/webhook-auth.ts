import { NextRequest, NextResponse } from "next/server";

const WEBHOOK_SECRET =
  process.env.AI_WEBHOOK_SECRET;

/**
 * Verify X-AI-Secret on incoming webhook requests.
 * Returns null if valid, or a 401 NextResponse if invalid.
 */
export function verifyWebhookSecret(request: NextRequest): NextResponse | null {
  if (!WEBHOOK_SECRET) {
    console.warn(
      "[webhook-auth] AI_WEBHOOK_SECRET not set — skipping auth",
    );
    return null;
  }

  const provided =
    request.headers.get("X-AI-Secret") ??
    "";
  if (provided !== WEBHOOK_SECRET) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized: invalid or missing X-AI-Secret header",
      },
      { status: 401 },
    );
  }

  return null;
}
