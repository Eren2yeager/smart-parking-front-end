'use client';

import { ReactNode } from 'react';
import { useIsMobile, useIsTablet, useIsDesktop } from '@/lib/responsive-utils';

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
  mobileHidden?: boolean; // Hide this column on mobile card view
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  mobileCardRenderer?: (item: T) => ReactNode;
  emptyMessage?: string;
  className?: string;
}

export default function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  mobileCardRenderer,
  emptyMessage = 'No data available',
  className = '',
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();

  // Empty state
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  // Desktop: Standard table
  if (isDesktop) {
    return (
      <div className={`overflow-x-auto ${className}`}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.className || ''
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={keyExtractor(item)} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                      column.className || ''
                    }`}
                  >
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Tablet: Horizontally scrollable table
  if (isTablet) {
    return (
      <div className={`overflow-x-auto ${className}`}>
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                        column.className || ''
                      }`}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item) => (
                  <tr key={keyExtractor(item)} className="hover:bg-gray-50">
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-4 py-3 whitespace-nowrap text-sm text-gray-900 ${
                          column.className || ''
                        }`}
                      >
                        {column.render(item)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Mobile: Card layout
  if (isMobile) {
    // Use custom card renderer if provided
    if (mobileCardRenderer) {
      return (
        <div className={`space-y-4 ${className}`}>
          {data.map((item) => (
            <div
              key={keyExtractor(item)}
              className="bg-white rounded-lg shadow p-4 border border-gray-200"
            >
              {mobileCardRenderer(item)}
            </div>
          ))}
        </div>
      );
    }

    // Default card layout: show all non-hidden columns
    return (
      <div className={`space-y-4 ${className}`}>
        {data.map((item) => (
          <div
            key={keyExtractor(item)}
            className="bg-white rounded-lg shadow p-4 border border-gray-200"
          >
            <div className="space-y-3">
              {columns
                .filter((column) => !column.mobileHidden)
                .map((column) => (
                  <div key={column.key} className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      {column.header}
                    </span>
                    <div className="text-sm text-gray-900">
                      {column.render(item)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Fallback: render as desktop table
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  column.className || ''
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item) => (
            <tr key={keyExtractor(item)} className="hover:bg-gray-50">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                    column.className || ''
                  }`}
                >
                  {column.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
