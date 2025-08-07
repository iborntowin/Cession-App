import React from 'react';
import { Text, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { wp, hp, rf, RESPONSIVE_STYLES } from '../utils/responsive';

// Screens
import ClientListScreen from '../screens/ClientListScreen';
import ClientDetailScreen from '../screens/ClientDetailScreen';
import CessionListScreen from '../screens/CessionListScreen';
import CessionDetailScreen from '../screens/CessionDetailScreen';
import ExportScreen from '../screens/ExportScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator for main screens
const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();
  
  // Calculate tab bar height based on platform and safe area
  const getTabBarHeight = () => {
    const baseHeight = RESPONSIVE_STYLES.tabBar.height;
    const androidHeight = RESPONSIVE_STYLES.tabBar.androidHeight;
    const safeAreaBottom = insets.bottom || 0;
    
    if (Platform.OS === 'android') {
      // For Android, use the larger height to accommodate navigation area
      return Math.max(androidHeight + safeAreaBottom, androidHeight);
    }
    
    // For iOS, use base height plus safe area
    return baseHeight + safeAreaBottom;
  };

  const tabBarHeight = getTabBarHeight();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#F8F9FA',
          borderTopColor: '#E5E5EA',
          borderTopWidth: 1,
          paddingBottom: Math.max(insets.bottom, RESPONSIVE_STYLES.tabBar.paddingBottom),
          paddingTop: RESPONSIVE_STYLES.tabBar.paddingTop,
          height: tabBarHeight,
          // Add shadow for better visual separation
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 8, // Android shadow
        },
        tabBarLabelStyle: {
          fontSize: RESPONSIVE_STYLES.caption.fontSize,
          fontWeight: '500',
          marginBottom: Platform.OS === 'android' ? hp(0.5) : 0,
        },
        tabBarIconStyle: {
          marginTop: hp(0.5),
        },
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Clients"
        component={ClientListScreen}
        options={{
          title: 'Clients',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="👥" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Cessions"
        component={CessionListScreen}
        options={{
          title: 'Cessions',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="📋" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Export"
        component={ExportScreen}
        options={{
          title: 'Data Sync',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="🔄" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Simple icon component using emoji with better sizing for taller tab bar
const TabIcon = ({ name, color, size }) => {
  const iconSize = Platform.OS === 'android' ? rf(size * 0.9) : rf(size * 0.8);
  
  return (
    <Text style={{ 
      fontSize: iconSize, 
      color,
      textAlign: 'center',
      lineHeight: iconSize * 1.2, // Better vertical alignment
    }}>
      {name}
    </Text>
  );
};

// Main Stack Navigator
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerBackTitleVisible: false,
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={MainTabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ClientDetail"
          component={ClientDetailScreen}
          options={{
            title: 'Client Details',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="CessionDetail"
          component={CessionDetailScreen}
          options={{
            title: 'Cession Details',
            headerBackTitle: 'Back',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;