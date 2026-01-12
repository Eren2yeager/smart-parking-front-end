import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IParkingLot extends Document {
  name: string;
  location: {
    address: string;
    coordinates: { lat: number; lng: number };
  };
  totalSlots: number;
  contractorId: Types.ObjectId;
  gateCamera: {
    id: string;
    status: 'active' | 'inactive';
    lastSeen: Date;
  };
  lotCamera: {
    id: string;
    status: 'active' | 'inactive';
    lastSeen: Date;
  };
  slots: Array<{
    slotId: number;
    bbox: { x1: number; y1: number; x2: number; y2: number };
    status: 'occupied' | 'empty';
    lastUpdated: Date;
  }>;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const ParkingLotSchema = new Schema<IParkingLot>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      address: {
        type: String,
        required: true,
      },
      coordinates: {
        lat: {
          type: Number,
          required: true,
          min: -90,
          max: 90,
        },
        lng: {
          type: Number,
          required: true,
          min: -180,
          max: 180,
        },
      },
    },
    totalSlots: {
      type: Number,
      required: true,
      min: 1,
    },
    contractorId: {
      type: Schema.Types.ObjectId,
      ref: 'Contractor',
      required: true,
    },
    gateCamera: {
      id: {
        type: String,
        required: true,
        unique: true,
      },
      status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
      },
      lastSeen: {
        type: Date,
        default: Date.now,
      },
    },
    lotCamera: {
      id: {
        type: String,
        required: true,
        unique: true,
      },
      status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
      },
      lastSeen: {
        type: Date,
        default: Date.now,
      },
    },
    slots: [
      {
        slotId: {
          type: Number,
          required: true,
        },
        bbox: {
          x1: { type: Number, required: true },
          y1: { type: Number, required: true },
          x2: { type: Number, required: true },
          y2: { type: Number, required: true },
        },
        status: {
          type: String,
          enum: ['occupied', 'empty'],
          default: 'empty',
        },
        lastUpdated: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
ParkingLotSchema.index({ contractorId: 1 });
ParkingLotSchema.index({ status: 1 });
ParkingLotSchema.index({ 'gateCamera.id': 1 });
ParkingLotSchema.index({ 'lotCamera.id': 1 });

const ParkingLot: Model<IParkingLot> =
  mongoose.models.ParkingLot || mongoose.model<IParkingLot>('ParkingLot', ParkingLotSchema);

export default ParkingLot;
