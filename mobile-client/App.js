import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { initializeGlobalErrorHandling } from './src/utils/globalErrorHandler';
import { initializeLogging } from './src/utils/loggingService';

export default function App() {
  useEffect(() => {
    // Initialize global error handling and logging
    const initializeServices = async () => {
      try {
        await initializeLogging();
        initializeGlobalErrorHandling();
        console.log('Global error handling and logging initialized');
      } catch (error) {
        console.error('Failed to initialize error handling services:', error);
      }
    };

    initializeServices();
  }, []);

  return (
    <ErrorBoundary name="App Root">
      <SafeAreaProvider>
        <AppNavigator />
        <StatusBar style="light" backgroundColor="#007AFF" />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
