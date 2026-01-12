/**
 * Lot Monitor Handler - Server-side WebSocket handler for parking capacity monitoring
 * 
 * This handler:
 * - Connects to Python backend /ws/lot-monitor endpoint
 * - Listens for capacity updates
 * - Creates capacity logs in the database
 * - Updates parking lot slot statuses
 * - Detects violations when occupancy exceeds allocated capacity
 * - Creates alerts for capacity warnings and breaches
 * - Handles reconnection on failure
 * 
 * Requirements: 4.2
 */

import { PythonBackendClient, CapacityUpdate } from './python-backend-client';
import CapacityLog from '@/models/CapacityLog';
import ParkingLot from '@/models/ParkingLot';
import Contractor from '@/models/Contractor';
import Violation from '@/models/Violation';
import Alert from '@/models/Alert';
import connectDB from './mongodb';
import { getSSEManager } from './sse-manager';

export class LotMonitorHandler {
  private client: PythonBackendClient;
  private parkingLotId?: string;
  private isRunning: boolean = false;

  constructor(parkingLotId?: string) {
    this.parkingLotId = parkingLotId;
    this.client = new PythonBackendClient();
  }

  /**
   * Start the lot monitor handler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[LotMonitorHandler] Already running');
      return;
    }

    console.log('[LotMonitorHandler] Starting lot monitor handler...');
    this.isRunning = true;

    // Ensure database connection
    await connectDB();

    // Register callback for capacity updates
    this.client.onCapacityUpdate(async (data: CapacityUpdate) => {
      await this.handleCapacityUpdate(data);
    });

    // Connect to Python backend
    try {
      await this.client.connectLotMonitor(this.parkingLotId, (error) => {
        console.error('[LotMonitorHandler] Connection error:', error);
      });
      console.log('[LotMonitorHandler] Connected to Python backend lot monitor');
    } catch (error) {
      console.error('[LotMonitorHandler] Failed to connect:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the lot monitor handler
   */
  stop(): void {
    console.log('[LotMonitorHandler] Stopping lot monitor handler...');
    this.client.disconnectLot();
    this.isRunning = false;
  }

  /**
   * Check if handler is running
   */
  isActive(): boolean {
    return this.isRunning && this.client.isLotConnected();
  }

  /**
   * Handle capacity update from Python backend
   */
  private async handleCapacityUpdate(data: CapacityUpdate): Promise<void> {
    try {
      console.log('[LotMonitorHandler] Received capacity update:', {
        totalSlots: data.total_slots,
        occupied: data.occupied,
        empty: data.empty,
        occupancyRate: data.occupancy_rate,
        timestamp: data.timestamp,
      });

      // For now, we'll need to determine the parking lot from the update
      // In a real scenario, this would be passed via the WebSocket connection
      if (!this.parkingLotId) {
        console.warn('[LotMonitorHandler] No parking lot ID configured, skipping capacity update');
        return;
      }

      // Get parking lot details
      const parkingLot = await ParkingLot.findById(this.parkingLotId);
      if (!parkingLot) {
        console.error('[LotMonitorHandler] Parking lot not found:', this.parkingLotId);
        return;
      }

      // Get contractor details
      const contractor = await Contractor.findById(parkingLot.contractorId);
      if (!contractor) {
        console.error('[LotMonitorHandler] Contractor not found:', parkingLot.contractorId);
        return;
      }

      // Create capacity log
      await this.createCapacityLog(data, parkingLot, contractor);

      // Update parking lot slots
      await this.updateParkingLotSlots(data, parkingLot);

      // Check for violations
      await this.checkViolations(data, parkingLot, contractor);

      // Check for capacity warnings
      await this.checkCapacityWarnings(data, parkingLot);

      // Update lot camera last seen
      parkingLot.lotCamera.lastSeen = new Date();
      parkingLot.lotCamera.status = 'active';
      await parkingLot.save();

      // Broadcast capacity update to connected clients via SSE
      const sseManager = getSSEManager();
      sseManager.broadcastCapacityUpdate({
        parkingLotId: parkingLot._id.toString(),
        totalSlots: data.total_slots,
        occupied: data.occupied,
        empty: data.empty,
        occupancyRate: data.occupancy_rate,
        timestamp: new Date(data.timestamp * 1000),
      });
    } catch (error) {
      console.error('[LotMonitorHandler] Error handling capacity update:', error);
    }
  }

  /**
   * Create capacity log entry
   */
  private async createCapacityLog(
    data: CapacityUpdate,
    parkingLot: any,
    contractor: any
  ): Promise<void> {
    try {
      const capacityLog = new CapacityLog({
        parkingLotId: parkingLot._id,
        contractorId: contractor._id,
        timestamp: new Date(data.timestamp * 1000), // Convert Unix timestamp to Date
        totalSlots: data.total_slots,
        occupied: data.occupied,
        empty: data.empty,
        occupancyRate: data.occupancy_rate,
        slots: data.slots.map((slot) => ({
          slotId: slot.slot_id,
          status: slot.status,
          confidence: slot.confidence,
        })),
        processingTime: data.processing_time_ms,
      });

      await capacityLog.save();
      console.log('[LotMonitorHandler] Capacity log created:', capacityLog._id);
    } catch (error) {
      console.error('[LotMonitorHandler] Error creating capacity log:', error);
      throw error;
    }
  }

  /**
   * Update parking lot slots with current status
   */
  private async updateParkingLotSlots(
    data: CapacityUpdate,
    parkingLot: any
  ): Promise<void> {
    try {
      // If slots are not initialized, initialize them
      if (!parkingLot.slots || parkingLot.slots.length === 0) {
        console.log('[LotMonitorHandler] Initializing parking lot slots');
        parkingLot.slots = data.slots.map((slot) => ({
          slotId: slot.slot_id,
          bbox: slot.bbox,
          status: slot.status,
          lastUpdated: new Date(),
        }));
      } else {
        // Update existing slots
        for (const slotUpdate of data.slots) {
          const existingSlot = parkingLot.slots.find(
            (s: any) => s.slotId === slotUpdate.slot_id
          );
          
          if (existingSlot) {
            existingSlot.status = slotUpdate.status;
            existingSlot.lastUpdated = new Date();
          } else {
            // Add new slot if it doesn't exist
            parkingLot.slots.push({
              slotId: slotUpdate.slot_id,
              bbox: slotUpdate.bbox,
              status: slotUpdate.status,
              lastUpdated: new Date(),
            });
          }
        }
      }

      await parkingLot.save();
      console.log('[LotMonitorHandler] Parking lot slots updated');
    } catch (error) {
      console.error('[LotMonitorHandler] Error updating parking lot slots:', error);
      throw error;
    }
  }

  /**
   * Check for violations (occupancy exceeds allocated capacity)
   */
  private async checkViolations(
    data: CapacityUpdate,
    parkingLot: any,
    contractor: any
  ): Promise<void> {
    try {
      const allocatedCapacity = contractor.contractDetails.allocatedCapacity;
      const actualOccupancy = data.occupied;

      if (actualOccupancy > allocatedCapacity) {
        console.log('[LotMonitorHandler] Violation detected:', {
          allocated: allocatedCapacity,
          actual: actualOccupancy,
          excess: actualOccupancy - allocatedCapacity,
        });

        // Check if there's already an active violation for this parking lot
        const existingViolation = await Violation.findOne({
          parkingLotId: parkingLot._id,
          contractorId: contractor._id,
          status: 'pending',
        });

        if (!existingViolation) {
          // Create new violation
          const violation = new Violation({
            contractorId: contractor._id,
            parkingLotId: parkingLot._id,
            violationType: 'capacity_breach',
            timestamp: new Date(data.timestamp * 1000),
            details: {
              allocatedCapacity,
              actualOccupancy,
              excessVehicles: actualOccupancy - allocatedCapacity,
              duration: 0, // Will be updated as violation persists
            },
            penalty: contractor.contractDetails.penaltyPerViolation,
            status: 'pending',
          });

          await violation.save();
          console.log('[LotMonitorHandler] Violation created:', violation._id);

          // Broadcast violation to connected clients via SSE
          const sseManager = getSSEManager();
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

          // Create high-severity alert for violation
          await this.createAlert({
            type: 'violation_detected',
            severity: 'high',
            parkingLotId: parkingLot._id,
            contractorId: contractor._id,
            message: `Capacity breach detected at ${parkingLot.name}. Occupancy: ${actualOccupancy}/${allocatedCapacity}`,
            data: {
              violationId: violation._id,
              allocatedCapacity,
              actualOccupancy,
              excessVehicles: actualOccupancy - allocatedCapacity,
            },
          });
        } else {
          // Update existing violation duration
          const now = new Date();
          const violationStart = existingViolation.timestamp;
          const durationMs = now.getTime() - violationStart.getTime();
          const durationMinutes = Math.floor(durationMs / 60000);

          existingViolation.details.duration = durationMinutes;
          existingViolation.details.actualOccupancy = actualOccupancy;
          existingViolation.details.excessVehicles = actualOccupancy - allocatedCapacity;
          
          await existingViolation.save();
          console.log('[LotMonitorHandler] Violation updated:', existingViolation._id, 'Duration:', durationMinutes, 'minutes');
        }
      } else {
        // Check if there's an active violation that should be resolved
        const existingViolation = await Violation.findOne({
          parkingLotId: parkingLot._id,
          contractorId: contractor._id,
          status: 'pending',
        });

        if (existingViolation) {
          console.log('[LotMonitorHandler] Violation resolved (occupancy back to normal)');
          // Note: We don't auto-resolve violations, they need manual acknowledgment
          // But we could create an alert that the situation has improved
        }
      }
    } catch (error) {
      console.error('[LotMonitorHandler] Error checking violations:', error);
      throw error;
    }
  }

  /**
   * Check for capacity warnings (occupancy > 90% of total capacity)
   */
  private async checkCapacityWarnings(
    data: CapacityUpdate,
    parkingLot: any
  ): Promise<void> {
    try {
      const warningThreshold = 0.9; // 90%
      
      if (data.occupancy_rate > warningThreshold) {
        console.log('[LotMonitorHandler] Capacity warning:', {
          occupancyRate: data.occupancy_rate,
          threshold: warningThreshold,
        });

        // Check if there's already an active warning alert
        const existingAlert = await Alert.findOne({
          parkingLotId: parkingLot._id,
          type: 'capacity_warning',
          status: 'active',
        });

        if (!existingAlert) {
          // Create warning alert
          await this.createAlert({
            type: 'capacity_warning',
            severity: 'medium',
            parkingLotId: parkingLot._id,
            message: `Parking lot ${parkingLot.name} is ${Math.round(data.occupancy_rate * 100)}% full`,
            data: {
              occupancyRate: data.occupancy_rate,
              occupied: data.occupied,
              totalSlots: data.total_slots,
            },
          });
        }
      }
    } catch (error) {
      console.error('[LotMonitorHandler] Error checking capacity warnings:', error);
      throw error;
    }
  }

  /**
   * Create an alert
   */
  private async createAlert(alertData: {
    type: 'capacity_warning' | 'capacity_breach' | 'camera_offline' | 'violation_detected';
    severity: 'low' | 'medium' | 'high' | 'critical';
    parkingLotId: any;
    contractorId?: any;
    message: string;
    data: any;
  }): Promise<void> {
    try {
      const alert = new Alert(alertData);
      await alert.save();
      console.log('[LotMonitorHandler] Alert created:', alert._id, alert.type);
      
      // Broadcast alert to connected clients via SSE
      const sseManager = getSSEManager();
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
    } catch (error) {
      console.error('[LotMonitorHandler] Error creating alert:', error);
      throw error;
    }
  }
}

// Singleton instance for the default lot monitor
let defaultLotMonitorHandler: LotMonitorHandler | null = null;

/**
 * Get or create the default lot monitor handler
 */
export function getLotMonitorHandler(parkingLotId?: string): LotMonitorHandler {
  if (!defaultLotMonitorHandler) {
    defaultLotMonitorHandler = new LotMonitorHandler(parkingLotId);
  }
  return defaultLotMonitorHandler;
}

/**
 * Start the default lot monitor handler
 */
export async function startLotMonitor(parkingLotId?: string): Promise<void> {
  const handler = getLotMonitorHandler(parkingLotId);
  await handler.start();
}

/**
 * Stop the default lot monitor handler
 */
export function stopLotMonitor(): void {
  if (defaultLotMonitorHandler) {
    defaultLotMonitorHandler.stop();
    defaultLotMonitorHandler = null;
  }
}
