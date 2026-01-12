/**
 * SSE Manager - Server-Sent Events connection manager
 * 
 * This manager:
 * - Maintains client connections
 * - Broadcasts updates to all connected clients
 * - Handles client disconnections
 * - Provides methods to broadcast capacity updates, alerts, and violations
 * 
 * Requirements: 4.6, 7.5, 10.2
 */

export type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController;
  connectedAt: Date;
};

export type SSEEvent = {
  type: 'capacity_update' | 'alert' | 'violation' | 'ping';
  data: any;
};

class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start ping interval to keep connections alive
    this.startPingInterval();
  }

  /**
   * Add a new client connection
   */
  addClient(id: string, controller: ReadableStreamDefaultController): void {
    this.clients.set(id, {
      id,
      controller,
      connectedAt: new Date(),
    });
    console.log(`[SSEManager] Client connected: ${id}. Total clients: ${this.clients.size}`);
  }

  /**
   * Remove a client connection
   */
  removeClient(id: string): void {
    this.clients.delete(id);
    console.log(`[SSEManager] Client disconnected: ${id}. Total clients: ${this.clients.size}`);
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Broadcast an event to all connected clients
   */
  broadcast(event: SSEEvent): void {
    const message = this.formatSSEMessage(event);
    const deadClients: string[] = [];

    this.clients.forEach((client) => {
      try {
        client.controller.enqueue(message);
      } catch (error) {
        console.error(`[SSEManager] Failed to send to client ${client.id}:`, error);
        deadClients.push(client.id);
      }
    });

    // Remove dead clients
    deadClients.forEach((id) => this.removeClient(id));

    console.log(`[SSEManager] Broadcasted ${event.type} to ${this.clients.size} clients`);
  }

  /**
   * Broadcast capacity update
   */
  broadcastCapacityUpdate(data: {
    parkingLotId: string;
    totalSlots: number;
    occupied: number;
    empty: number;
    occupancyRate: number;
    timestamp: Date;
  }): void {
    this.broadcast({
      type: 'capacity_update',
      data,
    });
  }

  /**
   * Broadcast new alert
   */
  broadcastAlert(data: {
    _id: string;
    type: string;
    severity: string;
    parkingLotId: string;
    contractorId?: string;
    message: string;
    status: string;
    createdAt: Date;
  }): void {
    this.broadcast({
      type: 'alert',
      data,
    });
  }

  /**
   * Broadcast new violation
   */
  broadcastViolation(data: {
    _id: string;
    contractorId: string;
    parkingLotId: string;
    violationType: string;
    timestamp: Date;
    details: any;
    penalty: number;
    status: string;
  }): void {
    this.broadcast({
      type: 'violation',
      data,
    });
  }

  /**
   * Send ping to all clients to keep connections alive
   */
  private sendPing(): void {
    this.broadcast({
      type: 'ping',
      data: { timestamp: new Date() },
    });
  }

  /**
   * Start ping interval (every 30 seconds)
   */
  private startPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.clients.size > 0) {
        this.sendPing();
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stop ping interval
   */
  stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Format SSE message according to SSE protocol
   */
  private formatSSEMessage(event: SSEEvent): string {
    const data = JSON.stringify(event.data);
    return `event: ${event.type}\ndata: ${data}\n\n`;
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    this.clients.forEach((client) => {
      try {
        client.controller.close();
      } catch (error) {
        console.error(`[SSEManager] Error closing client ${client.id}:`, error);
      }
    });
    this.clients.clear();
    this.stopPingInterval();
    console.log('[SSEManager] All clients disconnected');
  }
}

// Singleton instance
let sseManager: SSEManager | null = null;

/**
 * Get the SSE manager singleton instance
 */
export function getSSEManager(): SSEManager {
  if (!sseManager) {
    sseManager = new SSEManager();
  }
  return sseManager;
}

/**
 * Reset the SSE manager (for testing)
 */
export function resetSSEManager(): void {
  if (sseManager) {
    sseManager.closeAll();
    sseManager = null;
  }
}
