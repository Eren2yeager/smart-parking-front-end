import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContractor extends Document {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  contractDetails: {
    startDate: Date;
    endDate: Date;
    allocatedCapacity: number;
    penaltyPerViolation: number;
  };
  status: 'active' | 'suspended' | 'terminated';
  createdAt: Date;
  updatedAt: Date;
}

const ContractorSchema = new Schema<IContractor>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactPerson: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    contractDetails: {
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
      allocatedCapacity: {
        type: Number,
        required: true,
        min: 0,
      },
      penaltyPerViolation: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'terminated'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
ContractorSchema.index({ status: 1 });
ContractorSchema.index({ email: 1 });

const Contractor: Model<IContractor> =
  mongoose.models.Contractor || mongoose.model<IContractor>('Contractor', ContractorSchema);

export default Contractor;
