import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IReport extends Document {
  _id: Types.ObjectId;
  type: 'violations' | 'occupancy' | 'contractor_performance';
  config: {
    type: 'violations' | 'occupancy' | 'contractor_performance';
    dateRange: {
      start: Date;
      end: Date;
    };
    format: 'csv' | 'excel' | 'pdf';
    filters?: {
      parkingLotId?: string;
      contractorId?: string;
    };
  };
  status: 'generating' | 'completed' | 'failed';
  fileUrl?: string;
  filename?: string;
  fileSize?: number;
  error?: string;
  generatedBy: Types.ObjectId;
  createdAt: Date;
  completedAt?: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    type: {
      type: String,
      enum: ['violations', 'occupancy', 'contractor_performance'],
      required: true,
    },
    config: {
      type: {
        type: String,
        enum: ['violations', 'occupancy', 'contractor_performance'],
        required: true,
      },
      dateRange: {
        start: {
          type: Date,
          required: true,
        },
        end: {
          type: Date,
          required: true,
        },
      },
      format: {
        type: String,
        enum: ['csv', 'excel', 'pdf'],
        required: true,
      },
      filters: {
        parkingLotId: {
          type: String,
        },
        contractorId: {
          type: String,
        },
      },
    },
    status: {
      type: String,
      enum: ['generating', 'completed', 'failed'],
      default: 'generating',
      required: true,
    },
    fileUrl: {
      type: String,
    },
    filename: {
      type: String,
    },
    fileSize: {
      type: Number,
    },
    error: {
      type: String,
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes for report queries
ReportSchema.index({ generatedBy: 1, createdAt: -1 });
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ type: 1, createdAt: -1 });

const Report: Model<IReport> =
  mongoose.models.Report || mongoose.model<IReport>('Report', ReportSchema);

export default Report;
