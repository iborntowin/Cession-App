import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';

import App from '../../App';
import DataService from '../../src/services/DataService';
import { ClientService } from '../../src/services/clientService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('axios');

describe('End-to-End Mobile App Flow', () => {
  const mockExportData = {
    metadata: {
      exportTime: '2024-01-15T10:30:00Z',
      version: '1.0',
      recordCount: {
        clients: 2,
        cessions: 3
      }
    },
    clients: [
      {
        id: 'client-1',
        fullName: 'John Doe',
        cin: '12345678',
        phoneNumber: '+216123456789',
        address: '123 Main St',
        workerNumber: '1234567890',
        workplace: { id: 'wp-1', name: 'Tech Company' },
        job: { id: 'job-1', name: 'Software Engineer' },
        cessions: [
          {
            id: 'cession-1',
            monthlyPayment: 250.00,
            status: 'ACTIVE',
            remainingBalance: 5000.00,
            totalLoanAmount: 6000.00,
            currentProgress: 16.67,
            bankOrAgency: 'Test Bank'
          }
        ]
      },
      {
        id: 'client-2',
        fullName: 'Jane Smith',
        cin: '87654321',
        phoneNumber: '+216987654321',
        address: '456 Oak Ave',
        workerNumber: '0987654321',
        workplace: { id: 'wp-2', name: 'Finance Corp' },
        job: { id: 'job-2', name: 'Accountant' },
        cessions: [
          {
            id: 'cession-2',
            monthlyPayment: 300.00,
            status: 'ACTIVE',
            remainingBalance: 4000.00,
            totalLoanAmount: 5000.00,
            currentProgress: 20.00,
            bankOrAgency: 'Another Bank'
          },
          {
            id: 'cession-3',
            monthlyPayment: 150.00,
            status: 'COMPLETED',
            remainingBalance: 0.00,
            totalLoanAmount: 3000.00,
            currentProgress: 100.00,
            bankOrAgency: 'Third Bank'
          }
        ]
      }
    ]
  };

  const mockSupabaseUrl = 'https://test.supabase.co/storage/v1/object/public/bucket/export-test.json';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock NetInfo to return online by default
    NetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true
    });

    // Mock successful API response
    axios.get.mockResolvedValue({
      data: mockExportData,
      status: 200
    });

    // Mock AsyncStorage
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue();
  });

  test('complete app flow: load data, display clients, navigate to details', async () => {
    // Render the complete app
    const { getByText, getByTestId, queryByText } = render(
      <NavigationContainer>
        <App />
      </NavigationContainer>
    );

    // Wait for initial data load
    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
    });

    // Verify client list displays correctly
    expect(getByText('Tech Company')).toBeTruthy();
    expect(getByText('Finance Corp')).toBeTruthy();
    expect(getByText('2 Clients')).toBeTruthy(); // Assuming header shows count

    // Navigate to client details
    const johnDoeCard = getByTestId('client-card-client-1');
    fireEvent.press(johnDoeCard);

    // Wait for navigation and detail screen
    await waitFor(() => {
      expect(getByText('Client Details')).toBeTruthy();
      expect(getByText('CIN: 12345678')).toBeTruthy();
      expect(getByText('Software Engineer')).toBeTruthy();
    });

    // Verify cession information is displayed
    expect(getByText('Test Bank')).toBeTruthy();
    expect(getByText('250.00 TND/month')).toBeTruthy();
    expect(getByText('ACTIVE')).toBeTruthy();

    // Navigate to cession details
    const cessionCard = getByTestId('cession-card-cession-1');
    fireEvent.press(cessionCard);

    // Wait for cession detail screen
    await waitFor(() => {
      expect(getByText('Cession Details')).toBeTruthy();
      expect(getByText('Remaining: 5,000.00 TND')).toBeTruthy();
      expect(getByText('Progress: 16.67%')).toBeTruthy();
    });
  });

  test('offline functionality: display cached data with offline indicator', async () => {
    // Setup cached data
    const cachedData = {
      data: mockExportData,
      timestamp: Date.now() - 1000 * 60 * 30, // 30 minutes ago
      url: mockSupabaseUrl
    };
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

    // Mock offline state
    NetInfo.fetch.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false
    });

    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <App />
      </NavigationContainer>
    );

    // Wait for cached data to load
    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
    });

    // Verify offline indicator is shown
    expect(getByTestId('offline-indicator')).toBeTruthy();
    expect(getByText('Offline')).toBeTruthy();

    // Verify data is still accessible
    expect(getByText('Tech Company')).toBeTruthy();
    expect(getByText('Finance Corp')).toBeTruthy();
  });

  test('search functionality: filter clients by name and CIN', async () => {
    const { getByText, getByTestId, queryByText } = render(
      <NavigationContainer>
        <App />
      </NavigationContainer>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
    });

    // Search by name
    const searchInput = getByTestId('search-input');
    fireEvent.changeText(searchInput, 'John');

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(queryByText('Jane Smith')).toBeFalsy();
    });

    // Clear search and search by CIN
    fireEvent.changeText(searchInput, '87654321');

    await waitFor(() => {
      expect(queryByText('John Doe')).toBeFalsy();
      expect(getByText('Jane Smith')).toBeTruthy();
    });

    // Clear search to show all clients again
    fireEvent.changeText(searchInput, '');

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
    });
  });

  test('filter functionality: filter by cession status', async () => {
    const { getByText, getByTestId, queryByText } = render(
      <NavigationContainer>
        <App />
      </NavigationContainer>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
    });

    // Open filter modal
    const filterButton = getByTestId('filter-button');
    fireEvent.press(filterButton);

    // Wait for filter modal
    await waitFor(() => {
      expect(getByText('Filter Options')).toBeTruthy();
    });

    // Select "COMPLETED" status filter
    const completedFilter = getByTestId('filter-completed');
    fireEvent.press(completedFilter);

    // Apply filter
    const applyButton = getByTestId('apply-filter-button');
    fireEvent.press(applyButton);

    // Wait for filter to be applied
    await waitFor(() => {
      // Only Jane Smith should be visible (has completed cessions)
      expect(queryByText('John Doe')).toBeFalsy();
      expect(getByText('Jane Smith')).toBeTruthy();
    });
  });

  test('data refresh: pull to refresh updates data', async () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <App />
      </NavigationContainer>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeTruthy();
    });

    // Mock updated data
    const updatedData = {
      ...mockExportData,
      clients: [
        ...mockExportData.clients,
        {
          id: 'client-3',
          fullName: 'New Client',
          cin: '99999999',
          phoneNumber: '+216999999999',
          address: '999 New St',
          workerNumber: '9999999999',
          workplace: { id: 'wp-3', name: 'New Company' },
          job: { id: 'job-3', name: 'New Job' },
          cessions: []
        }
      ]
    };

    axios.get.mockResolvedValueOnce({
      data: updatedData,
      status: 200
    });

    // Trigger pull to refresh
    const scrollView = getByTestId('client-list-scroll');
    fireEvent(scrollView, 'refresh');

    // Wait for refresh to complete
    await waitFor(() => {
      expect(screen.getByText('New Client')).toBeTruthy();
      expect(screen.getByText('New Company')).toBeTruthy();
    });

    // Verify API was called again
    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  test('error handling: display error message when data load fails', async () => {
    // Mock API failure
    axios.get.mockRejectedValue(new Error('Network Error'));
    AsyncStorage.getItem.mockResolvedValue(null); // No cached data

    const { getByText } = render(
      <NavigationContainer>
        <App />
      </NavigationContainer>
    );

    // Wait for error message
    await waitFor(() => {
      expect(getByText(/Failed to load data/)).toBeTruthy();
      expect(getByText(/Network Error/)).toBeTruthy();
    });

    // Verify retry button is available
    expect(getByText('Retry')).toBeTruthy();
  });

  test('data synchronization: auto-sync when coming back online', async () => {
    // Start offline with cached data
    NetInfo.fetch.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false
    });

    const cachedData = {
      data: mockExportData,
      timestamp: Date.now() - 1000 * 60 * 60 * 25, // 25 hours ago (stale)
      url: mockSupabaseUrl
    };
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

    const { getByText, getByTestId, queryByTestId } = render(
      <NavigationContainer>
        <App />
      </NavigationContainer>
    );

    // Wait for cached data to load
    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByTestId('offline-indicator')).toBeTruthy();
      expect(getByTestId('stale-data-warning')).toBeTruthy();
    });

    // Simulate coming back online
    NetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true
    });

    // Trigger connectivity change event
    const connectivityCallback = NetInfo.addEventListener.mock.calls[0][0];
    connectivityCallback({
      isConnected: true,
      isInternetReachable: true
    });

    // Wait for auto-sync
    await waitFor(() => {
      expect(queryByTestId('offline-indicator')).toBeFalsy();
      expect(queryByTestId('stale-data-warning')).toBeFalsy();
    });

    // Verify API was called for sync
    expect(axios.get).toHaveBeenCalledWith(mockSupabaseUrl, expect.any(Object));
  });

  test('navigation flow: back button and navigation stack', async () => {
    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <App />
      </NavigationContainer>
    );

    // Wait for client list
    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
    });

    // Navigate to client details
    const clientCard = getByTestId('client-card-client-1');
    fireEvent.press(clientCard);

    await waitFor(() => {
      expect(getByText('Client Details')).toBeTruthy();
    });

    // Navigate to cession details
    const cessionCard = getByTestId('cession-card-cession-1');
    fireEvent.press(cessionCard);

    await waitFor(() => {
      expect(getByText('Cession Details')).toBeTruthy();
    });

    // Go back to client details
    const backButton = getByTestId('back-button');
    fireEvent.press(backButton);

    await waitFor(() => {
      expect(getByText('Client Details')).toBeTruthy();
      expect(queryByText('Cession Details')).toBeFalsy();
    });

    // Go back to client list
    fireEvent.press(backButton);

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
      expect(queryByText('Client Details')).toBeFalsy();
    });
  });

  test('data persistence: cached data survives app restart', async () => {
    // First app session - load and cache data
    const cachedData = {
      data: mockExportData,
      timestamp: Date.now() - 1000 * 60 * 10, // 10 minutes ago
      url: mockSupabaseUrl
    };

    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

    const { getByText, unmount } = render(
      <NavigationContainer>
        <App />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
    });

    // Unmount app (simulate app close)
    unmount();

    // Second app session - should load from cache
    const { getByText: getByText2 } = render(
      <NavigationContainer>
        <App />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText2('John Doe')).toBeTruthy();
      expect(getByText2('Jane Smith')).toBeTruthy();
    });

    // Verify cache was accessed
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('cached_export_data');
  });
});