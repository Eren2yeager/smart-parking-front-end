import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IViolation extends Document {
  contractorId: Types.ObjectId;
  parkingLotId: Types.ObjectId;
  violationType: 'overparking' | 'unauthorized_vehicle' | 'capacity_breach';
  timestamp: Date;
  details: {
    allocatedCapacity: number;
    actualOccupancy: number;
    excessVehicles: number;
    duration: number;
  };
  penalty: number;
  status: 'pending' | 'acknowledged' | 'resolved';
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ViolationSchema = new Schema<IViolation>(
  {
    contractorId: {
      type: Schema.Types.ObjectId,
      ref: 'Contractor',
      required: true,
    },
    parkingLotId: {
      type: Schema.Types.ObjectId,
      ref: 'ParkingLot',
      required: true,
    },
    violationType: {
      type: String,
      enum: ['overparking', 'unauthorized_vehicle', 'capacity_breach'],
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    details: {
      allocatedCapacity: {
        type: Number,
        required: true,
        min: 0,
      },
      actualOccupancy: {
        type: Number,
        required: true,
        min: 0,
      },
      excessVehicles: {
        type: Number,
        required: true,
        min: 0,
      },
      duration: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    penalty: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'acknowledged', 'resolved'],
      default: 'pending',
      required: true,
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for contractor and status queries
ViolationSchema.index({ contractorId: 1, status: 1 });
ViolationSchema.index({ parkingLotId: 1, timestamp: -1 });
ViolationSchema.index({ status: 1, timestamp: -1 });

const Violation: Model<IViolation> =
  mongoose.models.Violation || mongoose.model<IViolation>('Violation', ViolationSchema);

export default Violation;
