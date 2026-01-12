import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import VideoCanvas from '@/components/VideoCanvas';
import { WebSocketManager } from '@/lib/websocket-manager';

// Mock WebSocketManager
vi.mock('@/lib/websocket-manager', () => ({
  WebSocketManager: vi.fn(),
}));

describe('VideoCanvas', () => {
  let mockConnect: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConnect = vi.fn().mockResolvedValue(undefined);
    mockDisconnect = vi.fn();

    vi.mocked(WebSocketManager).mockImplementation(() => ({
      connect: mockConnect,
      disconnect: mockDisconnect,
      getStatus: vi.fn().mockReturnValue('disconnected'),
      getMetrics: vi.fn().mockReturnValue({ frameRate: 0, latency: 0 }),
    } as any));
  });

  it('renders canvas element', () => {
    const { container } = render(
      <VideoCanvas wsUrl="ws://localhost:8000" cameraType="gate" />
    );
    
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('shows loading state initially', () => {
    render(<VideoCanvas wsUrl="ws://localhost:8000" cameraType="gate" />);
    
    expect(screen.getByText(/connecting to camera feed/i)).toBeTruthy();
  });

  it('connects to WebSocket on mount', () => {
    render(<VideoCanvas wsUrl="ws://localhost:8000" cameraType="gate" />);
    
    // Verify WebSocketManager was instantiated
    expect(WebSocketManager).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'ws://localhost:8000',
      })
    );
  });

  it('disconnects from WebSocket on unmount', () => {
    const { unmount } = render(
      <VideoCanvas wsUrl="ws://localhost:8000" cameraType="gate" />
    );
    
    // Clear the mock call count from mount
    mockDisconnect.mockClear();
    
    unmount();
    
    // Verify disconnect was called during cleanup
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('displays error message on connection failure', async () => {
    mockConnect.mockRejectedValue(new Error('Connection failed'));

    render(<VideoCanvas wsUrl="ws://localhost:8000" cameraType="gate" />);
    
    await waitFor(() => {
      expect(screen.getByText(/connection error/i)).toBeTruthy();
    });
  });

  it('calls onConnectionChange callback', () => {
    const onConnectionChange = vi.fn();
    
    render(
      <VideoCanvas
        wsUrl="ws://localhost:8000"
        cameraType="gate"
        onConnectionChange={onConnectionChange}
      />
    );
    
    // Verify WebSocketManager was instantiated with onStatusChange callback
    expect(WebSocketManager).toHaveBeenCalledWith(
      expect.objectContaining({
        onStatusChange: expect.any(Function),
      })
    );
  });

  it('calls onDetection callback when detections received', () => {
    const onDetection = vi.fn();
    
    render(
      <VideoCanvas
        wsUrl="ws://localhost:8000"
        cameraType="gate"
        onDetection={onDetection}
      />
    );
    
    // Verify WebSocketManager was instantiated with onFrame callback
    expect(WebSocketManager).toHaveBeenCalledWith(
      expect.objectContaining({
        onFrame: expect.any(Function),
      })
    );
  });
});
