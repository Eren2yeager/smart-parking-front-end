/**
 * Gate Monitor Handler - Server-side WebSocket handler for license plate detection
 * 
 * This handler:
 * - Connects to Python backend /ws/gate-monitor endpoint
 * - Listens for plate detections
 * - Creates or updates vehicle records in the database
 * - Handles reconnection on failure
 * 
 * Requirements: 3.2
 */

import { PythonBackendClient, PlateDetection } from './python-backend-client';
import VehicleRecord from '@/models/VehicleRecord';
import ParkingLot from '@/models/ParkingLot';
import connectDB from './mongodb';
import { getSSEManager } from './sse-manager';

export class GateMonitorHandler {
  private client: PythonBackendClient;
  private parkingLotId?: string;
  private isRunning: boolean = false;

  constructor(parkingLotId?: string) {
    this.parkingLotId = parkingLotId;
    this.client = new PythonBackendClient();
  }

  /**
   * Start the gate monitor handler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[GateMonitorHandler] Already running');
      return;
    }

    console.log('[GateMonitorHandler] Starting gate monitor handler...');
    this.isRunning = true;

    // Ensure database connection
    await connectDB();

    // Register callback for plate detections
    this.client.onPlateDetection(async (data: PlateDetection) => {
      await this.handlePlateDetection(data);
    });

    // Connect to Python backend
    try {
      await this.client.connectGateMonitor(this.parkingLotId, (error) => {
        console.error('[GateMonitorHandler] Connection error:', error);
      });
      console.log('[GateMonitorHandler] Connected to Python backend gate monitor');
    } catch (error) {
      console.error('[GateMonitorHandler] Failed to connect:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the gate monitor handler
   */
  stop(): void {
    console.log('[GateMonitorHandler] Stopping gate monitor handler...');
    this.client.disconnectGate();
    this.isRunning = false;
  }

  /**
   * Check if handler is running
   */
  isActive(): boolean {
    return this.isRunning && this.client.isGateConnected();
  }

  /**
   * Handle plate detection from Python backend
   */
  private async handlePlateDetection(data: PlateDetection): Promise<void> {
    try {
      console.log('[GateMonitorHandler] Received plate detection:', {
        plates: data.plates_detected,
        newPlates: data.new_plates,
        timestamp: data.timestamp,
      });

      // Process each detected plate
      for (const plate of data.plates) {
        if (!plate.is_new) {
          // Skip plates that are not new (already tracked)
          continue;
        }

        await this.processPlateDetection(plate, data);
      }
    } catch (error) {
      console.error('[GateMonitorHandler] Error handling plate detection:', error);
    }
  }

  /**
   * Process a single plate detection
   */
  private async processPlateDetection(
    plate: PlateDetection['plates'][0],
    detectionData: PlateDetection
  ): Promise<void> {
    try {
      // For now, we'll need to determine the parking lot from the detection
      // In a real scenario, this would be passed via the WebSocket connection
      // or determined from camera configuration
      
      // TODO: Implement logic to determine parking lot and gate from detection
      // For now, we'll log and skip if parkingLotId is not provided
      if (!this.parkingLotId) {
        console.warn('[GateMonitorHandler] No parking lot ID configured, skipping plate:', plate.plate_number);
        return;
      }

      // Get parking lot details
      const parkingLot = await ParkingLot.findById(this.parkingLotId);
      if (!parkingLot) {
        console.error('[GateMonitorHandler] Parking lot not found:', this.parkingLotId);
        return;
      }

      // Check if this is an entry or exit detection
      // This would typically be determined by which gate camera detected the plate
      // For now, we'll check if the vehicle already has an active entry
      const existingRecord = await VehicleRecord.findOne({
        plateNumber: plate.plate_number.toUpperCase(),
        parkingLotId: parkingLot._id,
        status: 'inside',
      });

      if (existingRecord) {
        // This is an exit detection
        await this.handleExitDetection(existingRecord, plate, detectionData, parkingLot);
      } else {
        // This is an entry detection
        await this.handleEntryDetection(plate, detectionData, parkingLot);
      }
    } catch (error) {
      console.error('[GateMonitorHandler] Error processing plate detection:', error);
    }
  }

  /**
   * Handle entry detection - create new vehicle record
   */
  private async handleEntryDetection(
    plate: PlateDetection['plates'][0],
    detectionData: PlateDetection,
    parkingLot: any
  ): Promise<void> {
    try {
      console.log('[GateMonitorHandler] Processing entry for plate:', plate.plate_number);

      // Create new vehicle record
      const record = new VehicleRecord({
        plateNumber: plate.plate_number.toUpperCase(),
        parkingLotId: parkingLot._id,
        contractorId: parkingLot.contractorId,
        entry: {
          timestamp: new Date(detectionData.timestamp * 1000), // Convert Unix timestamp to Date
          gateId: parkingLot.gateCamera.id,
          confidence: plate.confidence,
          detectionData: {
            raw_text: plate.raw_text,
            detection_confidence: plate.detection_confidence,
            bbox: plate.bbox,
            frame_number: detectionData.frame_number,
            processing_time_ms: detectionData.processing_time_ms,
          },
        },
        status: 'inside',
      });

      await record.save();
      console.log('[GateMonitorHandler] Entry record created:', record._id);

      // Update gate camera last seen
      parkingLot.gateCamera.lastSeen = new Date();
      parkingLot.gateCamera.status = 'active';
      await parkingLot.save();

      // Broadcast entry event to connected clients via SSE
      const sseManager = getSSEManager();
      sseManager.broadcast({
        type: 'capacity_update',
        data: {
          event: 'vehicle_entry',
          parkingLotId: parkingLot._id.toString(),
          plateNumber: record.plateNumber,
          timestamp: record.entry.timestamp,
        },
      });
    } catch (error) {
      console.error('[GateMonitorHandler] Error creating entry record:', error);
      throw error;
    }
  }

  /**
   * Handle exit detection - update existing vehicle record
   */
  private async handleExitDetection(
    existingRecord: any,
    plate: PlateDetection['plates'][0],
    detectionData: PlateDetection,
    parkingLot: any
  ): Promise<void> {
    try {
      console.log('[GateMonitorHandler] Processing exit for plate:', plate.plate_number);

      const exitTimestamp = new Date(detectionData.timestamp * 1000);
      const entryTimestamp = existingRecord.entry.timestamp;
      
      // Calculate duration in minutes
      const durationMs = exitTimestamp.getTime() - entryTimestamp.getTime();
      const durationMinutes = Math.floor(durationMs / 60000);

      // Update record with exit information
      existingRecord.exit = {
        timestamp: exitTimestamp,
        gateId: parkingLot.gateCamera.id,
        confidence: plate.confidence,
        detectionData: {
          raw_text: plate.raw_text,
          detection_confidence: plate.detection_confidence,
          bbox: plate.bbox,
          frame_number: detectionData.frame_number,
          processing_time_ms: detectionData.processing_time_ms,
        },
      };
      existingRecord.duration = durationMinutes;
      existingRecord.status = 'exited';

      await existingRecord.save();
      console.log('[GateMonitorHandler] Exit record updated:', existingRecord._id, 'Duration:', durationMinutes, 'minutes');

      // Update gate camera last seen
      parkingLot.gateCamera.lastSeen = new Date();
      parkingLot.gateCamera.status = 'active';
      await parkingLot.save();

      // Broadcast exit event to connected clients via SSE
      const sseManager = getSSEManager();
      sseManager.broadcast({
        type: 'capacity_update',
        data: {
          event: 'vehicle_exit',
          parkingLotId: parkingLot._id.toString(),
          plateNumber: existingRecord.plateNumber,
          timestamp: exitTimestamp,
          duration: durationMinutes,
        },
      });
    } catch (error) {
      console.error('[GateMonitorHandler] Error updating exit record:', error);
      throw error;
    }
  }
}

// Singleton instance for the default gate monitor
let defaultGateMonitorHandler: GateMonitorHandler | null = null;

/**
 * Get or create the default gate monitor handler
 */
export function getGateMonitorHandler(parkingLotId?: string): GateMonitorHandler {
  if (!defaultGateMonitorHandler) {
    defaultGateMonitorHandler = new GateMonitorHandler(parkingLotId);
  }
  return defaultGateMonitorHandler;
}

/**
 * Start the default gate monitor handler
 */
export async function startGateMonitor(parkingLotId?: string): Promise<void> {
  const handler = getGateMonitorHandler(parkingLotId);
  await handler.start();
}

/**
 * Stop the default gate monitor handler
 */
export function stopGateMonitor(): void {
  if (defaultGateMonitorHandler) {
    defaultGateMonitorHandler.stop();
    defaultGateMonitorHandler = null;
  }
}
