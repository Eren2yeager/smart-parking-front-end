/**
 * Centralized Zod validation schemas for all API inputs
 * Requirements: 13.5, 14.6
 */

import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const locationSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  coordinates: coordinatesSchema,
});

export const dateStringSchema = z.string().datetime().or(z.date());

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

// ============================================================================
// Parking Lot Schemas
// ============================================================================

export const createParkingLotSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  location: locationSchema,
  totalSlots: z.number().int().min(1, 'Total slots must be at least 1').max(500, 'Total slots cannot exceed 500'),
  contractorId: objectIdSchema,
});

export const updateParkingLotSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  location: locationSchema.optional(),
  totalSlots: z.number().int().min(1).max(500).optional(),
  contractorId: objectIdSchema.optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const initializeSlotsSchema = z.object({
  slots: z.array(
    z.object({
      slotId: z.number().int().min(1),
      bbox: z.object({
        x1: z.number(),
        y1: z.number(),
        x2: z.number(),
        y2: z.number(),
      }),
      status: z.enum(['occupied', 'empty']),
      confidence: z.number().min(0).max(1).optional(),
    })
  ).min(1, 'At least one slot is required'),
});

export const parkingLotQuerySchema = z.object({
  status: z.enum(['active', 'inactive']).optional(),
  contractorId: objectIdSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// ============================================================================
// Contractor Schemas
// ============================================================================

export const createContractorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  contactPerson: z.string().min(1, 'Contact person is required').max(100),
  phone: z.string().min(1, 'Phone is required').max(20),
  email: z.string().email('Invalid email format'),
  contractDetails: z.object({
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    allocatedCapacity: z.number().int().min(0, 'Allocated capacity must be non-negative'),
    penaltyPerViolation: z.number().min(0, 'Penalty must be non-negative'),
  }),
  status: z.enum(['active', 'suspended', 'terminated']).optional(),
}).refine(
  (data) => {
    const start = new Date(data.contractDetails.startDate);
    const end = new Date(data.contractDetails.endDate);
    return end > start;
  },
  {
    message: 'End date must be after start date',
    path: ['contractDetails', 'endDate'],
  }
);

export const updateContractorSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  contactPerson: z.string().min(1).max(100).optional(),
  phone: z.string().min(1).max(20).optional(),
  email: z.string().email().optional(),
  contractDetails: z.object({
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.optional(),
    allocatedCapacity: z.number().int().min(0).optional(),
    penaltyPerViolation: z.number().min(0).optional(),
  }).optional(),
  status: z.enum(['active', 'suspended', 'terminated']).optional(),
});

export const contractorQuerySchema = z.object({
  status: z.enum(['active', 'suspended', 'terminated']).optional(),
});

// ============================================================================
// Vehicle Record Schemas
// ============================================================================

export const createEntryRecordSchema = z.object({
  plateNumber: z.string().min(1, 'Plate number is required').max(20),
  parkingLotId: objectIdSchema,
  gateId: z.string().min(1, 'Gate ID is required'),
  confidence: z.number().min(0).max(1),
  imageUrl: z.string().url().optional(),
  detectionData: z.any().optional(),
});

export const createExitRecordSchema = z.object({
  plateNumber: z.string().min(1, 'Plate number is required').max(20),
  parkingLotId: objectIdSchema,
  gateId: z.string().min(1, 'Gate ID is required'),
  confidence: z.number().min(0).max(1),
  imageUrl: z.string().url().optional(),
  detectionData: z.any().optional(),
});

export const vehicleRecordQuerySchema = z.object({
  parkingLotId: objectIdSchema.optional(),
  status: z.enum(['inside', 'exited']).optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// ============================================================================
// Capacity Schemas
// ============================================================================

export const capacityUpdateSchema = z.object({
  parkingLotId: objectIdSchema,
  timestamp: dateStringSchema.optional(),
  totalSlots: z.number().int().min(1),
  occupied: z.number().int().min(0),
  empty: z.number().int().min(0),
  slots: z.array(
    z.object({
      slotId: z.number().int().min(1),
      status: z.enum(['occupied', 'empty']),
      confidence: z.number().min(0).max(1).optional(),
    })
  ),
  processingTime: z.number().min(0).optional(),
}).refine(
  (data) => data.occupied + data.empty === data.totalSlots,
  {
    message: 'Occupied + empty must equal total slots',
    path: ['totalSlots'],
  }
).refine(
  (data) => data.slots.length === data.totalSlots,
  {
    message: 'Slots array length must match total slots',
    path: ['slots'],
  }
);

export const capacityHistoryQuerySchema = z.object({
  parkingLotId: objectIdSchema.optional(),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  interval: z.enum(['hourly', 'daily']).default('hourly'),
});

// ============================================================================
// Violation Schemas
// ============================================================================

export const acknowledgeViolationSchema = z.object({
  notes: z.string().max(500).optional(),
});

export const resolveViolationSchema = z.object({
  notes: z.string().min(1, 'Resolution notes are required').max(500),
});

export const violationQuerySchema = z.object({
  contractorId: objectIdSchema.optional(),
  parkingLotId: objectIdSchema.optional(),
  status: z.enum(['pending', 'acknowledged', 'resolved']).optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// ============================================================================
// Alert Schemas
// ============================================================================

export const acknowledgeAlertSchema = z.object({
  notes: z.string().max(500).optional(),
});

export const alertQuerySchema = z.object({
  type: z.enum(['capacity_warning', 'capacity_breach', 'camera_offline', 'violation_detected']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['active', 'acknowledged', 'resolved']).optional(),
  parkingLotId: objectIdSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// ============================================================================
// Analytics Schemas
// ============================================================================

export const occupancyTrendsQuerySchema = z.object({
  parkingLotId: objectIdSchema.optional(),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  interval: z.enum(['hourly', 'daily']).default('hourly'),
});

export const peakHoursQuerySchema = z.object({
  parkingLotId: objectIdSchema.optional(),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
});

// ============================================================================
// Settings Schemas
// ============================================================================

export const updateSettingsSchema = z.object({
  alertThresholds: z.object({
    capacityWarning: z.number().min(0, 'Capacity warning must be at least 0').max(100, 'Capacity warning cannot exceed 100'),
    cameraOfflineTimeout: z.number().int().min(1, 'Camera offline timeout must be at least 1 minute'),
  }).optional(),
  pythonBackend: z.object({
    httpUrl: z.string().url('Invalid HTTP URL format'),
    wsUrl: z.string().regex(/^wss?:\/\/.+/, 'Invalid WebSocket URL format'),
  }).optional(),
  cameras: z.object({
    gateFrameSkip: z.number().int().min(0, 'Gate frame skip must be non-negative'),
    lotFrameSkip: z.number().int().min(0, 'Lot frame skip must be non-negative'),
  }).optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'operator', 'viewer'], {
    message: 'Role must be admin, operator, or viewer',
  }),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateParkingLotInput = z.infer<typeof createParkingLotSchema>;
export type UpdateParkingLotInput = z.infer<typeof updateParkingLotSchema>;
export type InitializeSlotsInput = z.infer<typeof initializeSlotsSchema>;
export type ParkingLotQuery = z.infer<typeof parkingLotQuerySchema>;

export type CreateContractorInput = z.infer<typeof createContractorSchema>;
export type UpdateContractorInput = z.infer<typeof updateContractorSchema>;
export type ContractorQuery = z.infer<typeof contractorQuerySchema>;

export type CreateEntryRecordInput = z.infer<typeof createEntryRecordSchema>;
export type CreateExitRecordInput = z.infer<typeof createExitRecordSchema>;
export type VehicleRecordQuery = z.infer<typeof vehicleRecordQuerySchema>;

export type CapacityUpdateInput = z.infer<typeof capacityUpdateSchema>;
export type CapacityHistoryQuery = z.infer<typeof capacityHistoryQuerySchema>;

export type AcknowledgeViolationInput = z.infer<typeof acknowledgeViolationSchema>;
export type ResolveViolationInput = z.infer<typeof resolveViolationSchema>;
export type ViolationQuery = z.infer<typeof violationQuerySchema>;

export type AcknowledgeAlertInput = z.infer<typeof acknowledgeAlertSchema>;
export type AlertQuery = z.infer<typeof alertQuerySchema>;

export type OccupancyTrendsQuery = z.infer<typeof occupancyTrendsQuerySchema>;
export type PeakHoursQuery = z.infer<typeof peakHoursQuerySchema>;

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
