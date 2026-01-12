'use client';

import { useState } from 'react';
import { format, subDays } from 'date-fns';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
}

type PresetOption = {
  label: string;
  days: number;
};

const PRESET_OPTIONS: PresetOption[] = [
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
];

export default function DateRangePicker({
  startDate,
  endDate,
  onDateRangeChange,
}: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(format(startDate, 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(endDate, 'yyyy-MM-dd'));

  const handlePresetClick = (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    onDateRangeChange(start, end);
    setShowCustom(false);
  };

  const handleCustomApply = () => {
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      alert('Invalid date format');
      return;
    }

    if (start >= end) {
      alert('Start date must be before end date');
      return;
    }

    // Check if date range is not too large (max 1 year)
    const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      alert('Date range cannot exceed 365 days');
      return;
    }

    onDateRangeChange(start, end);
    setShowCustom(false);
  };

  const handleCustomCancel = () => {
    setCustomStartDate(format(startDate, 'yyyy-MM-dd'));
    setCustomEndDate(format(endDate, 'yyyy-MM-dd'));
    setShowCustom(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Date Range</h3>
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {showCustom ? 'Hide Custom' : 'Custom Range'}
        </button>
      </div>

      {/* Current Date Range Display */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500 mb-1">Selected Range</p>
        <p className="text-sm font-medium text-gray-900">
          {format(startDate, 'MMM dd, yyyy')} - {format(endDate, 'MMM dd, yyyy')}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days
        </p>
      </div>

      {/* Preset Options */}
      {!showCustom && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Quick Select
          </p>
          {PRESET_OPTIONS.map((preset) => (
            <button
              key={preset.days}
              onClick={() => handlePresetClick(preset.days)}
              className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors border border-gray-200 hover:border-blue-300"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* Custom Date Range Inputs */}
      {showCustom && (
        <div className="space-y-4">
          <div>
            <label htmlFor="start-date" className="block text-xs font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="start-date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              max={customEndDate}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="end-date" className="block text-xs font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              id="end-date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              min={customStartDate}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleCustomApply}
              className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Apply
            </button>
            <button
              onClick={handleCustomCancel}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
            <p>• Maximum range: 365 days</p>
            <p>• End date cannot be in the future</p>
          </div>
        </div>
      )}
    </div>
  );
}
