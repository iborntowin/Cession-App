import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

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
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#F8F9FA',
          borderTopColor: '#E5E5EA',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
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

// Simple icon component using emoji
const TabIcon = ({ name, color, size }) => {
  return (
    <Text style={{ fontSize: size * 0.8, color }}>
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