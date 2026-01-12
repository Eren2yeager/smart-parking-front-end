import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

/**
 * Health check endpoint to verify MongoDB connection
 * GET /api/health
 */
export async function GET() {
  try {
    const mongoose = await connectDB();
    
    return NextResponse.json({
      status: 'ok',
      message: 'MongoDB connection successful',
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'MongoDB connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
