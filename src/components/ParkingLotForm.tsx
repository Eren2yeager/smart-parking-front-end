'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useFormPersistence } from '@/lib/form-persistence';
import { FormRestoredNotification } from '@/components/FormRestoredNotification';

// Validation schema matching the API
const parkingLotSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  location: z.object({
    address: z.string().min(1, 'Address is required'),
    coordinates: z.object({
      lat: z
        .number()
        .min(-90, 'Latitude must be between -90 and 90')
        .max(90, 'Latitude must be between -90 and 90'),
      lng: z
        .number()
        .min(-180, 'Longitude must be between -180 and 180')
        .max(180, 'Longitude must be between -180 and 180'),
    }),
  }),
  totalSlots: z
    .number()
    .int('Total slots must be an integer')
    .min(1, 'Total slots must be at least 1')
    .max(500, 'Total slots must be at most 500'),
  contractorId: z.string().min(1, 'Contractor is required'),
});

type ParkingLotFormData = z.infer<typeof parkingLotSchema>;

interface Contractor {
  _id: string;
  name: string;
  status: string;
}

interface ParkingLotFormProps {
  initialData?: Partial<ParkingLotFormData> & { _id?: string };
  mode: 'create' | 'edit';
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ParkingLotForm({
  initialData,
  mode,
  onSuccess,
  onCancel,
}: ParkingLotFormProps) {
  const router = useRouter();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingContractors, setLoadingContractors] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [showRestoredNotification, setShowRestoredNotification] = useState(false);
  
  // AI Slot Detection state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [detectingSlots, setDetectingSlots] = useState(false);
  const [detectionResult, setDetectionResult] = useState<{
    totalSlots: number;
    confidence: number;
  } | null>(null);

  // Use form persistence only for create mode
  const formId = mode === 'create' ? 'parking-lot-form' : `parking-lot-form-${initialData?._id}`;
  const initialFormData: ParkingLotFormData = {
    name: initialData?.name || '',
    location: {
      address: initialData?.location?.address || '',
      coordinates: {
        lat: initialData?.location?.coordinates?.lat || 0,
        lng: initialData?.location?.coordinates?.lng || 0,
      },
    },
    totalSlots: initialData?.totalSlots || 10,
    contractorId: initialData?.contractorId || '',
  };

  const [formData, setFormData, clearFormData, hasRestoredData] = useFormPersistence(
    formId,
    initialFormData,
    {
      autoSave: mode === 'create', // Only auto-save for create mode
      onRestore: () => setShowRestoredNotification(true),
    }
  );

  useEffect(() => {
    fetchContractors();
  }, []);

  const fetchContractors = async () => {
    try {
      setLoadingContractors(true);
      const response = await fetch('/api/contractors?status=active&limit=100');
      if (response.ok) {
        const result = await response.json();
        setContractors(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching contractors:', err);
    } finally {
      setLoadingContractors(false);
    }
  };

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
      parkingLotSchema.parse(formData);
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setDetectionResult(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const detectSlotsWithAI = async () => {
    if (!selectedImage) return;

    setDetectingSlots(true);
    setApiError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedImage);

      const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/detect-parking-slots`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to detect parking slots');
      }

      const result = await response.json();
      
      // Extract total slots from detection result
      const totalSlots = result.total_slots || result.slots?.length || 0;
      const avgConfidence = result.slots?.length > 0
        ? result.slots.reduce((sum: number, slot: any) => sum + (slot.confidence || 0), 0) / result.slots.length
        : 0;

      setDetectionResult({
        totalSlots,
        confidence: avgConfidence,
      });

      // Optionally auto-fill the totalSlots field
      if (totalSlots > 0) {
        handleChange('totalSlots', totalSlots);
      }
    } catch (error: any) {
      console.error('Error detecting slots:', error);
      setApiError(error.message || 'Failed to detect parking slots. Make sure the Python backend is running.');
    } finally {
      setDetectingSlots(false);
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
        mode === 'create'
          ? '/api/parking-lots'
          : `/api/parking-lots/${initialData?._id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
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
        router.push('/parking-lots');
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

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Parking Lot Name *
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., Central Parking Lot"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      {/* Address */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
          Address *
        </label>
        <input
          type="text"
          id="address"
          value={formData.location.address}
          onChange={(e) => handleChange('location.address', e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors['location.address'] ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., 123 Main Street, New Delhi"
        />
        {errors['location.address'] && (
          <p className="mt-1 text-sm text-red-600">{errors['location.address']}</p>
        )}
      </div>

      {/* Coordinates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="lat" className="block text-sm font-medium text-gray-700 mb-2">
            Latitude *
          </label>
          <input
            type="number"
            id="lat"
            step="any"
            value={formData.location.coordinates.lat}
            onChange={(e) =>
              handleChange('location.coordinates.lat', parseFloat(e.target.value) || 0)
            }
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors['location.coordinates.lat'] ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., 28.6139"
          />
          {errors['location.coordinates.lat'] && (
            <p className="mt-1 text-sm text-red-600">{errors['location.coordinates.lat']}</p>
          )}
        </div>

        <div>
          <label htmlFor="lng" className="block text-sm font-medium text-gray-700 mb-2">
            Longitude *
          </label>
          <input
            type="number"
            id="lng"
            step="any"
            value={formData.location.coordinates.lng}
            onChange={(e) =>
              handleChange('location.coordinates.lng', parseFloat(e.target.value) || 0)
            }
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors['location.coordinates.lng'] ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., 77.2090"
          />
          {errors['location.coordinates.lng'] && (
            <p className="mt-1 text-sm text-red-600">{errors['location.coordinates.lng']}</p>
          )}
        </div>
      </div>

      {/* Total Slots */}
      <div>
        <label htmlFor="totalSlots" className="block text-sm font-medium text-gray-700 mb-2">
          Total Slots *
        </label>
        
        {/* AI Detection Option */}
        <div className="mb-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">AI-Powered Slot Detection</h4>
              <p className="text-xs text-blue-700 mb-3">
                Upload an image of your parking lot and let AI detect the total number of slots automatically.
              </p>
              
              <div className="space-y-3">
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                </div>
                
                {imagePreview && (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="Parking lot preview" 
                      className="w-full h-48 object-cover rounded-lg border border-blue-300"
                    />
                  </div>
                )}
                
                {selectedImage && (
                  <button
                    type="button"
                    onClick={detectSlotsWithAI}
                    disabled={detectingSlots}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {detectingSlots ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Detecting Slots...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Detect Slots with AI
                      </>
                    )}
                  </button>
                )}
                
                {detectionResult && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-semibold text-sm">AI Detected: {detectionResult.totalSlots} slots</p>
                        <p className="text-xs text-green-700">
                          Confidence: {(detectionResult.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <input
          type="number"
          id="totalSlots"
          min="1"
          max="500"
          value={formData.totalSlots}
          onChange={(e) => handleChange('totalSlots', parseInt(e.target.value) || 0)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.totalSlots ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., 50"
        />
        {errors.totalSlots && <p className="mt-1 text-sm text-red-600">{errors.totalSlots}</p>}
        <p className="mt-1 text-xs text-gray-500">
          You can manually enter the number or use AI detection above
        </p>
      </div>

      {/* Contractor */}
      <div>
        <label htmlFor="contractorId" className="block text-sm font-medium text-gray-700 mb-2">
          Contractor *
        </label>
        {loadingContractors ? (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading contractors...</span>
          </div>
        ) : (
          <select
            id="contractorId"
            value={formData.contractorId}
            onChange={(e) => handleChange('contractorId', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.contractorId ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select a contractor</option>
            {contractors.map((contractor) => (
              <option key={contractor._id} value={contractor._id}>
                {contractor.name}
              </option>
            ))}
          </select>
        )}
        {errors.contractorId && (
          <p className="mt-1 text-sm text-red-600">{errors.contractorId}</p>
        )}
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
          disabled={loading || loadingContractors}
          className="min-h-[44px] px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === 'create' ? 'Create Parking Lot' : 'Update Parking Lot'}
        </button>
      </div>
    </form>
  );
}
