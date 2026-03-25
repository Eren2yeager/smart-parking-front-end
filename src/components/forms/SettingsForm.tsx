'use client';

import { useState } from 'react';
import { z } from 'zod';
import { AlertCircle, Loader2, Bell, Server, Camera, CheckCircle } from 'lucide-react';
import { useFormPersistence } from '@/lib/utils/form-persistence';
import { FormRestoredNotification } from '@/components/indicators/FormRestoredNotification';
import { Input } from '@/components/shadcnComponents/input';
import { Button } from '@/components/shadcnComponents/button';
import { Card, CardContent } from '@/components/shadcnComponents/card';

// Validation schema matching the API
const settingsSchema = z.object({
  alertThresholds: z.object({
    capacityWarning: z
      .number()
      .min(0, 'Capacity warning must be at least 0')
      .max(100, 'Capacity warning cannot exceed 100'),
    cameraOfflineTimeout: z
      .number()
      .int('Camera offline timeout must be an integer')
      .min(1, 'Camera offline timeout must be at least 1 minute'),
  }),
  pythonBackend: z.object({
    httpUrl: z.string().url('Invalid HTTP URL format'),
    wsUrl: z.string().regex(/^wss?:\/\/.+/, 'Invalid WebSocket URL format'),
  }),
  cameras: z.object({
    gateFrameSkip: z
      .number()
      .int('Gate frame skip must be an integer')
      .min(0, 'Gate frame skip must be non-negative'),
    lotFrameSkip: z
      .number()
      .int('Lot frame skip must be an integer')
      .min(0, 'Lot frame skip must be non-negative'),
  }),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface SettingsFormProps {
  initialData?: Partial<SettingsFormData>;
  onSuccess?: () => void;
}

export default function SettingsForm({ initialData, onSuccess }: SettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showRestoredNotification, setShowRestoredNotification] = useState(false);

  const initialFormData: SettingsFormData = {
    alertThresholds: {
      capacityWarning: initialData?.alertThresholds?.capacityWarning ?? 90,
      cameraOfflineTimeout: initialData?.alertThresholds?.cameraOfflineTimeout ?? 5,
    },
    pythonBackend: {
      httpUrl: initialData?.pythonBackend?.httpUrl || process.env.NEXT_PUBLIC_AI_BACKEND_URL  || 'http://localhost:8000',
      wsUrl: initialData?.pythonBackend?.wsUrl || process.env.NEXT_PUBLIC_AI_BACKEND_WS_URL  || 'ws://localhost:8000',
    },
    cameras: {
      gateFrameSkip: initialData?.cameras?.gateFrameSkip ?? 2,
      lotFrameSkip: initialData?.cameras?.lotFrameSkip ?? 5,
    },
  };

  const [formData, setFormData, clearFormData, hasRestoredData] = useFormPersistence(
    'settings-form',
    initialFormData,
    {
      autoSave: true,
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
    setSuccessMessage(null);
  };

  const validateForm = (): boolean => {
    try {
      settingsSchema.parse(formData);
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
    setSuccessMessage(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
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
      setSuccessMessage('Settings updated successfully');
      if (onSuccess) {
        onSuccess();
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
      <FormRestoredNotification
        show={showRestoredNotification}
        onDismiss={() => setShowRestoredNotification(false)}
        onClear={() => {
          clearFormData();
          setShowRestoredNotification(false);
          setFormData(initialFormData);
        }}
      />

      {/* API Error */}
      {apiError && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 dark:text-red-300 font-medium">Error</p>
            <p className="text-red-700 dark:text-red-400 text-sm">{apiError}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-green-800 dark:text-green-300 font-medium">Success</p>
            <p className="text-green-700 dark:text-green-400 text-sm">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Alert Thresholds Section */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Alert Thresholds</h3>
          </div>

          {/* Capacity Warning Percentage */}
          <div>
            <label
              htmlFor="capacityWarning"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Capacity Warning Threshold (%) *
            </label>
            <Input
              type="number"
              id="capacityWarning"
              min="0"
              max="100"
              value={formData.alertThresholds.capacityWarning}
              onChange={(e) =>
                handleChange('alertThresholds.capacityWarning', parseFloat(e.target.value) || 0)
              }
              className={errors['alertThresholds.capacityWarning'] ? 'border-red-500 dark:border-red-500' : ''}
              placeholder="e.g., 90"
              aria-required="true"
              aria-invalid={!!errors['alertThresholds.capacityWarning']}
              aria-describedby={
                errors['alertThresholds.capacityWarning']
                  ? 'capacityWarning-error capacityWarning-hint'
                  : 'capacityWarning-hint'
              }
            />
            {errors['alertThresholds.capacityWarning'] && (
              <p id="capacityWarning-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors['alertThresholds.capacityWarning']}
              </p>
            )}
            <p id="capacityWarning-hint" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Alert when parking lot occupancy exceeds this percentage
            </p>
          </div>

          {/* Camera Offline Timeout */}
          <div>
            <label
              htmlFor="cameraOfflineTimeout"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Camera Offline Timeout (minutes) *
            </label>
            <Input
              type="number"
              id="cameraOfflineTimeout"
              min="1"
              value={formData.alertThresholds.cameraOfflineTimeout}
              onChange={(e) =>
                handleChange('alertThresholds.cameraOfflineTimeout', parseInt(e.target.value) || 1)
              }
              className={errors['alertThresholds.cameraOfflineTimeout'] ? 'border-red-500 dark:border-red-500' : ''}
              placeholder="e.g., 5"
              aria-required="true"
              aria-invalid={!!errors['alertThresholds.cameraOfflineTimeout']}
              aria-describedby={
                errors['alertThresholds.cameraOfflineTimeout']
                  ? 'cameraOfflineTimeout-error cameraOfflineTimeout-hint'
                  : 'cameraOfflineTimeout-hint'
              }
            />
            {errors['alertThresholds.cameraOfflineTimeout'] && (
              <p id="cameraOfflineTimeout-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors['alertThresholds.cameraOfflineTimeout']}
              </p>
            )}
            <p id="cameraOfflineTimeout-hint" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Alert when camera has not sent data for this many minutes
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Python Backend Section */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Python Backend URLs</h3>
          </div>

          {/* HTTP URL */}
          <div>
            <label htmlFor="httpUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              HTTP URL *
            </label>
            <Input
              type="url"
              id="httpUrl"
              value={formData.pythonBackend.httpUrl}
              onChange={(e) => handleChange('pythonBackend.httpUrl', e.target.value)}
              className={errors['pythonBackend.httpUrl'] ? 'border-red-500 dark:border-red-500' : ''}
              placeholder="e.g., http://localhost:8000"
              aria-required="true"
              aria-invalid={!!errors['pythonBackend.httpUrl']}
              aria-describedby={
                errors['pythonBackend.httpUrl']
                  ? 'httpUrl-error httpUrl-hint'
                  : 'httpUrl-hint'
              }
            />
            {errors['pythonBackend.httpUrl'] && (
              <p id="httpUrl-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors['pythonBackend.httpUrl']}
              </p>
            )}
            <p id="httpUrl-hint" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              HTTP endpoint for Python backend API
            </p>
          </div>

          {/* WebSocket URL */}
          <div>
            <label htmlFor="wsUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              WebSocket URL *
            </label>
            <Input
              type="text"
              id="wsUrl"
              value={formData.pythonBackend.wsUrl}
              onChange={(e) => handleChange('pythonBackend.wsUrl', e.target.value)}
              className={errors['pythonBackend.wsUrl'] ? 'border-red-500 dark:border-red-500' : ''}
              placeholder="e.g., ws://localhost:8000"
              aria-required="true"
              aria-invalid={!!errors['pythonBackend.wsUrl']}
              aria-describedby={
                errors['pythonBackend.wsUrl']
                  ? 'wsUrl-error wsUrl-hint'
                  : 'wsUrl-hint'
              }
            />
            {errors['pythonBackend.wsUrl'] && (
              <p id="wsUrl-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors['pythonBackend.wsUrl']}
              </p>
            )}
            <p id="wsUrl-hint" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              WebSocket endpoint for real-time camera feeds
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Camera Settings Section */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Camera Settings</h3>
          </div>

          {/* Gate Frame Skip */}
          <div>
            <label
              htmlFor="gateFrameSkip"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Gate Camera Frame Skip *
            </label>
            <Input
              type="number"
              id="gateFrameSkip"
              min="0"
              value={formData.cameras.gateFrameSkip}
              onChange={(e) =>
                handleChange('cameras.gateFrameSkip', parseInt(e.target.value) || 0)
              }
              className={errors['cameras.gateFrameSkip'] ? 'border-red-500 dark:border-red-500' : ''}
              placeholder="e.g., 2"
              aria-required="true"
              aria-invalid={!!errors['cameras.gateFrameSkip']}
              aria-describedby={
                errors['cameras.gateFrameSkip']
                  ? 'gateFrameSkip-error gateFrameSkip-hint'
                  : 'gateFrameSkip-hint'
              }
            />
            {errors['cameras.gateFrameSkip'] && (
              <p id="gateFrameSkip-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors['cameras.gateFrameSkip']}
              </p>
            )}
            <p id="gateFrameSkip-hint" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Number of frames to skip for gate camera processing (0 = process every frame)
            </p>
          </div>

          {/* Lot Frame Skip */}
          <div>
            <label
              htmlFor="lotFrameSkip"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Lot Camera Frame Skip *
            </label>
            <Input
              type="number"
              id="lotFrameSkip"
              min="0"
              value={formData.cameras.lotFrameSkip}
              onChange={(e) =>
                handleChange('cameras.lotFrameSkip', parseInt(e.target.value) || 0)
              }
              className={errors['cameras.lotFrameSkip'] ? 'border-red-500 dark:border-red-500' : ''}
              placeholder="e.g., 5"
              aria-required="true"
              aria-invalid={!!errors['cameras.lotFrameSkip']}
              aria-describedby={
                errors['cameras.lotFrameSkip']
                  ? 'lotFrameSkip-error lotFrameSkip-hint'
                  : 'lotFrameSkip-hint'
              }
            />
            {errors['cameras.lotFrameSkip'] && (
              <p id="lotFrameSkip-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors['cameras.lotFrameSkip']}
              </p>
            )}
            <p id="lotFrameSkip-hint" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Number of frames to skip for lot camera processing (0 = process every frame)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 pt-6 border-t border-gray-200 dark:border-[#2a2e37]">
        <Button
          type="submit"
          disabled={loading}
          className="min-h-[44px]"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Save Settings
        </Button>

      </div>
    </form>
  );
}
