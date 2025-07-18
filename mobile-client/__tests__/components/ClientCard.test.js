import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import ClientCard from '../../src/components/ClientCard';

describe('ClientCard', () => {
  const mockClient = {
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
      },
      {
        id: 'cession-2',
        monthlyPayment: 150.00,
        status: 'COMPLETED',
        remainingBalance: 0.00,
        totalLoanAmount: 3000.00,
        currentProgress: 100.00,
        bankOrAgency: 'Another Bank'
      }
    ]
  };

  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders client information correctly', () => {
    render(<ClientCard client={mockClient} onPress={mockOnPress} />);

    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('CIN: 12345678')).toBeTruthy();
    expect(screen.getByText('Tech Company')).toBeTruthy();
    expect(screen.getByText('Software Engineer')).toBeTruthy();
    expect(screen.getByText('+216123456789')).toBeTruthy();
  });

  test('displays cession count correctly', () => {
    render(<ClientCard client={mockClient} onPress={mockOnPress} />);

    expect(screen.getByText('2 Cessions')).toBeTruthy();
  });

  test('displays active cession count', () => {
    render(<ClientCard client={mockClient} onPress={mockOnPress} />);

    expect(screen.getByText('1 Active')).toBeTruthy();
  });

  test('displays total outstanding balance', () => {
    render(<ClientCard client={mockClient} onPress={mockOnPress} />);

    // Total outstanding balance should be 5000.00 (only active cessions)
    expect(screen.getByText('5,000.00 TND')).toBeTruthy();
  });

  test('handles client with no cessions', () => {
    const clientWithoutCessions = {
      ...mockClient,
      cessions: []
    };

    render(<ClientCard client={clientWithoutCessions} onPress={mockOnPress} />);

    expect(screen.getByText('0 Cessions')).toBeTruthy();
    expect(screen.getByText('0 Active')).toBeTruthy();
    expect(screen.getByText('0.00 TND')).toBeTruthy();
  });

  test('handles client with missing workplace', () => {
    const clientWithoutWorkplace = {
      ...mockClient,
      workplace: null
    };

    render(<ClientCard client={clientWithoutWorkplace} onPress={mockOnPress} />);

    expect(screen.getByText('Unknown Workplace')).toBeTruthy();
  });

  test('handles client with missing job', () => {
    const clientWithoutJob = {
      ...mockClient,
      job: null
    };

    render(<ClientCard client={clientWithoutJob} onPress={mockOnPress} />);

    expect(screen.getByText('Unknown Job')).toBeTruthy();
  });

  test('calls onPress when card is pressed', () => {
    render(<ClientCard client={mockClient} onPress={mockOnPress} />);

    const card = screen.getByTestId('client-card');
    fireEvent.press(card);

    expect(mockOnPress).toHaveBeenCalledWith(mockClient);
  });

  test('displays status indicator for active cessions', () => {
    render(<ClientCard client={mockClient} onPress={mockOnPress} />);

    // Should show active status indicator
    const activeIndicator = screen.getByTestId('active-status-indicator');
    expect(activeIndicator).toBeTruthy();
  });

  test('displays different status for completed cessions only', () => {
    const clientWithCompletedOnly = {
      ...mockClient,
      cessions: [
        {
          id: 'cession-1',
          monthlyPayment: 150.00,
          status: 'COMPLETED',
          remainingBalance: 0.00,
          totalLoanAmount: 3000.00,
          currentProgress: 100.00,
          bankOrAgency: 'Test Bank'
        }
      ]
    };

    render(<ClientCard client={clientWithCompletedOnly} onPress={mockOnPress} />);

    expect(screen.getByText('0 Active')).toBeTruthy();
    expect(screen.getByText('0.00 TND')).toBeTruthy();
  });

  test('formats large numbers correctly', () => {
    const clientWithLargeBalance = {
      ...mockClient,
      cessions: [
        {
          id: 'cession-1',
          monthlyPayment: 1250.00,
          status: 'ACTIVE',
          remainingBalance: 50000.00,
          totalLoanAmount: 60000.00,
          currentProgress: 16.67,
          bankOrAgency: 'Test Bank'
        }
      ]
    };

    render(<ClientCard client={clientWithLargeBalance} onPress={mockOnPress} />);

    expect(screen.getByText('50,000.00 TND')).toBeTruthy();
  });

  test('handles missing phone number', () => {
    const clientWithoutPhone = {
      ...mockClient,
      phoneNumber: null
    };

    render(<ClientCard client={clientWithoutPhone} onPress={mockOnPress} />);

    expect(screen.getByText('No phone number')).toBeTruthy();
  });

  test('truncates long names appropriately', () => {
    const clientWithLongName = {
      ...mockClient,
      fullName: 'This is a very long client name that should be truncated'
    };

    render(<ClientCard client={clientWithLongName} onPress={mockOnPress} />);

    // The component should handle long names gracefully
    expect(screen.getByText(/This is a very long client name/)).toBeTruthy();
  });

  test('displays worker number when available', () => {
    render(<ClientCard client={mockClient} onPress={mockOnPress} />);

    expect(screen.getByText('Worker: 1234567890')).toBeTruthy();
  });

  test('handles missing worker number', () => {
    const clientWithoutWorkerNumber = {
      ...mockClient,
      workerNumber: null
    };

    render(<ClientCard client={clientWithoutWorkerNumber} onPress={mockOnPress} />);

    expect(screen.queryByText(/Worker:/)).toBeFalsy();
  });

  test('applies correct styling for different cession statuses', () => {
    render(<ClientCard client={mockClient} onPress={mockOnPress} />);

    // Check that the card has appropriate styling
    const card = screen.getByTestId('client-card');
    expect(card.props.style).toBeDefined();
  });

  test('is accessible', () => {
    render(<ClientCard client={mockClient} onPress={mockOnPress} />);

    const card = screen.getByTestId('client-card');
    expect(card.props.accessible).toBe(true);
    expect(card.props.accessibilityLabel).toContain('John Doe');
    expect(card.props.accessibilityHint).toBe('Tap to view client details');
  });

  test('handles null client gracefully', () => {
    render(<ClientCard client={null} onPress={mockOnPress} />);

    expect(screen.getByText('Invalid client data')).toBeTruthy();
  });

  test('handles undefined client gracefully', () => {
    render(<ClientCard client={undefined} onPress={mockOnPress} />);

    expect(screen.getByText('Invalid client data')).toBeTruthy();
  });
});