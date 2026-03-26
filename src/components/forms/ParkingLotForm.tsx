'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useFormPersistence } from '@/lib/utils/form-persistence';
import { FormRestoredNotification } from '@/components/indicators/FormRestoredNotification';
import { Input } from '@/components/shadcnComponents/input';
import { Button } from '@/components/shadcnComponents/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcnComponents/select';
import { BoundingBoxCanvas } from '@/components/detection/BoundingBoxCanvas';

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
  detectedSlots: z.array(z.object({
    slotId: z.number(),
    status: z.string(),
    confidence: z.number(),
    bbox: z.object({
      x1: z.number(),
      y1: z.number(),
      x2: z.number(),
      y2: z.number(),
    }),
  })).optional(),
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
    slots?: Array<{
      bbox: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
      };
      confidence: number;
      status?: string;
      class?: string;
    }>;
  } | null>(null);
  const imageRef = useState<HTMLImageElement | null>(null)[0];
  const canvasRef = useState<HTMLCanvasElement | null>(null)[0];

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
    detectedSlots: undefined,
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

      const backendUrl = process.env.NEXT_PUBLIC_AI_BACKEND_URL || 'http://localhost:8000';
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
      
      // Map slots with bbox information
      const slots = (result.slots || []).map((slot: any) => ({
        slotId: slot.slot_id || slot.slotId,
        status: slot.status || 'empty',
        confidence: slot.confidence || 0,
        bbox: slot.bbox || {
          x1: slot.x1 || 0,
          y1: slot.y1 || 0,
          x2: slot.x2 || 0,
          y2: slot.y2 || 0,
        },
      }));

      setDetectionResult({
        totalSlots,
        confidence: avgConfidence,
        slots,
      });

      // Optionally auto-fill the totalSlots field
      if (totalSlots > 0) {
        handleChange('totalSlots', totalSlots);
      }
      
      // Store detected slots with bbox in form data for submission
      handleChange('detectedSlots', slots);
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
        <div className="bg-red-50 dark:bg-[#7f1d1d]/20 border border-red-200 dark:border-[#f87171]/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-[#f87171] shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 dark:text-[#fca5a5] font-medium">Error</p>
            <p className="text-red-700 dark:text-[#fca5a5] text-sm">{apiError}</p>
          </div>
        </div>
      )}

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-[#e5e7eb] mb-2">
          Parking Lot Name *
        </label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className={errors.name ? 'border-red-500 dark:border-red-500' : ''}
          placeholder="e.g., Central Parking Lot"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-[#f87171]">{errors.name}</p>}
      </div>

      {/* Address */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-[#e5e7eb] mb-2">
          Address *
        </label>
        <Input
          id="address"
          value={formData.location.address}
          onChange={(e) => handleChange('location.address', e.target.value)}
          className={errors['location.address'] ? 'border-red-500 dark:border-red-500' : ''}
          placeholder="e.g., 123 Main Street, New Delhi"
        />
        {errors['location.address'] && (
          <p className="mt-1 text-sm text-red-600 dark:text-[#f87171]">{errors['location.address']}</p>
        )}
      </div>

      {/* Coordinates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="lat" className="block text-sm font-medium text-gray-700 dark:text-[#e5e7eb] mb-2">
            Latitude *
          </label>
          <Input
            id="lat"
            type="number"
            step="any"
            value={formData.location.coordinates.lat}
            onChange={(e) =>
              handleChange('location.coordinates.lat', parseFloat(e.target.value) || 0)
            }
            className={errors['location.coordinates.lat'] ? 'border-red-500 dark:border-red-500' : ''}
            placeholder="e.g., 28.6139"
          />
          {errors['location.coordinates.lat'] && (
            <p className="mt-1 text-sm text-red-600 dark:text-[#f87171]">{errors['location.coordinates.lat']}</p>
          )}
        </div>

        <div>
          <label htmlFor="lng" className="block text-sm font-medium text-gray-700 dark:text-[#e5e7eb] mb-2">
            Longitude *
          </label>
          <Input
            id="lng"
            type="number"
            step="any"
            value={formData.location.coordinates.lng}
            onChange={(e) =>
              handleChange('location.coordinates.lng', parseFloat(e.target.value) || 0)
            }
            className={errors['location.coordinates.lng'] ? 'border-red-500 dark:border-red-500' : ''}
            placeholder="e.g., 77.2090"
          />
          {errors['location.coordinates.lng'] && (
            <p className="mt-1 text-sm text-red-600 dark:text-[#f87171]">{errors['location.coordinates.lng']}</p>
          )}
        </div>
      </div>

      {/* Total Slots */}
      <div>
        <label htmlFor="totalSlots" className="block text-sm font-medium text-gray-700 dark:text-[#e5e7eb] mb-2">
          Total Slots *
        </label>
        
        {/* AI Detection Option */}
        <div className="mb-3 p-4 bg-blue-50 dark:bg-[#4f46e5]/10 border border-blue-200 dark:border-[#4f46e5]/20 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="shrink-0">
              <svg className="w-5 h-5 text-blue-600 dark:text-[#818cf8] mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-[#c7d2fe] mb-1">AI-Powered Slot Detection</h4>
              <p className="text-xs text-blue-700 dark:text-[#a5b4fc] mb-3">
                Upload an image of your parking lot and let AI detect the total number of slots automatically.
              </p>
              
              <div className="space-y-3">
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="block w-full text-sm text-gray-600 dark:text-[#9ca3af] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer dark:file:bg-[#4f46e5] dark:file:text-[#c7d2fe]"
                  />
                </div>
                
                {imagePreview && (
                  <div className="relative w-full h-[500px] bg-gray-100 dark:bg-[#181a1f] rounded-lg overflow-hidden border border-blue-300 dark:border-[#4f46e5]">
                    <img 
                      id="parking-lot-preview"
                      src={imagePreview} 
                      alt="Parking lot preview" 
                      className="w-full h-full object-contain"
                    />
                    <BoundingBoxCanvas
                      imageId="parking-lot-preview"
                      detections={detectionResult?.slots || null}
                      type="slots"
                    />
                  </div>
                )}
                
                {selectedImage && (
                  <Button
                    type="button"
                    onClick={detectSlotsWithAI}
                    disabled={detectingSlots}
                    className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-[#4f46e5] dark:hover:bg-[#4338ca]"
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
                  </Button>
                )}
                
                {detectionResult && (
                  <div className="p-3 bg-green-50 dark:bg-[#059669]/10 border border-green-200 dark:border-[#059669]/20 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 dark:text-[#34d399]">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-semibold text-sm">AI Detected: {detectionResult.totalSlots} slots</p>
                        <p className="text-xs text-green-700 dark:text-[#6ee7b7]">
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
        
        <Input
          id="totalSlots"
          type="number"
          min="1"
          max="500"
          value={formData.totalSlots}
          onChange={(e) => handleChange('totalSlots', parseInt(e.target.value) || 0)}
          className={errors.totalSlots ? 'border-red-500 dark:border-red-500' : ''}
          placeholder="e.g., 50"
        />
        {errors.totalSlots && <p className="mt-1 text-sm text-red-600 dark:text-[#f87171]">{errors.totalSlots}</p>}
        <p className="mt-1 text-xs text-gray-500 dark:text-[#9ca3af]">
          You can manually enter the number or use AI detection above
        </p>
      </div>

      {/* Contractor */}
      <div>
        <label htmlFor="contractorId" className="block text-sm font-medium text-gray-700 dark:text-[#e5e7eb] mb-2">
          Contractor *
        </label>
        {loadingContractors ? (
          <div className="flex items-center gap-2 text-gray-600 dark:text-[#9ca3af]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading contractors...</span>
          </div>
        ) : (
          <Select
            value={formData.contractorId}
            onValueChange={(value) => handleChange('contractorId', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a contractor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__placeholder__" disabled>Select a contractor</SelectItem>
              {contractors.map((contractor) => (
                <SelectItem key={contractor._id} value={contractor._id}>
                  {contractor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {errors.contractorId && (
          <p className="mt-1 text-sm text-red-600 dark:text-[#f87171]">{errors.contractorId}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 pt-6 border-t border-gray-200 dark:border-[#2a2e37]">
        {onCancel && (
          <Button
            type="button"
            onClick={onCancel}
            disabled={loading}
            variant="outline"
            className="min-h-[44px]"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading || loadingContractors}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === 'create' ? 'Create Parking Lot' : 'Update Parking Lot'}
        </Button>
      </div>
    </form>
  );
}
