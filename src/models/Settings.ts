import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ISettings extends Document {
  _id: Types.ObjectId;
  alertThresholds: {
    capacityWarning: number;
    cameraOfflineTimeout: number;
  };
  pythonBackend: {
    httpUrl: string;
    wsUrl: string;
  };
  cameras: {
    gateFrameSkip: number;
    lotFrameSkip: number;
  };
  updatedAt: Date;
  updatedBy: Types.ObjectId;
}

const SettingsSchema = new Schema<ISettings>(
  {
    alertThresholds: {
      capacityWarning: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 90,
      },
      cameraOfflineTimeout: {
        type: Number,
        required: true,
        min: 1,
        default: 5,
      },
    },
    pythonBackend: {
      httpUrl: {
        type: String,
        required: true,
        default: process.env.PYTHON_BACKEND_URL || process.env.PYTHON_BACKEND_URL || 'http://localhost:8000',
      },
      wsUrl: {
        type: String,
        required: true,
        default: process.env.PYTHON_BACKEND_WS_URL || process.env.PYTHON_BACKEND_WS_URL || 'ws://localhost:8000',
      },
    },
    cameras: {
      gateFrameSkip: {
        type: Number,
        required: true,
        min: 0,
        default: 2,
      },
      lotFrameSkip: {
        type: Number,
        required: true,
        min: 0,
        default: 5,
      },
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one settings document exists
SettingsSchema.index({ _id: 1 }, { unique: true });

const Settings: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);

export default Settings;
