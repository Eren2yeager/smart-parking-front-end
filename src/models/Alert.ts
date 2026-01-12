import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IAlert extends Document {
  parkingLotId: Types.ObjectId;
  contractorId: Types.ObjectId;
  type: 'overparking' | 'capacity_full' | 'camera_offline' | 'system';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  metadata: {
    occupied?: number;
    totalSlots?: number;
    extraVehicles?: number;
    cameraId?: string;
    [key: string]: any;
  };
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedAt?: Date;
  acknowledgedBy?: Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema = new Schema<IAlert>(
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
    type: {
      type: String,
      enum: ['overparking', 'capacity_full', 'camera_offline', 'system'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['critical', 'warning', 'info'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['active', 'acknowledged', 'resolved'],
      default: 'active',
    },
    acknowledgedAt: {
      type: Date,
    },
    acknowledgedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
AlertSchema.index({ parkingLotId: 1, status: 1, createdAt: -1 });
AlertSchema.index({ contractorId: 1, status: 1, createdAt: -1 });
AlertSchema.index({ type: 1, status: 1, createdAt: -1 });
AlertSchema.index({ status: 1, createdAt: -1 });

const Alert: Model<IAlert> =
  mongoose.models.Alert || mongoose.model<IAlert>('Alert', AlertSchema);

export default Alert;
