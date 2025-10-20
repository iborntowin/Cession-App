/**
 * Debug utilities for troubleshooting date/timezone issues between dev and production
 */

import { paymentsApi } from '$lib/api';
import { getBackendUrl } from '$lib/config';

/**
 * Get comprehensive date/timezone information from both frontend and backend
 */
export async function getDateDebugInfo() {
    const frontendInfo = {
        // Browser timezone info
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: Intl.DateTimeFormat().resolvedOptions().locale,
        
        // Current date/time in different formats
        currentDate: new Date(),
        currentDateISO: new Date().toISOString(),
        currentDateLocal: new Date().toLocaleDateString(),
        currentDateUTC: new Date().toUTCString(),
        
        // Test date parsing
        testDateString: '2025-06-30',
        testDateParsed: new Date('2025-06-30'),
        testDateParsedISO: new Date('2025-06-30').toISOString(),
        
        // Browser environment
        userAgent: navigator.userAgent,
        platform: navigator.platform,
    };

    let backendInfo = null;
    try {
        // Get backend timezone info (this endpoint was added for debugging)
        const response = await fetch(`${getBackendUrl()}/api/v1/payments/debug/timezone-info`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            backendInfo = await response.json();
        }
    } catch (error) {
        console.error('Failed to get backend timezone info:', error);
        backendInfo = { error: error.message };
    }

    return {
        frontend: frontendInfo,
        backend: backendInfo,
        comparison: {
            frontendDate: frontendInfo.currentDate.toISOString().split('T')[0],
            backendDateUTC: backendInfo?.currentDateUTC,
            backendDateSystem: backendInfo?.currentDateSystem,
            match: frontendInfo.currentDate.toISOString().split('T')[0] === backendInfo?.currentDateUTC?.split('T')[0]
        }
    };
}

/**
 * Test date calculation consistency
 */
export function testDateCalculations() {
    const testCases = [
        { startDate: '2025-06-30', description: 'Future date (June 2025)' },
        { startDate: '2024-12-01', description: 'Recent past date (December 2024)' },
        { startDate: '2024-06-01', description: 'Several months ago (June 2024)' },
        { startDate: '2023-01-01', description: 'Over a year ago (January 2023)' }
    ];

    const now = new Date();
    const results = testCases.map(testCase => {
        const startDate = new Date(testCase.startDate);
        
        // Calculate months difference using different methods
        const method1 = Math.floor((now - startDate) / (1000 * 60 * 60 * 24 * 30.44)); // Approximate
        const method2 = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
        
        // Method used in backend (ChronoUnit.MONTHS.between equivalent)
        const yearDiff = now.getFullYear() - startDate.getFullYear();
        const monthDiff = now.getMonth() - startDate.getMonth();
        const method3 = yearDiff * 12 + monthDiff;

        return {
            ...testCase,
            startDate: startDate.toISOString().split('T')[0],
            currentDate: now.toISOString().split('T')[0],
            monthsElapsed_method1: method1,
            monthsElapsed_method2: method2,
            monthsElapsed_method3: method3,
            isInFuture: startDate > now
        };
    });

    return results;
}

/**
 * Log comprehensive debug information to console
 */
export async function logDateDebugInfo() {
    console.group('🐛 Date/Timezone Debug Information');
    
    const debugInfo = await getDateDebugInfo();
    console.log('Frontend Info:', debugInfo.frontend);
    console.log('Backend Info:', debugInfo.backend);
    console.log('Comparison:', debugInfo.comparison);
    
    console.group('📊 Date Calculation Tests');
    const testResults = testDateCalculations();
    testResults.forEach(result => {
        console.log(`${result.description}:`, result);
    });
    console.groupEnd();
    
    console.groupEnd();
    
    return debugInfo;
}