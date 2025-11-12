import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { wp, hp } from '../../utils/responsive';

const QuickActions = ({ navigation }) => {
  const actions = [
    {
      id: 'new-client',
      title: 'New Client',
      icon: '👤',
      gradient: 'from-emerald-500 to-teal-600',
      onPress: () => navigation?.navigate('ClientList'),
    },
    {
      id: 'workplace',
      title: 'Workplace',
      icon: '🏢',
      gradient: 'from-blue-500 to-indigo-600',
      onPress: () => navigation?.navigate('Workplaces'),
    },
    {
      id: 'payments',
      title: 'Payments',
      icon: '💳',
      gradient: 'from-purple-500 to-pink-600',
      onPress: () => navigation?.navigate('Payments'),
    },
    {
      id: 'reports',
      title: 'Reports',
      icon: '📊',
      gradient: 'from-orange-500 to-red-600',
      onPress: () => navigation?.navigate('Reports'),
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Actions</Text>

      <View style={styles.grid}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionButton}
            onPress={action.onPress}
          >
            <View style={[styles.iconContainer, { backgroundColor: getGradientColor(action.gradient) }]}>
              <Text style={styles.icon}>{action.icon}</Text>
            </View>
            <Text style={styles.actionTitle}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// Helper function to get gradient colors (simplified for React Native)
const getGradientColor = (gradient) => {
  const gradients = {
    'from-emerald-500 to-teal-600': '#10b981',
    'from-blue-500 to-indigo-600': '#3b82f6',
    'from-purple-500 to-pink-600': '#8b5cf6',
    'from-orange-500 to-red-600': '#f97316',
  };
  return gradients[gradient] || '#6b7280';
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: wp(4),
    padding: wp(6),
    marginBottom: hp(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  title: {
    fontSize: wp(5.5),
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: hp(3),
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: wp(6.5),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: wp(4),
  },
  actionButton: {
    width: `${50 - 2}%`,
    alignItems: 'center',
    marginBottom: hp(1.5),
    paddingVertical: hp(2),
    paddingHorizontal: wp(3),
    borderRadius: wp(4),
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  iconContainer: {
    width: wp(14),
    height: wp(14),
    borderRadius: wp(4.5),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(1.5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    fontSize: wp(6.5),
  },
  actionTitle: {
    fontSize: wp(3.8),
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    letterSpacing: -0.2,
    lineHeight: wp(4.5),
  },
});

export default QuickActions;