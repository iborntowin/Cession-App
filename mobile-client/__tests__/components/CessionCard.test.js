import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import CessionCard from '../../src/components/CessionCard';

describe('CessionCard', () => {
  const mockCession = {
    id: 'cession-1',
    monthlyPayment: 250.00,
    startDate: '2024-01-01',
    endDate: null,
    expectedPayoffDate: '2026-01-01',
    remainingBalance: 5000.00,
    totalLoanAmount: 6000.00,
    currentProgress: 16.67,
    monthsRemaining: 22,
    bankOrAgency: 'Test Bank',
    status: 'ACTIVE'
  };

  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders cession information correctly', () => {
    render(<CessionCard cession={mockCession} onPress={mockOnPress} />);

    expect(screen.getByText('Test Bank')).toBeTruthy();
    expect(screen.getByText('250.00 TND/month')).toBeTruthy();
    expect(screen.getByText('5,000.00 TND remaining')).toBeTruthy();
    expect(screen.getByText('ACTIVE')).toBeTruthy();
  });

  test('displays progress percentage correctly', () => {
    render(<CessionCard cession={mockCession} onPress={mockOnPress} />);

    expect(screen.getByText('16.67% paid')).toBeTruthy();
  });

  test('displays months remaining', () => {
    render(<CessionCard cession={mockCession} onPress={mockOnPress} />);

    expect(screen.getByText('22 months remaining')).toBeTruthy();
  });

  test('handles completed cession', () => {
    const completedCession = {
      ...mockCession,
      status: 'COMPLETED',
      remainingBalance: 0.00,
      currentProgress: 100.00,
      monthsRemaining: 0,
      endDate: '2024-12-31'
    };

    render(<CessionCard cession={completedCession} onPress={mockOnPress} />);

    expect(screen.getByText('COMPLETED')).toBeTruthy();
    expect(screen.getByText('0.00 TND remaining')).toBeTruthy();
    expect(screen.getByText('100.00% paid')).toBeTruthy();
    expect(screen.getByText('Completed')).toBeTruthy();
  });

  test('handles suspended cession', () => {
    const suspendedCession = {
      ...mockCession,
      status: 'SUSPENDED'
    };

    render(<CessionCard cession={suspendedCession} onPress={mockOnPress} />);

    expect(screen.getByText('SUSPENDED')).toBeTruthy();
  });

  test('displays start date correctly', () => {
    render(<CessionCard cession={mockCession} onPress={mockOnPress} />);

    expect(screen.getByText(/Started:/)).toBeTruthy();
    expect(screen.getByText(/Jan.*2024/)).toBeTruthy();
  });

  test('displays expected payoff date', () => {
    render(<CessionCard cession={mockCession} onPress={mockOnPress} />);

    expect(screen.getByText(/Expected payoff:/)).toBeTruthy();
    expect(screen.getByText(/Jan.*2026/)).toBeTruthy();
  });

  test('calls onPress when card is pressed', () => {
    render(<CessionCard cession={mockCession} onPress={mockOnPress} />);

    const card = screen.getByTestId('cession-card');
    fireEvent.press(card);

    expect(mockOnPress).toHaveBeenCalledWith(mockCession);
  });

  test('displays correct status color for active cession', () => {
    render(<CessionCard cession={mockCession} onPress={mockOnPress} />);

    const statusBadge = screen.getByTestId('status-badge');
    expect(statusBadge.props.style).toEqual(
      expect.objectContaining({
        backgroundColor: expect.stringMatching(/green/i)
      })
    );
  });

  test('displays correct status color for completed cession', () => {
    const completedCession = {
      ...mockCession,
      status: 'COMPLETED'
    };

    render(<CessionCard cession={completedCession} onPress={mockOnPress} />);

    const statusBadge = screen.getByTestId('status-badge');
    expect(statusBadge.props.style).toEqual(
      expect.objectContaining({
        backgroundColor: expect.stringMatching(/blue/i)
      })
    );
  });

  test('displays correct status color for suspended cession', () => {
    const suspendedCession = {
      ...mockCession,
      status: 'SUSPENDED'
    };

    render(<CessionCard cession={suspendedCession} onPress={mockOnPress} />);

    const statusBadge = screen.getByTestId('status-badge');
    expect(statusBadge.props.style).toEqual(
      expect.objectContaining({
        backgroundColor: expect.stringMatching(/red|orange/i)
      })
    );
  });

  test('displays progress bar correctly', () => {
    render(<CessionCard cession={mockCession} onPress={mockOnPress} />);

    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar).toBeTruthy();
    
    const progressFill = screen.getByTestId('progress-fill');
    expect(progressFill.props.style).toEqual(
      expect.objectContaining({
        width: '16.67%'
      })
    );
  });

  test('handles zero progress', () => {
    const newCession = {
      ...mockCession,
      currentProgress: 0.00,
      remainingBalance: 6000.00
    };

    render(<CessionCard cession={newCession} onPress={mockOnPress} />);

    expect(screen.getByText('0.00% paid')).toBeTruthy();
    
    const progressFill = screen.getByTestId('progress-fill');
    expect(progressFill.props.style).toEqual(
      expect.objectContaining({
        width: '0%'
      })
    );
  });

  test('handles 100% progress', () => {
    const completedCession = {
      ...mockCession,
      currentProgress: 100.00,
      remainingBalance: 0.00,
      status: 'COMPLETED'
    };

    render(<CessionCard cession={completedCession} onPress={mockOnPress} />);

    expect(screen.getByText('100.00% paid')).toBeTruthy();
    
    const progressFill = screen.getByTestId('progress-fill');
    expect(progressFill.props.style).toEqual(
      expect.objectContaining({
        width: '100%'
      })
    );
  });

  test('formats large amounts correctly', () => {
    const largeCession = {
      ...mockCession,
      monthlyPayment: 1250.50,
      remainingBalance: 50000.75,
      totalLoanAmount: 60000.00
    };

    render(<CessionCard cession={largeCession} onPress={mockOnPress} />);

    expect(screen.getByText('1,250.50 TND/month')).toBeTruthy();
    expect(screen.getByText('50,000.75 TND remaining')).toBeTruthy();
  });

  test('handles missing bank or agency', () => {
    const cessionWithoutBank = {
      ...mockCession,
      bankOrAgency: null
    };

    render(<CessionCard cession={cessionWithoutBank} onPress={mockOnPress} />);

    expect(screen.getByText('Unknown Bank')).toBeTruthy();
  });

  test('handles missing expected payoff date', () => {
    const cessionWithoutPayoffDate = {
      ...mockCession,
      expectedPayoffDate: null
    };

    render(<CessionCard cession={cessionWithoutPayoffDate} onPress={mockOnPress} />);

    expect(screen.getByText('No expected payoff date')).toBeTruthy();
  });

  test('displays overdue indicator for past due cessions', () => {
    const overdueCession = {
      ...mockCession,
      expectedPayoffDate: '2023-01-01', // Past date
      status: 'ACTIVE'
    };

    render(<CessionCard cession={overdueCession} onPress={mockOnPress} />);

    expect(screen.getByText('OVERDUE')).toBeTruthy();
    expect(screen.getByTestId('overdue-indicator')).toBeTruthy();
  });

  test('is accessible', () => {
    render(<CessionCard cession={mockCession} onPress={mockOnPress} />);

    const card = screen.getByTestId('cession-card');
    expect(card.props.accessible).toBe(true);
    expect(card.props.accessibilityLabel).toContain('Test Bank');
    expect(card.props.accessibilityLabel).toContain('ACTIVE');
    expect(card.props.accessibilityHint).toBe('Tap to view cession details');
  });

  test('handles null cession gracefully', () => {
    render(<CessionCard cession={null} onPress={mockOnPress} />);

    expect(screen.getByText('Invalid cession data')).toBeTruthy();
  });

  test('handles undefined cession gracefully', () => {
    render(<CessionCard cession={undefined} onPress={mockOnPress} />);

    expect(screen.getByText('Invalid cession data')).toBeTruthy();
  });

  test('displays total loan amount', () => {
    render(<CessionCard cession={mockCession} onPress={mockOnPress} />);

    expect(screen.getByText('Total: 6,000.00 TND')).toBeTruthy();
  });

  test('calculates and displays paid amount', () => {
    render(<CessionCard cession={mockCession} onPress={mockOnPress} />);

    // Paid amount = Total - Remaining = 6000 - 5000 = 1000
    expect(screen.getByText('Paid: 1,000.00 TND')).toBeTruthy();
  });

  test('handles edge case with negative remaining balance', () => {
    const cessionWithNegativeBalance = {
      ...mockCession,
      remainingBalance: -100.00 // Overpaid
    };

    render(<CessionCard cession={cessionWithNegativeBalance} onPress={mockOnPress} />);

    expect(screen.getByText('-100.00 TND remaining')).toBeTruthy();
  });
});