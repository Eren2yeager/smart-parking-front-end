import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ICapacityLog extends Document {
  parkingLotId: Types.ObjectId;
  contractorId: Types.ObjectId;
  timestamp: Date;
  totalSlots: number;
  occupied: number;
  empty: number;
  occupancyRate: number;
  slots: Array<{
    slotId: number;
    status: 'occupied' | 'empty';
    confidence: number;
  }>;
  processingTime: number;
  createdAt: Date;
}

const CapacityLogSchema = new Schema<ICapacityLog>(
  {
    parkingLotId: {
      type: Schema.Types.ObjectId,
      ref: 'ParkingLot',
      required: true,
    },
    contractorId: {
      type: Schema.Types.ObjectId,
      ref: 'Contractor',
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    totalSlots: {
      type: Number,
      required: true,
      min: 0,
    },
    occupied: {
      type: Number,
      required: true,
      min: 0,
    },
    empty: {
      type: Number,
      required: true,
      min: 0,
    },
    occupancyRate: {
      type: Number,
      required: true,
      min: 0,
      // No max constraint - allows values > 1.0 for overparking scenarios (e.g., 40/10 = 4.0)
    },
    slots: [
      {
        slotId: {
          type: Number,
          required: true,
        },
        status: {
          type: String,
          enum: ['occupied', 'empty'],
          required: true,
        },
        confidence: {
          type: Number,
          required: true,
          min: 0,
          max: 1,
        },
      },
    ],
    processingTime: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes for time-series queries
CapacityLogSchema.index({ parkingLotId: 1, timestamp: -1 });
CapacityLogSchema.index({ contractorId: 1, timestamp: -1 });
CapacityLogSchema.index({ timestamp: -1 });

// Force schema reload in development to pick up changes (e.g., removed max constraint on occupancyRate)
if (mongoose.models.CapacityLog) {
  delete mongoose.models.CapacityLog;
}

const CapacityLog: Model<ICapacityLog> = mongoose.model<ICapacityLog>('CapacityLog', CapacityLogSchema);

export default CapacityLog;
