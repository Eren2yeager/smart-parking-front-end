'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Award, AlertTriangle } from 'lucide-react';
import { theme } from '@/lib/theme';
import Link from 'next/link';

interface ContractorPerformance {
  _id: string;
  name: string;
  complianceRate: number;
  totalViolations: number;
  averageOccupancy: number;
}

export default function ContractorRanking() {
  const [topPerformers, setTopPerformers] = useState<ContractorPerformance[]>([]);
  const [bottomPerformers, setBottomPerformers] = useState<ContractorPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContractorPerformance = async () => {
    try {
      setError(null);
      const response = await fetch('/api/contractors?limit=50');

      if (!response.ok) {
        throw new Error('Failed to fetch contractors');
      }

      const result = await response.json();
      const contractors: ContractorPerformance[] = result.data || [];

      // Calculate compliance rate for each contractor
      const contractorsWithCompliance = contractors.map((contractor: any) => ({
        _id: contractor._id,
        name: contractor.name,
        complianceRate: contractor.performance?.complianceRate || 0,
        totalViolations: contractor.performance?.totalViolations || 0,
        averageOccupancy: contractor.performance?.averageOccupancy || 0,
      }));

      // Sort by compliance rate
      const sorted = [...contractorsWithCompliance].sort(
        (a, b) => b.complianceRate - a.complianceRate
      );

      // Get top 3 and bottom 3
      setTopPerformers(sorted.slice(0, 3));
      setBottomPerformers(sorted.slice(-3).reverse());
    } catch (err) {
      console.error('Error fetching contractor performance:', err);
      setError('Failed to load contractor rankings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractorPerformance();

    // Poll for updates every 60 seconds
    const interval = setInterval(fetchContractorPerformance, 60000);

    return () => clearInterval(interval);
  }, []);

  const renderContractorItem = (
    contractor: ContractorPerformance,
    rank: number,
    isTop: boolean
  ) => {
    const complianceColor =
      contractor.complianceRate >= 90
        ? theme.colors.success[600]
        : contractor.complianceRate >= 70
        ? theme.colors.warning[600]
        : theme.colors.error[600];

    const complianceBgColor =
      contractor.complianceRate >= 90
        ? theme.colors.success[50]
        : contractor.complianceRate >= 70
        ? theme.colors.warning[50]
        : theme.colors.error[50];

    return (
      <Link
        key={contractor._id}
        href={`/contractors/${contractor._id}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: theme.spacing[3],
          borderRadius: theme.borderRadius.lg,
          backgroundColor: theme.colors.neutral[50],
          border: `1px solid ${theme.colors.neutral[200]}`,
          transition: `all ${theme.transitions.duration.base} ${theme.transitions.timing.ease}`,
          cursor: 'pointer',
          textDecoration: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = theme.colors.neutral[100];
          e.currentTarget.style.boxShadow = theme.shadows.md;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = theme.colors.neutral[50];
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: theme.borderRadius.full,
              backgroundColor: isTop ? theme.colors.success[100] : theme.colors.error[100],
              color: isTop ? theme.colors.success[700] : theme.colors.error[700],
              fontWeight: theme.typography.fontWeight.bold,
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            {rank}
          </div>
          <div className="flex-1 min-w-0">
            <p
              style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.text.primary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {contractor.name}
            </p>
            <p
              style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.text.secondary,
              }}
            >
              {contractor.totalViolations} violation{contractor.totalViolations !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
            padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
            borderRadius: theme.borderRadius.full,
            backgroundColor: complianceBgColor,
          }}
        >
          {isTop ? (
            <TrendingUp className="w-4 h-4" style={{ color: complianceColor }} />
          ) : (
            <TrendingDown className="w-4 h-4" style={{ color: complianceColor }} />
          )}
          <span
            style={{
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.bold,
              color: complianceColor,
            }}
          >
            {contractor.complianceRate.toFixed(1)}%
          </span>
        </div>
      </Link>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Contractor Performance</h3>
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Contractor Performance</h3>
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Contractor Performance</h3>
        <button
          onClick={fetchContractorPerformance}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <Award className="w-5 h-5" style={{ color: theme.colors.success[600] }} />
            <h4
              style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.text.primary,
              }}
            >
              Top Performers
            </h4>
          </div>
          <div className="space-y-2">
            {topPerformers.map((contractor, index) =>
              renderContractorItem(contractor, index + 1, true)
            )}
          </div>
        </div>
      )}

      {/* Bottom Performers */}
      {bottomPerformers.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="w-5 h-5" style={{ color: theme.colors.error[600] }} />
            <h4
              style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.text.primary,
              }}
            >
              Needs Improvement
            </h4>
          </div>
          <div className="space-y-2">
            {bottomPerformers.map((contractor, index) =>
              renderContractorItem(contractor, index + 1, false)
            )}
          </div>
        </div>
      )}

      {topPerformers.length === 0 && bottomPerformers.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No contractor data available</p>
        </div>
      )}
    </div>
  );
}
