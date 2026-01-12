import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReportModal from '@/components/ReportModal';

// Mock fetch
global.fetch = vi.fn();

describe('ReportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    const { container } = render(<ReportModal isOpen={false} onClose={vi.fn()} />);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders when open', () => {
    render(<ReportModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Generate Report' })).toBeTruthy();
  });

  it('displays report type options', () => {
    render(<ReportModal isOpen={true} onClose={vi.fn()} />);
    
    expect(screen.getByText('Violations Report')).toBeTruthy();
    expect(screen.getByText('Occupancy Report')).toBeTruthy();
    expect(screen.getByText('Contractor Performance')).toBeTruthy();
  });

  it('displays format options', () => {
    render(<ReportModal isOpen={true} onClose={vi.fn()} />);
    
    expect(screen.getByText('CSV')).toBeTruthy();
    expect(screen.getByText('Excel')).toBeTruthy();
    expect(screen.getByText('PDF')).toBeTruthy();
  });

  it('calls onClose when cancel button clicked', () => {
    const onClose = vi.fn();
    render(<ReportModal isOpen={true} onClose={onClose} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('shows loading state during generation', async () => {
    vi.mocked(global.fetch).mockImplementation(() =>
      new Promise(() => {}) // Never resolves
    );

    render(<ReportModal isOpen={true} onClose={vi.fn()} />);
    
    const generateButton = screen.getByRole('button', { name: /Generate Report/i });
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('Generating...')).toBeTruthy();
    });
  });

  it('displays error message on generation failure', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Failed to generate report' }),
    } as Response);

    render(<ReportModal isOpen={true} onClose={vi.fn()} />);
    
    const generateButton = screen.getByRole('button', { name: /Generate Report/i });
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to generate report')).toBeTruthy();
    });
  });

  it('triggers download on successful generation', async () => {
    const mockDownloadUrl = 'http://example.com/report.csv';
    const mockFilename = 'report.csv';

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        downloadUrl: mockDownloadUrl,
        filename: mockFilename,
      }),
    } as Response);

    // Mock document.createElement and appendChild
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

    const { container } = render(<ReportModal isOpen={true} onClose={vi.fn()} />);
    
    const generateButton = screen.getByRole('button', { name: /Generate Report/i });
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.href).toBe(mockDownloadUrl);
      expect(mockLink.download).toBe(mockFilename);
    });

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});
