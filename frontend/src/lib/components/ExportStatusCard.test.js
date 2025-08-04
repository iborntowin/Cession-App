import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { vi } from 'vitest';
import ExportStatusCard from './ExportStatusCard.svelte';

// Mock the entire API module
vi.mock('$lib/api', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }),
    getAuthHeaders: vi.fn(() => ({})),
  },
  get: vi.fn(),
  post: vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }),
  getAuthHeaders: vi.fn(() => ({})),
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
    createdAt: '2024-01-15T10:30:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders loading state initially', () => {
    render(ExportStatusCard);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('displays successful export status', async () => {
    const { component } = render(ExportStatusCard);
    await component.$set({ exportStatus: mockExportStatus, loading: false });

    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
    expect(screen.getByText('export-test.json')).toBeInTheDocument();
    expect(screen.getByText(/150/)).toBeInTheDocument();
    expect(screen.getByText(/89/)).toBeInTheDocument();
    expect(screen.getByText('1.0 KB')).toBeInTheDocument();
  });

  test('displays failed export status', async () => {
    const failedStatus = {
      ...mockExportStatus,
      status: 'FAILED',
      errorMessage: 'Network timeout',
      supabaseUrl: null,
    };
    const { component } = render(ExportStatusCard);
    await component.$set({ exportStatus: failedStatus, loading: false });

    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getByText('Network timeout')).toBeInTheDocument();
    expect(screen.queryByText('View Export File')).not.toBeInTheDocument();
  });

  test('displays message when no exports are found', async () => {
    const { component } = render(ExportStatusCard);
    await component.$set({ exportStatus: null, loading: false });

    expect(screen.getByText(/no exports yet/i)).toBeInTheDocument();
  });

  test('manual sync button triggers export', async () => {
    const { component } = render(ExportStatusCard);
    await component.$set({ loading: false });

    const syncButton = screen.getByText('Sync Now');
    await fireEvent.click(syncButton);

    await waitFor(() => {
      expect(screen.getByText(/syncing/i)).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully on load', async () => {
    const { component } = render(ExportStatusCard);
    await component.$set({ error: 'Failed to connect', loading: false });

    expect(screen.getByText(/error/i)).toBeInTheDocument();
    expect(screen.getByText('Failed to connect')).toBeInTheDocument();
  });
});
