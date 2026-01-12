'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, Download, AlertCircle, Loader2 } from 'lucide-react';
import { subDays } from 'date-fns';
import DateRangePicker from './DateRangePicker';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ReportType = 'violations' | 'occupancy' | 'contractor_performance';
type ReportFormat = 'csv' | 'excel' | 'pdf';

interface ReportConfig {
  type: ReportType;
  dateRange: {
    start: Date;
    end: Date;
  };
  format: ReportFormat;
  filters?: {
    parkingLotId?: string;
    contractorId?: string;
  };
}

export default function ReportModal({ isOpen, onClose }: ReportModalProps) {
  const [reportType, setReportType] = useState<ReportType>('violations');
  const [reportFormat, setReportFormat] = useState<ReportFormat>('csv');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setIsGenerating(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDateRangeChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleGenerate = async () => {
    setError(null);
    setIsGenerating(true);

    try {
      const config: ReportConfig = {
        type: reportType,
        dateRange: {
          start: startDate,
          end: endDate,
        },
        format: reportFormat,
      };

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      const data = await response.json();

      // Trigger file download
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Close modal on success
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      console.error('Report generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const reportTypeOptions = [
    { value: 'violations', label: 'Violations Report', description: 'Contractor violations and penalties' },
    { value: 'occupancy', label: 'Occupancy Report', description: 'Parking lot occupancy trends' },
    {
      value: 'contractor_performance',
      label: 'Contractor Performance',
      description: 'Compliance rates and performance metrics',
    },
  ];

  const formatOptions = [
    { value: 'csv', label: 'CSV', description: 'Comma-separated values (Excel compatible)' },
    { value: 'excel', label: 'Excel', description: 'Formatted spreadsheet with charts' },
    { value: 'pdf', label: 'PDF', description: 'Printable document with tables' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="w-6 h-6 text-blue-600 mr-3" />
            <h2 id="report-modal-title" className="text-xl font-semibold text-gray-900">
              Generate Report
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-900 mb-1">Error</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Report Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Report Type</label>
            <div className="space-y-2">
              {reportTypeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                    reportType === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="radio"
                    name="reportType"
                    value={option.value}
                    checked={reportType === option.value}
                    onChange={(e) => setReportType(e.target.value as ReportType)}
                    disabled={isGenerating}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Date Range</label>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onDateRangeChange={handleDateRangeChange}
            />
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
            <div className="grid grid-cols-3 gap-3">
              {formatOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex flex-col items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    reportFormat === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="radio"
                    name="reportFormat"
                    value={option.value}
                    checked={reportFormat === option.value}
                    onChange={(e) => setReportFormat(e.target.value as ReportFormat)}
                    disabled={isGenerating}
                    className="sr-only"
                  />
                  <div className="text-sm font-medium text-gray-900 mb-1">{option.label}</div>
                  <div className="text-xs text-gray-500 text-center">{option.description}</div>
                </label>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <FileText className="w-5 h-5 text-blue-600 mr-3 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Report will include:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  {reportType === 'violations' && (
                    <>
                      <li>Contractor name and parking lot</li>
                      <li>Violation timestamp and type</li>
                      <li>Excess vehicles and penalties</li>
                    </>
                  )}
                  {reportType === 'occupancy' && (
                    <>
                      <li>Parking lot name and date</li>
                      <li>Average and peak occupancy</li>
                      <li>Occupancy rate percentage</li>
                    </>
                  )}
                  {reportType === 'contractor_performance' && (
                    <>
                      <li>Contractor name and compliance rate</li>
                      <li>Total violations and penalties</li>
                      <li>Average occupancy metrics</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
