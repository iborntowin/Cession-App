import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { vi } from 'vitest';
import { tick } from 'svelte';
import ExportStatusCard from './ExportStatusCard.svelte';

// Mock fetch globally
global.fetch = vi.fn();

// Mock the config
vi.mock('$lib/config', () => ({
  config: {
    backendUrl: 'http://localhost:8080'
  }
}));

// Mock getAuthHeaders
vi.mock('$lib/api', () => ({
  getAuthHeaders: vi.fn(() => ({ 'Authorization': 'Bearer test-token' }))
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
    // Reset fetch mock
    global.fetch.mockReset();
  });

  test('renders initial state with no exports', () => {
    // Mock the initial fetch calls to return no content
    global.fetch.mockImplementation((url) => {
      if (url.includes('/export/status')) {
        return Promise.resolve({
          ok: true,
          status: 204, // No content
        });
      }
      if (url.includes('/export/schedule/config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(null)
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(ExportStatusCard);
    expect(screen.getByText(/no exports yet/i)).toBeInTheDocument();
  });

  test('displays message when no exports are found', async () => {
    // Mock the fetch calls to return no content
    global.fetch.mockImplementation((url) => {
      if (url.includes('/export/status')) {
        return Promise.resolve({
          ok: true,
          status: 204, // No content
        });
      }
      if (url.includes('/export/schedule/config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(null)
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(ExportStatusCard);

    await waitFor(() => {
      expect(screen.getByText(/no exports yet/i)).toBeInTheDocument();
    });
  });

  test('manual sync button triggers export', async () => {
    // Mock initial status fetch (no content)
    global.fetch.mockImplementation((url) => {
      if (url.includes('/export/status')) {
        return Promise.resolve({
          ok: true,
          status: 204, // No content initially
        });
      }
      if (url.includes('/export/schedule/config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(null)
        });
      }
      if (url.includes('/export/manual')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockExportStatus)
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(ExportStatusCard);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/no exports yet/i)).toBeInTheDocument();
    });

    const syncButton = screen.getByText('Sync Now');
    await fireEvent.click(syncButton);

    // Wait for the sync to complete and status to update
    await waitFor(() => {
      expect(screen.getByText('SUCCESS')).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully on refresh', async () => {
    // Mock initial successful load
    global.fetch.mockImplementation((url) => {
      if (url.includes('/export/status')) {
        return Promise.resolve({
          ok: true,
          status: 204, // No content initially
        });
      }
      if (url.includes('/export/schedule/config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(null)
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(ExportStatusCard);
    await tick();

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/no exports yet/i)).toBeInTheDocument();
    });

    // Now mock the refresh to fail
    global.fetch.mockImplementation((url) => {
      if (url.includes('/export/status')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        });
      }
      if (url.includes('/export/schedule/config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(null)
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    // Click refresh button
    const refreshButton = screen.getByTitle('Refresh status');
    await fireEvent.click(refreshButton);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Error: HTTP 500: Internal Server Error')).toBeInTheDocument();
  });
});