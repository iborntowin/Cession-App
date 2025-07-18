import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { vi } from 'vitest';
import ExportStatusCard from './ExportStatusCard.svelte';

// Mock the API module
vi.mock('$lib/api.js', () => ({
  get: vi.fn(),
  post: vi.fn()
}));

describe('ExportStatusCard', () => {
  const mockExportStatus = {
    id: 'test-id-123',
    exportTimestamp: '2024-01-15T10:30:00Z',
    status: 'SUCCESS',
    supabaseUrl: 'https://test.supabase.co/storage/v1/object/public/bucket/export-test.json',
    fileName: 'export-test.json',
    recordCount: 150,
    cessionCount: 89,
    fileSizeBytes: 1024,
    createdAt: '2024-01-15T10:30:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders loading state initially', () => {
    render(ExportStatusCard);
    
    expect(screen.getByText('Loading export status...')).toBeInTheDocument();
  });

  test('displays successful export status', async () => {
    const { component } = render(ExportStatusCard);
    
    // Simulate successful API response
    await component.$set({ 
      exportStatus: mockExportStatus,
      loading: false 
    });

    expect(screen.getByText('Data Export Status')).toBeInTheDocument();
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
    expect(screen.getByText('export-test.json')).toBeInTheDocument();
    expect(screen.getByText('150 clients, 89 cessions')).toBeInTheDocument();
    expect(screen.getByText('1.0 KB')).toBeInTheDocument();
  });

  test('displays failed export status with error message', async () => {
    const failedStatus = {
      ...mockExportStatus,
      status: 'FAILED',
      errorMessage: 'Network timeout',
      supabaseUrl: null,
      fileName: null
    };

    const { component } = render(ExportStatusCard);
    
    await component.$set({ 
      exportStatus: failedStatus,
      loading: false 
    });

    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getByText('Network timeout')).toBeInTheDocument();
    expect(screen.queryByText('View Export File')).not.toBeInTheDocument();
  });

  test('displays "No exports found" when no status available', async () => {
    const { component } = render(ExportStatusCard);
    
    await component.$set({ 
      exportStatus: null,
      loading: false 
    });

    expect(screen.getByText('No exports found')).toBeInTheDocument();
    expect(screen.getByText('No data exports have been performed yet.')).toBeInTheDocument();
  });

  test('manual export button triggers export', async () => {
    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockExportStatus)
    });
    
    vi.doMock('$lib/api.js', () => ({
      post: mockPost
    }));

    const { component } = render(ExportStatusCard);
    
    await component.$set({ 
      exportStatus: mockExportStatus,
      loading: false 
    });

    const manualExportButton = screen.getByText('Force Manual Export');
    await fireEvent.click(manualExportButton);

    expect(mockPost).toHaveBeenCalledWith('/api/v1/export/manual');
  });

  test('manual export button shows loading state', async () => {
    const mockPost = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve(mockExportStatus)
      }), 100))
    );
    
    vi.doMock('$lib/api.js', () => ({
      post: mockPost
    }));

    const { component } = render(ExportStatusCard);
    
    await component.$set({ 
      exportStatus: mockExportStatus,
      loading: false 
    });

    const manualExportButton = screen.getByText('Force Manual Export');
    await fireEvent.click(manualExportButton);

    expect(screen.getByText('Exporting...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Force Manual Export')).toBeInTheDocument();
    });
  });

  test('handles manual export failure', async () => {
    const mockPost = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({
        status: 'FAILED',
        errorMessage: 'Server error'
      })
    });
    
    vi.doMock('$lib/api.js', () => ({
      post: mockPost
    }));

    const { component } = render(ExportStatusCard);
    
    await component.$set({ 
      exportStatus: mockExportStatus,
      loading: false 
    });

    const manualExportButton = screen.getByText('Force Manual Export');
    await fireEvent.click(manualExportButton);

    await waitFor(() => {
      expect(screen.getByText('Export failed: Server error')).toBeInTheDocument();
    });
  });

  test('public URL link opens in new tab', async () => {
    const { component } = render(ExportStatusCard);
    
    await component.$set({ 
      exportStatus: mockExportStatus,
      loading: false 
    });

    const linkElement = screen.getByText('View Export File');
    expect(linkElement.closest('a')).toHaveAttribute('href', mockExportStatus.supabaseUrl);
    expect(linkElement.closest('a')).toHaveAttribute('target', '_blank');
    expect(linkElement.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('formats file size correctly', async () => {
    const testCases = [
      { bytes: 512, expected: '512 B' },
      { bytes: 1024, expected: '1.0 KB' },
      { bytes: 1536, expected: '1.5 KB' },
      { bytes: 1048576, expected: '1.0 MB' },
      { bytes: 1073741824, expected: '1.0 GB' }
    ];

    for (const testCase of testCases) {
      const { component } = render(ExportStatusCard);
      
      await component.$set({ 
        exportStatus: {
          ...mockExportStatus,
          fileSizeBytes: testCase.bytes
        },
        loading: false 
      });

      expect(screen.getByText(testCase.expected)).toBeInTheDocument();
    }
  });

  test('formats timestamp correctly', async () => {
    const { component } = render(ExportStatusCard);
    
    await component.$set({ 
      exportStatus: {
        ...mockExportStatus,
        exportTimestamp: '2024-01-15T10:30:00Z'
      },
      loading: false 
    });

    // The exact format may depend on locale, but should contain date and time
    const timestampElement = screen.getByText(/Jan.*15.*2024/);
    expect(timestampElement).toBeInTheDocument();
  });

  test('status indicator shows correct color for success', async () => {
    const { component } = render(ExportStatusCard);
    
    await component.$set({ 
      exportStatus: mockExportStatus,
      loading: false 
    });

    const statusElement = screen.getByText('SUCCESS');
    expect(statusElement).toHaveClass('text-green-600');
  });

  test('status indicator shows correct color for failure', async () => {
    const failedStatus = {
      ...mockExportStatus,
      status: 'FAILED'
    };

    const { component } = render(ExportStatusCard);
    
    await component.$set({ 
      exportStatus: failedStatus,
      loading: false 
    });

    const statusElement = screen.getByText('FAILED');
    expect(statusElement).toHaveClass('text-red-600');
  });

  test('refresh button updates export status', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockExportStatus)
    });
    
    vi.doMock('$lib/api.js', () => ({
      get: mockGet
    }));

    const { component } = render(ExportStatusCard);
    
    await component.$set({ 
      exportStatus: mockExportStatus,
      loading: false 
    });

    const refreshButton = screen.getByLabelText('Refresh export status');
    await fireEvent.click(refreshButton);

    expect(mockGet).toHaveBeenCalledWith('/api/v1/export/status');
  });

  test('handles API errors gracefully', async () => {
    const mockGet = vi.fn().mockRejectedValue(new Error('Network error'));
    
    vi.doMock('$lib/api.js', () => ({
      get: mockGet
    }));

    const { component } = render(ExportStatusCard);
    
    // Simulate component initialization with API error
    await component.$set({ 
      exportStatus: null,
      loading: false,
      error: 'Failed to load export status'
    });

    expect(screen.getByText('Failed to load export status')).toBeInTheDocument();
  });

  test('shows appropriate message for in-progress export', async () => {
    const inProgressStatus = {
      ...mockExportStatus,
      status: 'IN_PROGRESS'
    };

    const { component } = render(ExportStatusCard);
    
    await component.$set({ 
      exportStatus: inProgressStatus,
      loading: false 
    });

    expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument();
    expect(screen.getByText('Export is currently in progress...')).toBeInTheDocument();
  });
});