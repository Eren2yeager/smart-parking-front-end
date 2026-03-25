import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { getSSEManager } from '@/lib/realtime/sse-manager';

type Status = 'online' | 'offline' | 'degraded';

export async function GET() {
  let dbStatus: Status = 'offline';
  let pythonStatus: Status = 'offline';
  let activeConnections = 0;

  try {
    const mongoose = await connectDB();
    dbStatus = mongoose.connection.readyState === 1 ? 'online' : 'offline';
  } catch {
    dbStatus = 'offline';
  }

  try {
    activeConnections = getSSEManager().getClientCount();
  } catch {
    activeConnections = 0;
  }

  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_AI_BACKEND_URL ||

      'http://localhost:8000';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res =
      await fetch(`${baseUrl}/api/health`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      }).catch(async () => {
        const controller2 = new AbortController();
        const timeout2 = setTimeout(() => controller2.abort(), 2500);
        const fallback = await fetch(baseUrl, {
          method: 'GET',
          cache: 'no-store',
          signal: controller2.signal,
        }).finally(() => clearTimeout(timeout2));
        return fallback;
      });

    clearTimeout(timeout);
    pythonStatus = res.ok ? 'online' : 'offline';
  } catch {
    pythonStatus = 'offline';
  }

  return NextResponse.json({
    database: dbStatus,
    pythonBackend: pythonStatus,
    activeConnections,
    timestamp: new Date().toISOString(),
  });
}
