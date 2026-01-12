import { NextRequest } from 'next/server';
import { getSSEManager } from '@/lib/sse-manager';

/**
 * GET /api/sse/dashboard
 * Server-Sent Events endpoint for real-time dashboard updates
 * 
 * This endpoint:
 * - Maintains persistent connections with clients
 * - Broadcasts capacity updates when parking lot occupancy changes
 * - Broadcasts new alerts when created
 * - Broadcasts new violations when detected
 * - Sends periodic ping messages to keep connections alive
 * 
 * Requirements: 4.6, 7.5, 10.2
 */
export async function GET(request: NextRequest) {
  // Generate unique client ID
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  console.log(`[SSE] New connection request from client: ${clientId}`);

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Get SSE manager and register this client
      const sseManager = getSSEManager();
      sseManager.addClient(clientId, controller);

      // Send initial connection message
      const initialMessage = `event: connected\ndata: ${JSON.stringify({ 
        clientId, 
        timestamp: new Date(),
        message: 'Connected to dashboard updates'
      })}\n\n`;
      
      controller.enqueue(initialMessage);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`[SSE] Client disconnected: ${clientId}`);
        sseManager.removeClient(clientId);
        try {
          controller.close();
        } catch (error) {
          // Controller might already be closed
        }
      });
    },
    cancel() {
      // Clean up when stream is cancelled
      const sseManager = getSSEManager();
      sseManager.removeClient(clientId);
      console.log(`[SSE] Stream cancelled for client: ${clientId}`);
    },
  });

  // Return response with SSE headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering in nginx
    },
  });
}
