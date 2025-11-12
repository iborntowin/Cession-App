import React, { useState } from 'react';
import { View, Text, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { wp, hp } from '../../utils/responsive';

const { width } = Dimensions.get('window');

const MonthlyTrendsChart = ({ monthlyTrends = [], monthlyPayments = [], formatCurrency }) => {
  const [chartMode, setChartMode] = useState('combined'); // 'combined', 'cessions', 'payments', 'active'

  // Ensure we have data
  const realTrends = monthlyTrends && Array.isArray(monthlyTrends) ? monthlyTrends : [];
  const realPayments = monthlyPayments && Array.isArray(monthlyPayments) ? monthlyPayments : [];

  if (realTrends.length === 0) {
    return (
      <View style={{
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(24px)',
        borderRadius: wp(6),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        padding: wp(6),
        marginVertical: hp(2)
      }}>
        <View style={{ alignItems: 'center', justifyContent: 'center', padding: hp(4) }}>
          <Text style={{ color: '#666', fontSize: wp(4) }}>No data available</Text>
        </View>
      </View>
    );
  }

  // Calculate stats for the header
  const totalCessions = realTrends.reduce((sum, t) => sum + (t.count || 0), 0);
  const totalValue = realTrends.reduce((sum, t) => sum + (t.value || 0), 0);
  const activeCount = realTrends.length > 0 ? realTrends[realTrends.length - 1].activeCessionsCount : 0;
  const activeValue = realTrends.length > 0 ? realTrends[realTrends.length - 1].activeValue : 0;
  const totalPayments = realPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPaymentsCount = realPayments.reduce((sum, p) => sum + (p.count || 0), 0);

  // Prepare chart data based on mode
  const getChartData = () => {
    const labels = realTrends.map(t => `${t.month} ${t.year}`);

    switch (chartMode) {
      case 'cessions':
        return {
          labels,
          datasets: [{
            data: realTrends.map(t => t.count || 0),
            color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
            strokeWidth: 2
          }],
          legend: ['New Cessions']
        };

      case 'comparison':
        return {
          labels,
          datasets: [
            {
              data: realTrends.map(t => t.count || 0),
              color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
              strokeWidth: 2
            },
            {
              data: realPayments.map(p => p.count || 0),
              color: (opacity = 1) => `rgba(251, 146, 60, ${opacity})`,
              strokeWidth: 2
            }
          ],
          legend: ['New Cessions', 'Payment Count']
        };

      case 'payments':
        return {
          labels: realPayments.map(p => `${p.month} ${p.year}`),
          datasets: [{
            data: realPayments.map(p => p.amount || 0),
            color: (opacity = 1) => `rgba(251, 146, 60, ${opacity})`,
            strokeWidth: 2
          }],
          legend: ['Payment Amount (TND)']
        };

      case 'active':
        return {
          labels,
          datasets: [{
            data: realTrends.map(t => t.activeCessionsCount || 0),
            color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
            strokeWidth: 2
          }],
          legend: ['Active Cessions']
        };

      case 'combined':
      default:
        // Combined mode: Show new cessions (bars), active cessions (line), and payment values (line)
        return {
          labels,
          datasets: [
            {
              data: realTrends.map(t => t.count || 0),
              color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
              strokeWidth: 2
            },
            {
              data: realTrends.map(t => t.activeCessionsCount || 0),
              color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
              strokeWidth: 3
            },
            {
              data: realPayments.map(p => p.amount || 0),
              color: (opacity = 1) => `rgba(236, 72, 153, ${opacity})`,
              strokeWidth: 3
            }
          ],
          legend: ['New Cessions', 'Active Cessions', 'Payment Value (TND)']
        };
    }
  };

  const chartData = getChartData();

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: chartMode === 'payments' ? 0 : 0,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#10b981'
    }
  };

  const modeButtons = [
    { key: 'combined', label: 'All Data', icon: '📊' },
    { key: 'comparison', label: 'Cessions vs Payments', icon: '🔄' },
    { key: 'active', label: 'Active Only', icon: '📈' },
    { key: 'payments', label: 'Payments Analysis', icon: '💳' }
  ];

  return (
    <View style={{
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(24px)',
      borderRadius: wp(6),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      padding: wp(6),
      marginVertical: hp(2)
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: hp(3) }}>
        <View>
          <Text style={{ fontSize: wp(5), fontWeight: 'bold', color: '#1f2937' }}>
            Monthly Cessions & Payments
          </Text>
          <Text style={{ fontSize: wp(3.5), color: '#6b7280', marginTop: hp(0.5) }}>
            Last 6 months activity overview
          </Text>
        </View>

        {/* Stats */}
        {totalCessions > 0 && (
          <View style={{
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            borderRadius: wp(3),
            paddingHorizontal: wp(3),
            paddingVertical: hp(1)
          }}>
            <Text style={{ fontSize: wp(3), fontWeight: '600', color: '#374151' }}>
              Total: {totalCessions} cessions
            </Text>
          </View>
        )}
      </View>

      {/* Mode Toggle Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: hp(3) }}
        contentContainerStyle={{ paddingHorizontal: wp(2) }}
      >
        <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0, 0, 0, 0.05)', borderRadius: wp(4), padding: wp(1) }}>
          {modeButtons.map((button) => (
            <TouchableOpacity
              key={button.key}
              onPress={() => setChartMode(button.key)}
              style={{
                paddingHorizontal: wp(4),
                paddingVertical: hp(1.5),
                borderRadius: wp(3),
                marginHorizontal: wp(0.5),
                backgroundColor: chartMode === button.key ? '#ffffff' : 'transparent',
                shadowColor: chartMode === button.key ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: chartMode === button.key ? 0.1 : 0,
                shadowRadius: chartMode === button.key ? 4 : 0,
                elevation: chartMode === button.key ? 2 : 0,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: wp(3), marginRight: wp(1.5) }}>{button.icon}</Text>
                <Text style={{
                  fontSize: wp(3),
                  fontWeight: '600',
                  color: chartMode === button.key ? '#10b981' : '#6b7280'
                }}>
                  {button.label}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Quick Stats Grid */}
      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: wp(3),
        marginBottom: hp(3)
      }}>
        {/* New This Month */}
        <View style={{
          flex: 1,
          minWidth: wp(35),
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderRadius: wp(3),
          padding: wp(3),
          borderWidth: 1,
          borderColor: 'rgba(16, 185, 129, 0.2)'
        }}>
          <Text style={{ fontSize: wp(3), fontWeight: '600', color: '#065f46', marginBottom: hp(0.5) }}>
            New This Month
          </Text>
          <Text style={{ fontSize: wp(5), fontWeight: 'bold', color: '#065f46' }}>
            {realTrends.length > 0 ? realTrends[realTrends.length - 1].count || 0 : 0}
          </Text>
          <Text style={{ fontSize: wp(3), color: '#065f46', marginTop: hp(0.5) }}>
            {formatCurrency ? formatCurrency(realTrends.length > 0 ? realTrends[realTrends.length - 1].value || 0 : 0) : '0.000 TND'}
          </Text>
        </View>

        {/* Currently Active */}
        <View style={{
          flex: 1,
          minWidth: wp(35),
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderRadius: wp(3),
          padding: wp(3),
          borderWidth: 1,
          borderColor: 'rgba(99, 102, 241, 0.2)'
        }}>
          <Text style={{ fontSize: wp(3), fontWeight: '600', color: '#3730a3', marginBottom: hp(0.5) }}>
            Currently Active
          </Text>
          <Text style={{ fontSize: wp(5), fontWeight: 'bold', color: '#3730a3' }}>
            {activeCount}
          </Text>
          <Text style={{ fontSize: wp(3), color: '#3730a3', marginTop: hp(0.5) }}>
            {formatCurrency ? formatCurrency(activeValue) : '0.000 TND'}/month
          </Text>
        </View>

        {/* Payments Received */}
        <View style={{
          flex: 1,
          minWidth: wp(35),
          backgroundColor: 'rgba(251, 146, 60, 0.1)',
          borderRadius: wp(3),
          padding: wp(3),
          borderWidth: 1,
          borderColor: 'rgba(251, 146, 60, 0.2)'
        }}>
          <Text style={{ fontSize: wp(3), fontWeight: '600', color: '#9a3412', marginBottom: hp(0.5) }}>
            Payments Received
          </Text>
          <Text style={{ fontSize: wp(5), fontWeight: 'bold', color: '#9a3412' }}>
            {totalPaymentsCount}
          </Text>
          <Text style={{ fontSize: wp(3), color: '#9a3412', marginTop: hp(0.5) }}>
            {formatCurrency ? formatCurrency(totalPayments) : '0.000 TND'}
          </Text>
        </View>

        {/* Average Value */}
        <View style={{
          flex: 1,
          minWidth: wp(35),
          backgroundColor: 'rgba(236, 72, 153, 0.1)',
          borderRadius: wp(3),
          padding: wp(3),
          borderWidth: 1,
          borderColor: 'rgba(236, 72, 153, 0.2)'
        }}>
          <Text style={{ fontSize: wp(3), fontWeight: '600', color: '#be185d', marginBottom: hp(0.5) }}>
            Average Value
          </Text>
          <Text style={{ fontSize: wp(5), fontWeight: 'bold', color: '#be185d' }}>
            {totalCessions > 0 ? formatCurrency ? formatCurrency(totalValue / totalCessions) : '0.000' : '0.000'} TND
          </Text>
          <Text style={{ fontSize: wp(3), color: '#be185d', marginTop: hp(0.5) }}>
            Per cession
          </Text>
        </View>
      </View>

      {/* Chart */}
      <View>
        <LineChart
          data={chartData}
          width={width - wp(12)}
          height={hp(30)}
          chartConfig={chartConfig}
          bezier
          style={{ marginVertical: hp(1), borderRadius: 16 }}
        />
      </View>
    </View>
  );
};

export default MonthlyTrendsChart;