import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Report from '@/models/Report';
import Violation from '@/models/Violation';
import CapacityLog from '@/models/CapacityLog';
import ParkingLot from '@/models/ParkingLot';
import Contractor from '@/models/Contractor';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { generateCSVReport, generateExcelReport, generatePDFReport } from '@/lib/report-generator';
import {
  formatViolationsReport,
  formatOccupancyReport,
  formatContractorPerformanceReport,
} from '@/lib/report-formatters';

interface ReportConfig {
  type: 'violations' | 'occupancy' | 'contractor_performance';
  dateRange: {
    start: string;
    end: string;
  };
  format: 'csv' | 'excel' | 'pdf';
  filters?: {
    parkingLotId?: string;
    contractorId?: string;
  };
}

/**
 * POST /api/reports/generate
 * Generate a report based on configuration
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth();

    await dbConnect();

    // Parse request body
    const body = await request.json();
    const config: ReportConfig = body.config;

    // Validate config
    if (!config || !config.type || !config.dateRange || !config.format) {
      return NextResponse.json(
        { error: 'Invalid report configuration' },
        { status: 400 }
      );
    }

    // Validate date range
    const startDate = new Date(config.dateRange.start);
    const endDate = new Date(config.dateRange.end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date range' },
        { status: 400 }
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    // Create Report record with status "generating"
    const report = await Report.create({
      type: config.type,
      config: {
        type: config.type,
        dateRange: {
          start: startDate,
          end: endDate,
        },
        format: config.format,
        filters: config.filters,
      },
      status: 'generating',
      generatedBy: session.user.id,
    });

    try {
      // Query database for report data
      let reportData: any;

      switch (config.type) {
        case 'violations':
          reportData = await fetchViolationsData(startDate, endDate, config.filters);
          break;

        case 'occupancy':
          reportData = await fetchOccupancyData(startDate, endDate, config.filters);
          break;

        case 'contractor_performance':
          reportData = await fetchContractorPerformanceData(startDate, endDate, config.filters);
          break;

        default:
          throw new Error(`Unsupported report type: ${config.type}`);
      }

      // Generate file based on format
      let fileContent: Buffer | string;
      let filename: string;
      let mimeType: string;

      switch (config.format) {
        case 'csv': {
          const result = await generateCSVReport(config.type, reportData);
          fileContent = result.content;
          filename = result.filename;
          mimeType = 'text/csv';
          break;
        }

        case 'excel': {
          const result = await generateExcelReport(config.type, reportData);
          fileContent = result.buffer;
          filename = result.filename;
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        }

        case 'pdf': {
          const result = await generatePDFReport(config.type, reportData);
          fileContent = result.buffer;
          filename = result.filename;
          mimeType = 'application/pdf';
          break;
        }

        default:
          throw new Error(`Unsupported format: ${config.format}`);
      }

      // Convert content to base64 for storage
      const base64Content =
        typeof fileContent === 'string'
          ? Buffer.from(fileContent).toString('base64')
          : fileContent.toString('base64');

      // Create data URL
      const dataUrl = `data:${mimeType};base64,${base64Content}`;

      // Update Report record with file URL
      report.status = 'completed';
      report.fileUrl = dataUrl;
      report.filename = filename;
      report.fileSize = Buffer.byteLength(base64Content, 'base64');
      report.completedAt = new Date();
      await report.save();

      // Return download URL
      return NextResponse.json({
        success: true,
        downloadUrl: dataUrl,
        filename: filename,
        size: report.fileSize,
        reportId: report._id,
      });
    } catch (error) {
      // Update Report record with error
      report.status = 'failed';
      report.error = error instanceof Error ? error.message : 'Unknown error';
      await report.save();

      throw error;
    }
  } catch (error) {
    console.error('Report generation error:', error);

    if (error instanceof Error && error.message.includes('auth')) {
      return handleAuthError(error);
    }

    return NextResponse.json(
      {
        error: 'Failed to generate report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch violations data for report
 */
async function fetchViolationsData(
  startDate: Date,
  endDate: Date,
  filters?: { parkingLotId?: string; contractorId?: string }
) {
  const query: any = {
    timestamp: {
      $gte: startDate,
      $lte: endDate,
    },
  };

  if (filters?.parkingLotId) {
    query.parkingLotId = filters.parkingLotId;
  }

  if (filters?.contractorId) {
    query.contractorId = filters.contractorId;
  }

  const violations = await Violation.find(query)
    .populate('contractorId', 'name')
    .populate('parkingLotId', 'name')
    .sort({ timestamp: -1 })
    .lean();

  return formatViolationsReport(violations);
}

/**
 * Fetch occupancy data for report
 */
async function fetchOccupancyData(
  startDate: Date,
  endDate: Date,
  filters?: { parkingLotId?: string; contractorId?: string }
) {
  const query: any = {
    timestamp: {
      $gte: startDate,
      $lte: endDate,
    },
  };

  if (filters?.parkingLotId) {
    query.parkingLotId = filters.parkingLotId;
  }

  if (filters?.contractorId) {
    query.contractorId = filters.contractorId;
  }

  // Aggregate occupancy data by parking lot and date
  const aggregatedData = await CapacityLog.aggregate([
    { $match: query },
    {
      $group: {
        _id: {
          parkingLotId: '$parkingLotId',
          date: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
          },
        },
        avgOccupancy: { $avg: '$occupied' },
        peakOccupancy: { $max: '$occupied' },
        avgOccupancyRate: { $avg: '$occupancyRate' },
        totalSlots: { $first: '$totalSlots' },
        contractorId: { $first: '$contractorId' },
      },
    },
    { $sort: { '_id.date': -1 } },
  ]);

  // Populate parking lot and contractor names
  const populatedData = await Promise.all(
    aggregatedData.map(async (item) => {
      const lot = await ParkingLot.findById(item._id.parkingLotId).select('name').lean();
      const contractor = await Contractor.findById(item.contractorId).select('name').lean();

      return {
        lotName: lot?.name || 'Unknown',
        date: item._id.date,
        avgOccupancy: item.avgOccupancy,
        peakOccupancy: item.peakOccupancy,
        occupancyRate: item.avgOccupancyRate * 100,
        totalSlots: item.totalSlots,
        contractorName: contractor?.name || 'Unknown',
      };
    })
  );

  return formatOccupancyReport(populatedData);
}

/**
 * Fetch contractor performance data for report
 */
async function fetchContractorPerformanceData(
  startDate: Date,
  endDate: Date,
  filters?: { parkingLotId?: string; contractorId?: string }
) {
  const contractorQuery: any = { status: 'active' };

  if (filters?.contractorId) {
    contractorQuery._id = filters.contractorId;
  }

  const contractors = await Contractor.find(contractorQuery).lean();

  const performanceData = await Promise.all(
    contractors.map(async (contractor) => {
      // Count violations
      const violationQuery: any = {
        contractorId: contractor._id,
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      };

      if (filters?.parkingLotId) {
        violationQuery.parkingLotId = filters.parkingLotId;
      }

      const violations = await Violation.find(violationQuery).lean();
      const totalViolations = violations.length;
      const totalPenalties = violations.reduce((sum, v) => sum + v.penalty, 0);

      // Get parking lots for this contractor
      const lotQuery: any = { contractorId: contractor._id };
      if (filters?.parkingLotId) {
        lotQuery._id = filters.parkingLotId;
      }

      const lots = await ParkingLot.find(lotQuery).lean();
      const activeLotsCount = lots.filter((lot) => lot.status === 'active').length;

      // Calculate average occupancy
      const capacityQuery: any = {
        contractorId: contractor._id,
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      };

      if (filters?.parkingLotId) {
        capacityQuery.parkingLotId = filters.parkingLotId;
      }

      const capacityLogs = await CapacityLog.find(capacityQuery).lean();
      const avgOccupancy =
        capacityLogs.length > 0
          ? capacityLogs.reduce((sum, log) => sum + log.occupied, 0) / capacityLogs.length
          : 0;

      // Calculate compliance rate (100% - violation rate)
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const violationRate = totalDays > 0 ? (totalViolations / totalDays) * 100 : 0;
      const complianceRate = Math.max(0, 100 - violationRate);

      return {
        contractorName: contractor.name,
        complianceRate,
        totalViolations,
        avgOccupancy,
        allocatedCapacity: contractor.contractDetails.allocatedCapacity,
        totalPenalties,
        activeLotsCount,
      };
    })
  );

  return formatContractorPerformanceReport(performanceData);
}
