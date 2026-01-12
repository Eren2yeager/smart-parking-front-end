'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { AlertCircle, Loader2, Calendar, DollarSign, Users } from 'lucide-react';
import { useFormPersistence } from '@/lib/form-persistence';
import { FormRestoredNotification } from '@/components/FormRestoredNotification';

// Validation schema matching the API
const contractorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  contactPerson: z
    .string()
    .min(1, 'Contact person is required')
    .max(100, 'Contact person must be less than 100 characters'),
  phone: z
    .string()
    .min(1, 'Phone is required')
    .max(20, 'Phone must be less than 20 characters')
    .regex(/^[0-9+\-\s()]+$/, 'Invalid phone number format'),
  email: z.string().email('Invalid email address'),
  contractDetails: z.object({
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    allocatedCapacity: z
      .number()
      .int('Allocated capacity must be an integer')
      .min(1, 'Allocated capacity must be at least 1')
      .max(10000, 'Allocated capacity must be at most 10000'),
    penaltyPerViolation: z
      .number()
      .min(0, 'Penalty must be at least 0')
      .max(1000000, 'Penalty must be at most 1000000'),
  }),
  status: z.enum(['active', 'suspended', 'terminated']),
});

type ContractorFormData = z.infer<typeof contractorSchema>;

interface ContractorFormProps {
  initialData?: Partial<ContractorFormData> & { _id?: string };
  mode: 'create' | 'edit';
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ContractorForm({
  initialData,
  mode,
  onSuccess,
  onCancel,
}: ContractorFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [showRestoredNotification, setShowRestoredNotification] = useState(false);

  // Use form persistence only for create mode
  const formId = mode === 'create' ? 'contractor-form' : `contractor-form-${initialData?._id}`;
  const initialFormData: ContractorFormData = {
    name: initialData?.name || '',
    contactPerson: initialData?.contactPerson || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    contractDetails: {
      startDate: initialData?.contractDetails?.startDate
        ? new Date(initialData.contractDetails.startDate).toISOString().split('T')[0]
        : '',
      endDate: initialData?.contractDetails?.endDate
        ? new Date(initialData.contractDetails.endDate).toISOString().split('T')[0]
        : '',
      allocatedCapacity: initialData?.contractDetails?.allocatedCapacity || 50,
      penaltyPerViolation: initialData?.contractDetails?.penaltyPerViolation || 1000,
    },
    status: initialData?.status || 'active',
  };

  const [formData, setFormData, clearFormData, hasRestoredData] = useFormPersistence(
    formId,
    initialFormData,
    {
      autoSave: mode === 'create',
      onRestore: () => setShowRestoredNotification(true),
    }
  );

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => {
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      }

      // Handle nested fields
      const newData = { ...prev };
      let current: any = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });

    // Clear error for this field
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const validateForm = (): boolean => {
    try {
      // Validate date range
      const startDate = new Date(formData.contractDetails.startDate);
      const endDate = new Date(formData.contractDetails.endDate);
      
      if (endDate <= startDate) {
        setErrors({ 'contractDetails.endDate': 'End date must be after start date' });
        return false;
      }

      contractorSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          const path = err.path.join('.');
          newErrors[path] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const url =
        mode === 'create' ? '/api/contractors' : `/api/contractors/${initialData?._id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      // Format dates as ISO strings for API
      const submitData = {
        ...formData,
        contractDetails: {
          ...formData.contractDetails,
          startDate: new Date(formData.contractDetails.startDate).toISOString(),
          endDate: new Date(formData.contractDetails.endDate).toISOString(),
        },
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.details) {
          // Handle validation errors from API
          const newErrors: Record<string, string> = {};
          result.details.forEach((err: any) => {
            newErrors[err.field] = err.message;
          });
          setErrors(newErrors);
        } else {
          setApiError(result.message || 'An error occurred');
        }
        return;
      }

      // Success
      clearFormData(); // Clear saved form data on successful submission
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/contractors');
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      setApiError('Failed to submit form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Form Restored Notification */}
      {mode === 'create' && (
        <FormRestoredNotification
          show={showRestoredNotification}
          onDismiss={() => setShowRestoredNotification(false)}
          onClear={() => {
            clearFormData();
            setShowRestoredNotification(false);
            setFormData(initialFormData);
          }}
        />
      )}

      {/* API Error */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-700 text-sm">{apiError}</p>
          </div>
        </div>
      )}

      {/* Basic Information Section */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Basic Information</h3>

        {/* Contractor Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Contractor Name *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., ABC Parking Services"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        {/* Contact Person */}
        <div>
          <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700 mb-2">
            Contact Person *
          </label>
          <input
            type="text"
            id="contactPerson"
            value={formData.contactPerson}
            onChange={(e) => handleChange('contactPerson', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.contactPerson ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., John Doe"
          />
          {errors.contactPerson && (
            <p className="mt-1 text-sm text-red-600">{errors.contactPerson}</p>
          )}
        </div>

        {/* Email and Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., contact@example.com"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone *
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., +91 98765 43210"
            />
            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
          </div>
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
            Status *
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.status ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="terminated">Terminated</option>
          </select>
          {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status}</p>}
        </div>
      </div>

      {/* Contract Details Section */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-bold text-gray-900">Contract Details</h3>
        </div>

        {/* Contract Period */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Start Date *
            </label>
            <input
              type="date"
              id="startDate"
              value={formData.contractDetails.startDate}
              onChange={(e) => handleChange('contractDetails.startDate', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors['contractDetails.startDate'] ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors['contractDetails.startDate'] && (
              <p className="mt-1 text-sm text-red-600">{errors['contractDetails.startDate']}</p>
            )}
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
              End Date *
            </label>
            <input
              type="date"
              id="endDate"
              value={formData.contractDetails.endDate}
              onChange={(e) => handleChange('contractDetails.endDate', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors['contractDetails.endDate'] ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors['contractDetails.endDate'] && (
              <p className="mt-1 text-sm text-red-600">{errors['contractDetails.endDate']}</p>
            )}
          </div>
        </div>

        {/* Allocated Capacity */}
        <div>
          <label
            htmlFor="allocatedCapacity"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Allocated Capacity (Total Slots) *</span>
            </div>
          </label>
          <input
            type="number"
            id="allocatedCapacity"
            min="1"
            max="10000"
            value={formData.contractDetails.allocatedCapacity}
            onChange={(e) =>
              handleChange('contractDetails.allocatedCapacity', parseInt(e.target.value) || 0)
            }
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors['contractDetails.allocatedCapacity'] ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., 100"
          />
          {errors['contractDetails.allocatedCapacity'] && (
            <p className="mt-1 text-sm text-red-600">
              {errors['contractDetails.allocatedCapacity']}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Total number of parking slots allocated to this contractor across all lots
          </p>
        </div>

        {/* Penalty Per Violation */}
        <div>
          <label
            htmlFor="penaltyPerViolation"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span>Penalty Per Violation (₹) *</span>
            </div>
          </label>
          <input
            type="number"
            id="penaltyPerViolation"
            min="0"
            max="1000000"
            step="100"
            value={formData.contractDetails.penaltyPerViolation}
            onChange={(e) =>
              handleChange('contractDetails.penaltyPerViolation', parseFloat(e.target.value) || 0)
            }
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors['contractDetails.penaltyPerViolation'] ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., 1000"
          />
          {errors['contractDetails.penaltyPerViolation'] && (
            <p className="mt-1 text-sm text-red-600">
              {errors['contractDetails.penaltyPerViolation']}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Amount charged for each capacity violation
          </p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 pt-6 border-t border-gray-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-h-[44px] px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="min-h-[44px] px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === 'create' ? 'Create Contractor' : 'Update Contractor'}
        </button>
      </div>
    </form>
  );
}
