import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IVehicleRecord extends Document {
  plateNumber: string;
  parkingLotId: Types.ObjectId;
  contractorId: Types.ObjectId;
  entry: {
    timestamp: Date;
    gateId: string;
    confidence: number;
    imageUrl?: string;
    detectionData: any;
  };
  exit?: {
    timestamp: Date;
    gateId: string;
    confidence: number;
    imageUrl?: string;
    detectionData: any;
  };
  duration?: number; // minutes
  status: 'inside' | 'exited';
  createdAt: Date;
  updatedAt: Date;
}

const VehicleRecordSchema = new Schema<IVehicleRecord>(
  {
    plateNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
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
    entry: {
      timestamp: {
        type: Date,
        required: true,
        default: Date.now,
      },
      gateId: {
        type: String,
        required: true,
      },
      confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
      },
      imageUrl: {
        type: String,
      },
      detectionData: {
        type: Schema.Types.Mixed,
      },
    },
    exit: {
      timestamp: {
        type: Date,
      },
      gateId: {
        type: String,
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1,
      },
      imageUrl: {
        type: String,
      },
      detectionData: {
        type: Schema.Types.Mixed,
      },
    },
    duration: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: ['inside', 'exited'],
      default: 'inside',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
VehicleRecordSchema.index({ plateNumber: 1, parkingLotId: 1, status: 1 });
VehicleRecordSchema.index({ parkingLotId: 1, 'entry.timestamp': -1 });
VehicleRecordSchema.index({ status: 1, parkingLotId: 1 });
VehicleRecordSchema.index({ createdAt: -1 });

const VehicleRecord: Model<IVehicleRecord> =
  mongoose.models.VehicleRecord ||
  mongoose.model<IVehicleRecord>('VehicleRecord', VehicleRecordSchema);

export default VehicleRecord;
