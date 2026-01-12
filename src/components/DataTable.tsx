'use client';

import React from 'react';
import { theme } from '@/lib/theme';

/**
 * DataTable Component
 * 
 * Accessible data table for displaying chart data in tabular format.
 * Provides an alternative view for screen readers and users who prefer tables.
 * Can be visually hidden while remaining accessible to assistive technologies.
 */

export interface DataTableColumn {
  /**
   * Column header text
   */
  header: string;
  
  /**
   * Accessor key for the data
   */
  accessor: string;
  
  /**
   * Optional formatter function
   */
  formatter?: (value: any) => string;
}

export interface DataTableProps {
  /**
   * Table caption (required for accessibility)
   */
  caption: string;
  
  /**
   * Column definitions
   */
  columns: DataTableColumn[];
  
  /**
   * Table data
   */
  data: Record<string, any>[];
  
  /**
   * Whether to visually hide the table (still accessible to screen readers)
   */
  visuallyHidden?: boolean;
  
  /**
   * Additional CSS class name
   */
  className?: string;
}

export function DataTable({
  caption,
  columns,
  data,
  visuallyHidden = false,
  className = '',
}: DataTableProps) {
  const tableStyle: React.CSSProperties = visuallyHidden
    ? {
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        borderWidth: 0,
      }
    : {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: theme.typography.fontSize.sm,
        fontFamily: theme.typography.fontFamily.sans,
      };

  const thStyle: React.CSSProperties = {
    padding: theme.spacing[3],
    textAlign: 'left',
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.neutral[100],
    borderBottom: `2px solid ${theme.colors.border.main}`,
  };

  const tdStyle: React.CSSProperties = {
    padding: theme.spacing[3],
    color: theme.colors.text.primary,
    borderBottom: `1px solid ${theme.colors.border.light}`,
  };

  return (
    <table style={tableStyle} className={className}>
      <caption
        style={{
          padding: theme.spacing[3],
          fontSize: theme.typography.fontSize.base,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.text.primary,
          textAlign: 'left',
          captionSide: 'top',
        }}
      >
        {caption}
      </caption>
      <thead>
        <tr>
          {columns.map((column, index) => (
            <th key={index} scope="col" style={thStyle}>
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td
              colSpan={columns.length}
              style={{
                ...tdStyle,
                textAlign: 'center',
                color: theme.colors.text.secondary,
                fontStyle: 'italic',
              }}
            >
              No data available
            </td>
          </tr>
        ) : (
          data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column, colIndex) => {
                const value = row[column.accessor];
                const formattedValue = column.formatter
                  ? column.formatter(value)
                  : value?.toString() || '-';

                return (
                  <td key={colIndex} style={tdStyle}>
                    {formattedValue}
                  </td>
                );
              })}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

/**
 * ChartWithTable Component
 * 
 * Wrapper component that displays a chart with an optional data table toggle.
 * Provides both visual and tabular representations of the same data.
 */

export interface ChartWithTableProps {
  /**
   * Chart component to display
   */
  chart: React.ReactNode;
  
  /**
   * Table caption
   */
  tableCaption: string;
  
  /**
   * Table columns
   */
  tableColumns: DataTableColumn[];
  
  /**
   * Table data
   */
  tableData: Record<string, any>[];
  
  /**
   * Whether to show the table by default
   */
  defaultShowTable?: boolean;
}

export function ChartWithTable({
  chart,
  tableCaption,
  tableColumns,
  tableData,
  defaultShowTable = false,
}: ChartWithTableProps) {
  const [showTable, setShowTable] = React.useState(defaultShowTable);

  return (
    <div>
      {/* Toggle Button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: theme.spacing[3],
        }}
      >
        <button
          onClick={() => setShowTable(!showTable)}
          style={{
            padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.primary[600],
            backgroundColor: 'transparent',
            border: `1px solid ${theme.colors.primary[300]}`,
            borderRadius: theme.borderRadius.md,
            cursor: 'pointer',
            transition: `all ${theme.transitions.duration.fast} ${theme.transitions.timing.ease}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.primary[50];
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label={showTable ? 'Show chart view' : 'Show table view'}
        >
          {showTable ? 'Show Chart' : 'Show Table'}
        </button>
      </div>

      {/* Chart or Table */}
      {showTable ? (
        <DataTable
          caption={tableCaption}
          columns={tableColumns}
          data={tableData}
          visuallyHidden={false}
        />
      ) : (
        <>
          {chart}
          {/* Hidden table for screen readers */}
          <DataTable
            caption={tableCaption}
            columns={tableColumns}
            data={tableData}
            visuallyHidden={true}
          />
        </>
      )}
    </div>
  );
}

export default DataTable;
