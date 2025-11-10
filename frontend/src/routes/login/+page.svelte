<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { token, user, showAlert, setAuth, clearAuth } from '$lib/stores';
  import { authApi, checkDbHealth, getLoadingProgress } from '$lib/api';
  import { fade, fly, scale, slide } from 'svelte/transition';
  import Spinner from '$lib/components/Spinner.svelte';
  import HealthStatus from '$lib/components/HealthStatus.svelte';

  let email = '';
  let password = '';
  let isLoading = false;
  let error = '';
  let showPassword = false;

  // Health status state
  let healthStatus = 'checking';
  let backendReachable = false;
  let databaseConnected = false;
  let healthError = '';
  let canLogin = false;

  // Animation states
  let formVisible = false;
  let backgroundLoaded = false;

  // Real metrics tracking - NO FAKE DATA
  let realMetrics = {
    frontendInitStart: 0,
    frontendInitComplete: 0,
    backendResponseTime: 0,
    databaseResponseTime: 0,
    systemUptime: 0,
    lastHealthCheckTime: 0,
    healthCheckCount: 0,
    totalHealthCheckTime: 0,
    averageHealthCheckTime: 0,
    networkLatency: 0,
    componentStatus: {
      frontend: 'initializing',
      backend: 'unknown',
      database: 'unknown',
      system: 'unknown'
    }
  };

  // Loading bar state variables
  let loadingBarProgress = 0;
  let loadingMessage = 'Initializing application...';
  let isLoadingComplete = false;
  let loadingStartTime = 0;
  let progressInterval;
  let progressTimeout;
  let maxWaitTime = 30000; // 30 seconds max wait time

  // Real progress calculation based on ACTUAL metrics
  function calculateRealProgress() {
    const now = Date.now();
    let progress = 0;
    let message = 'Initializing...';

    // Frontend initialization (0-20%) - based on actual time since page load
    if (realMetrics.frontendInitStart > 0) {
      const frontendElapsed = now - realMetrics.frontendInitStart;
      const frontendProgress = Math.min((frontendElapsed / 3000) * 20, 20); // 3 seconds for frontend init
      progress += frontendProgress;
      
      if (frontendProgress < 20) {
        message = 'Loading application components...';
        realMetrics.componentStatus.frontend = 'loading';
      } else {
        realMetrics.componentStatus.frontend = 'ready';
      }
    }

    // Backend connection (20-50%) - based on actual response time
    if (realMetrics.backendResponseTime > 0) {
      const backendProgress = Math.min((realMetrics.backendResponseTime / 5000) * 30, 30); // Response time affects progress
      progress += backendProgress;
      realMetrics.componentStatus.backend = backendReachable ? 'connected' : 'failed';
    } else if (healthStatus === 'checking' || healthStatus === 'starting') {
      progress += 10; // Show some progress while checking
      message = 'Connecting to backend...';
    }

    // Database connection (50-80%) - based on actual database response
    if (realMetrics.databaseResponseTime > 0) {
      const dbProgress = Math.min((realMetrics.databaseResponseTime / 3000) * 30, 30);
      progress += dbProgress;
      realMetrics.componentStatus.database = databaseConnected ? 'connected' : 'failed';
    } else if (backendReachable && !databaseConnected) {
      progress += 20; // Show progress while connecting to DB
      message = 'Connecting to database...';
    }

    // System health (80-100%) - based on actual system uptime
    if (realMetrics.systemUptime > 0) {
      const uptimeProgress = Math.min((realMetrics.systemUptime / 60) * 20, 20); // Uptime in seconds
      progress += uptimeProgress;
      realMetrics.componentStatus.system = healthStatus === 'healthy' ? 'ready' : 'checking';
      
      if (progress >= 95 && canLogin) {
        progress = 100;
        message = 'System ready!';
        realMetrics.componentStatus.system = 'ready';
      }
    }

    // Ensure progress never goes backward
    if (progress > loadingBarProgress) {
      loadingBarProgress = Math.min(progress, 100);
      loadingMessage = message;
    }

    return progress;
  }

  // Handle health status updates with REAL metrics from backend
  async function handleHealthUpdate(event) {
    const { status, backendReachable: backend, databaseConnected: db, errorMessage, lastChecked } = event.detail;
    const now = Date.now();
    
    healthStatus = status;
    backendReachable = backend;
    databaseConnected = db;
    healthError = errorMessage;

    // Get REAL loading progress from backend - NO FRONTEND CALCULATIONS
    try {
      const progressResult = await getLoadingProgress();
      
      if (progressResult.success) {
        // Use REAL progress from backend
        loadingBarProgress = Math.max(loadingBarProgress, progressResult.overallProgress);
        loadingMessage = progressResult.message;
        
        // Update component status with REAL backend data
        if (progressResult.components) {
          realMetrics.componentStatus.backend = progressResult.components.backend?.status || 'unknown';
          realMetrics.componentStatus.database = progressResult.components.database?.status || 'unknown';
          realMetrics.componentStatus.system = progressResult.overallProgress >= 100 ? 'ready' : 'checking';
          
          // Update real timing metrics from backend
          if (progressResult.components.backend?.responseTime) {
            realMetrics.backendResponseTime = progressResult.components.backend.responseTime;
          }
          if (progressResult.components.database?.responseTime) {
            realMetrics.databaseResponseTime = progressResult.components.database.responseTime;
          }
          if (progressResult.estimatedTimeRemaining) {
            realMetrics.estimatedTimeRemaining = progressResult.estimatedTimeRemaining;
          }
        }
        
        // Complete loading when backend says it's ready
        if (progressResult.overallProgress >= 100 && !isLoadingComplete) {
          setTimeout(() => {
            loadingBarProgress = 100;
            loadingMessage = 'System ready!';
            realMetrics.componentStatus.system = 'ready';
            setTimeout(() => {
              isLoadingComplete = true;
            }, 500);
          }, 300);
        }
      } else {
        // Fallback to basic progress if backend doesn't provide detailed metrics
        calculateFallbackProgress(status, backend, db);
      }
    } catch (error) {
      console.warn('Failed to get loading progress from backend:', error);
      // Fallback to basic progress calculation
      calculateFallbackProgress(status, backend, db);
    }

    // Enable login only when backend is reachable and database is connected
    canLogin = backend && db && status === 'healthy';

    // If backend becomes available and we were waiting, try login again
    if (canLogin && isLoading && email && password) {
      handleLogin();
    }
  }

  // Fallback progress calculation when backend doesn't provide detailed metrics
  function calculateFallbackProgress(status, backend, db) {
    if (status === 'checking') {
      if (loadingBarProgress < 25) {
        loadingBarProgress = 25;
        loadingMessage = 'Connecting to backend...';
      }
    } else if (status === 'starting') {
      if (loadingBarProgress < 50) {
        loadingBarProgress = 50;
        loadingMessage = 'Backend starting up...';
      }
    } else if (backend && !db) {
      if (loadingBarProgress < 75) {
        loadingBarProgress = 75;
        loadingMessage = 'Connecting to database...';
      }
    } else if (backend && db && status === 'healthy') {
      loadingBarProgress = 100;
      loadingMessage = 'System ready!';
      realMetrics.componentStatus.system = 'ready';
      if (!isLoadingComplete) {
        setTimeout(() => {
          isLoadingComplete = true;
        }, 500);
      }
    }
  }



  function startRealisticLoading() {
    if (isLoadingComplete || loadingStartTime > 0) return; // Prevent multiple starts
    
    loadingStartTime = Date.now();
    
    // Initial loading state - just show we're starting
    animateProgressTo(10, 'Initializing system check...', 500);
  }

  function animateProgressTo(targetProgress, message, duration = 500) {
    loadingMessage = message;
    const startProgress = loadingBarProgress;
    const progressDiff = targetProgress - startProgress;
    const startTime = Date.now();
    
    clearInterval(progressInterval);
    
    progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      loadingBarProgress = Math.round(startProgress + (progressDiff * easeOutQuart));
      
      if (progress >= 1) {
        clearInterval(progressInterval);
        loadingBarProgress = targetProgress;
      }
    }, 16); // 60fps
  }

  function finishLoading() {
    // Only finish loading if system is actually ready
    if (canLogin && backendReachable && databaseConnected && healthStatus === 'healthy') {
      animateProgressTo(100, 'System ready!', 800);
      
      setTimeout(() => {
        isLoadingComplete = true;
      }, 800);
    }
  }

  function refreshPage() {
    // Reset loading state before refresh
    loadingBarProgress = 0;
    loadingMessage = 'Initializing application...';
    isLoadingComplete = false;
    loadingStartTime = 0;
    
    // Reset real metrics tracking
    realMetrics = {
      frontendInitStart: Date.now(),
      frontendInitComplete: 0,
      backendResponseTime: 0,
      databaseResponseTime: 0,
      systemUptime: 0,
      lastHealthCheckTime: 0,
      healthCheckCount: 0,
      totalHealthCheckTime: 0,
      averageHealthCheckTime: 0,
      networkLatency: 0,
      componentStatus: {
        frontend: 'initializing',
        backend: 'unknown',
        database: 'unknown',
        system: 'unknown'
      }
    };
    
    // Clear any existing intervals
    clearInterval(progressInterval);
    clearTimeout(progressTimeout);
    
    // Refresh the page
    window.location.reload();
  }

  onMount(() => {
    console.log('Login Page - onMount - Current token:', $token);
    // If user is already logged in, redirect to dashboard
    if ($token) {
      console.log('Login Page - onMount - User already logged in, redirecting to home');
      goto('/');
    }

    // Initialize REAL metrics tracking
    realMetrics.frontendInitStart = Date.now();
    loadingStartTime = Date.now();

    // Trigger form animation after mount
    setTimeout(() => {
      formVisible = true;
      backgroundLoaded = true;
      realMetrics.frontendInitComplete = Date.now();
      realMetrics.componentStatus.frontend = 'ready';
    }, 100);

    // Start initial loading check after a brief delay
    setTimeout(() => {
      if (loadingBarProgress === 0 && !isLoadingComplete) {
        console.log('Starting initial system check');
        startRealisticLoading();
      }
    }, 500);
  });

  // Cleanup intervals on component destroy
  onDestroy(() => {
    clearInterval(progressInterval);
    clearTimeout(progressTimeout);
  });

  async function handleLogin() {
    console.log('Login Page - Starting login process');
    error = '';
    isLoading = true;

    if (!email || !password) {
      error = 'Please enter both email and password';
      isLoading = false;
      return;
    }

    try {
      console.log('Login Page - Calling authApi.login');
      const result = await authApi.login(email, password);
      console.log('Login Page - Login result:', result);

      if (result.success && result.data && result.data.token) {
        console.log('Login Page - Login successful, setting user data');
        // Set both token and user data
        setAuth(result.data.token, {
          id: result.data.id,
          email: result.data.email,
          fullName: result.data.fullName,
          role: result.data.role
        });
        showAlert('Login successful! Welcome back.', 'success');
        console.log('Login Page - Redirecting to home');
        goto('/');
      } else {
        console.log('Login Page - Login failed:', result.error);
        error = result.error || 'Login failed. Please try again.';
        // Clear any existing auth state
        clearAuth();
      }
    } catch (err) {
      console.error('Login Page - Error during login:', err);
      error = err.message || 'An unexpected error occurred. Please try again.';
      // Clear any existing auth state
      clearAuth();
    } finally {
      isLoading = false;
    }
  }

  function togglePasswordVisibility() {
    showPassword = !showPassword;
  }

  function getHealthStatusIcon() {
    switch (healthStatus) {
      case 'healthy':
        return '✅';
      case 'unhealthy':
        return '❌';
      case 'error':
        return '⚠️';
      case 'checking':
        return '🔄';
      case 'starting':
        return '⏳';
      default:
        return '❓';
    }
  }

  function getHealthStatusColor() {
    switch (healthStatus) {
      case 'healthy':
        return 'emerald';
      case 'unhealthy':
      case 'error':
        return 'red';
      case 'checking':
      case 'starting':
        return 'amber';
      default:
        return 'gray';
    }
  }
</script>

<!-- Enhanced Login Page -->
<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
  <!-- Animated Background Elements -->
  <div class="absolute inset-0 overflow-hidden">
    <!-- Floating Orbs -->
    <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 rounded-full blur-3xl animate-pulse"></div>
    <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl animate-pulse" style="animation-delay: 2s;"></div>
    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style="animation-delay: 4s;"></div>

    <!-- Grid Pattern -->
    <div class="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
  </div>

  <!-- Main Content -->
  <div class="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Header Section -->
      {#if formVisible}
        <div class="text-center" in:fly={{ y: -30, duration: 600, delay: 200 }}>
          <!-- Logo/Brand -->
          <div class="mx-auto w-20 h-20 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/25 mb-8">
            <span class="text-4xl">🚀</span>
          </div>

          <!-- Welcome Text -->
          <h1 class="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
            Welcome Back
          </h1>
          <p class="text-gray-600 font-medium">
            Sign in to continue your journey
          </p>
        </div>
      {/if}

      <!-- Health Status Card with Loading Bar -->
      {#if formVisible}
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20" in:slide={{ duration: 400, delay: 400 }}>
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-gradient-to-r from-{getHealthStatusColor()}-500 to-{getHealthStatusColor()}-600 rounded-xl flex items-center justify-center shadow-lg">
                <span class="text-lg">{getHealthStatusIcon()}</span>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-900">System Status</p>
                <p class="text-xs text-gray-600 capitalize">{healthStatus}</p>
              </div>
            </div>

            <!-- Status Indicators -->
            <div class="flex items-center space-x-2">
              <div class="flex items-center space-x-1">
                <div class="w-2 h-2 rounded-full {backendReachable ? 'bg-emerald-500' : 'bg-red-500'}"></div>
                <span class="text-xs text-gray-600">API</span>
              </div>
              <div class="flex items-center space-x-1">
                <div class="w-2 h-2 rounded-full {databaseConnected ? 'bg-emerald-500' : 'bg-red-500'}"></div>
                <span class="text-xs text-gray-600">DB</span>
              </div>
            </div>
          </div>

          <!-- Enhanced Realistic Loading Bar -->
          <div class="mt-4">
            <div class="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
              <!-- Background gradient -->
              <div class="absolute inset-0 bg-gradient-to-r from-gray-100 to-gray-200"></div>
              
              <!-- Main progress bar with smooth animation -->
              <div 
                class="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 rounded-full transition-all duration-300 ease-out shadow-sm"
                style="width: {loadingBarProgress}%"
              >
                <!-- Shimmer effect for realism -->
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent shimmer-animation"></div>
                
                <!-- Progress indicator dot -->
                <div class="absolute right-0 top-0 h-full w-1 bg-white/70 animate-pulse"></div>
                
                <!-- Completion glow effect -->
                {#if loadingBarProgress >= 100}
                  <div class="absolute inset-0 bg-emerald-400/60 animate-pulse completion-glow"></div>
                {/if}
              </div>
              
              <!-- Step markers for visual feedback -->
              <div class="absolute inset-0 flex justify-between items-center px-1">
                {#each [20, 40, 60, 80] as marker}
                  <div 
                    class="w-1.5 h-1.5 rounded-full transition-all duration-300 {
                      loadingBarProgress >= marker ? 'bg-white shadow-lg scale-110' : 'bg-white/30'
                    }"
                  ></div>
                {/each}
              </div>
            </div>
            
            <!-- Progress info with dynamic messages and real metrics -->
            <div class="flex justify-between items-center mt-2">
              <div class="flex items-center space-x-2">
                <!-- Loading spinner -->
                {#if loadingBarProgress < 100}
                  <div class="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                {:else}
                  <svg class="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                {/if}
                
                <span class="text-xs text-gray-600 font-medium transition-all duration-300">
                  {loadingMessage}
                </span>
              </div>
              
              <div class="flex items-center space-x-2">
                <span class="text-xs font-bold text-emerald-600 transition-all duration-300">
                  {loadingBarProgress.toFixed(1)}%
                </span>
                
                <!-- Real timing metrics -->
                {#if loadingStartTime > 0}
                  <span class="text-xs text-gray-400">
                    {Math.round((Date.now() - loadingStartTime) / 1000)}s
                  </span>
                {/if}
              </div>
            </div>
            
            <!-- Component status indicators with REAL metrics from actual system -->
            <div class="flex items-center justify-center space-x-4 mt-3 pt-2 border-t border-gray-100">
              <div class="flex items-center space-x-1">
                <div class="w-2 h-2 rounded-full transition-all duration-300 {
                  realMetrics.componentStatus.frontend === 'ready' ? 'bg-emerald-500 shadow-emerald-500/50 shadow-sm' : 
                  realMetrics.componentStatus.frontend === 'loading' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
                }"></div>
                <span class="text-xs text-gray-600">Frontend</span>
                {#if realMetrics.frontendInitComplete > 0}
                  <span class="text-xs text-gray-400">({((realMetrics.frontendInitComplete - realMetrics.frontendInitStart) / 1000).toFixed(1)}s)</span>
                {/if}
              </div>
              <div class="flex items-center space-x-1">
                <div class="w-2 h-2 rounded-full transition-all duration-300 {
                  realMetrics.componentStatus.backend === 'connected' ? 'bg-emerald-500 shadow-emerald-500/50 shadow-sm' : 
                  realMetrics.componentStatus.backend === 'unknown' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'
                }"></div>
                <span class="text-xs text-gray-600">Backend</span>
                {#if realMetrics.backendResponseTime > 0}
                  <span class="text-xs text-gray-400">({(realMetrics.backendResponseTime / 1000).toFixed(1)}s)</span>
                {/if}
              </div>
              <div class="flex items-center space-x-1">
                <div class="w-2 h-2 rounded-full transition-all duration-300 {
                  realMetrics.componentStatus.database === 'connected' ? 'bg-emerald-500 shadow-emerald-500/50 shadow-sm' : 
                  realMetrics.componentStatus.database === 'unknown' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'
                }"></div>
                <span class="text-xs text-gray-600">Database</span>
                {#if realMetrics.databaseResponseTime > 0}
                  <span class="text-xs text-gray-400">({(realMetrics.databaseResponseTime / 1000).toFixed(1)}s)</span>
                {/if}
              </div>
              <div class="flex items-center space-x-1">
                <div class="w-2 h-2 rounded-full transition-all duration-300 {
                  realMetrics.componentStatus.system === 'ready' ? 'bg-emerald-500 shadow-emerald-500/50 shadow-sm' : 
                  realMetrics.componentStatus.system === 'checking' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'
                }"></div>
                <span class="text-xs text-gray-600">System</span>
                {#if realMetrics.systemUptime > 0}
                  <span class="text-xs text-gray-400">({realMetrics.systemUptime}s uptime)</span>
                {/if}
              </div>
            </div>
          </div>

          <!-- Health Status Component -->
          <div class="mt-3">
            <HealthStatus 
              on:healthUpdate={handleHealthUpdate}
              autoRefresh={true}
              showActions={false}
            />
          </div>
        </div>
      {/if}

      <!-- Login Form -->
      {#if formVisible}
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden" in:scale={{ duration: 500, delay: 600, start: 0.95 }}>
          <div class="px-8 py-10">
            <form class="space-y-6" on:submit|preventDefault={handleLogin}>
              <!-- Email Field -->
              <div class="space-y-2">
                <label for="email" class="block text-sm font-semibold text-gray-700">
                  Email Address
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/>
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    bind:value={email}
                    class="w-full pl-12 pr-4 py-3 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 hover:bg-white"
                    placeholder="Enter your email"
                    autocomplete="email"
                  />
                </div>
              </div>

              <!-- Password Field -->
              <div class="space-y-2">
                <label for="password" class="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    bind:value={password}
                    class="w-full pl-12 pr-12 py-3 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 hover:bg-white"
                    placeholder="Enter your password"
                    autocomplete="current-password"
                  />
                  <!-- Password visibility toggle removed due to Svelte limitation with dynamic type and bind:value -->
                </div>
              </div>

              <!-- Remember Me & Refresh Page -->
              <div class="flex items-center justify-between">
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    class="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2 transition-colors"
                  />
                  <span class="ml-2 text-sm text-gray-600">Remember me</span>
                </label>
                <button 
                  type="button"
                  on:click={refreshPage}
                  class="text-sm font-medium text-emerald-600 hover:text-emerald-500 transition-colors flex items-center space-x-1 hover:underline"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                  <span>Refresh page</span>
                </button>
              </div>

              <!-- Error Message -->
              {#if error}
                <div class="bg-red-50 border border-red-200 rounded-xl p-4" in:slide={{ duration: 300 }}>
                  <div class="flex items-center">
                    <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                      <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <p class="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              {/if}

              <!-- Submit Button -->
              <div>
                <button
                  type="submit"
                  disabled={isLoading || !canLogin}
                  class="group relative w-full flex justify-center items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium border border-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                >
                  {#if isLoading}
                    <div class="flex items-center space-x-3">
                      <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </div>
                  {:else if !backendReachable}
                    <div class="flex items-center space-x-3">
                      <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Connecting to server...</span>
                    </div>
                  {:else if !databaseConnected}
                    <div class="flex items-center space-x-3">
                      <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Connecting to database...</span>
                    </div>
                  {:else if healthStatus === 'starting'}
                    <div class="flex items-center space-x-3">
                      <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>System starting up...</span>
                    </div>
                  {:else if healthStatus === 'checking'}
                    <div class="flex items-center space-x-3">
                      <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Checking system...</span>
                    </div>
                  {:else if canLogin && isLoadingComplete}
                    <div class="flex items-center space-x-2">
                      <span>Sign in</span>
                      <svg class="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                      </svg>
                    </div>
                  {:else}
                    <div class="flex items-center space-x-3">
                      <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>System not ready</span>
                    </div>
                  {/if}
                </button>
              </div>

              <!-- System Status Help -->
              {#if !canLogin && (healthStatus === 'error' || healthStatus === 'unhealthy' || !backendReachable || !databaseConnected)}
                <div class="bg-amber-50 border border-amber-200 rounded-xl p-4" in:slide={{ duration: 300 }}>
                  <div class="flex items-start">
                    <div class="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-amber-800">System Status</p>
                      <div class="text-sm text-amber-700 mt-1">
                        {#if !backendReachable}
                          <p>❌ Backend: Not reachable</p>
                        {:else}
                          <p>✅ Backend: Connected</p>
                        {/if}
                        
                        {#if !databaseConnected}
                          <p>❌ Database: Not connected</p>
                        {:else}
                          <p>✅ Database: Connected</p>
                        {/if}
                        
                        {#if !canLogin}
                          <p class="mt-2 font-medium">Please wait for all systems to be ready before signing in.</p>
                        {/if}
                      </div>
                      {#if healthError}
                        <p class="text-sm text-red-600 mt-2 font-medium">Details: {healthError}</p>
                      {/if}
                      <div class="mt-3 flex space-x-2">
                        <button 
                          type="button"
                          on:click={refreshPage}
                          class="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1 rounded-lg transition-colors"
                        >
                          Refresh Status
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              {/if}
            </form>
          </div>
        </div>
      {/if}

      <!-- Sign Up Link -->
      {#if formVisible}
        <div class="text-center" in:fade={{ duration: 400, delay: 800 }}>
          <div class="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <p class="text-gray-600">
              Don't have an account?
              <a 
                href="/signup" 
                class="font-semibold text-emerald-600 hover:text-emerald-500 transition-colors ml-1 hover:underline"
              >
                Create one now
              </a>
            </p>
            <div class="flex items-center justify-center space-x-6 mt-4 pt-4 border-t border-gray-200">
              <div class="flex items-center space-x-2">
                <div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span class="text-xs text-gray-500">Secure</span>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style="animation-delay: 1s;"></div>
                <span class="text-xs text-gray-500">Fast</span>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style="animation-delay: 2s;"></div>
                <span class="text-xs text-gray-500">Reliable</span>
              </div>
            </div>
          </div>
        </div>
      {/if}

      <!-- Features Preview -->
      {#if formVisible}
        <div class="grid grid-cols-3 gap-4" in:fly={{ y: 30, duration: 600, delay: 1000 }}>
          <div class="bg-white/40 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20 hover:bg-white/60 transition-all duration-300 group">
            <div class="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-300">
              <span class="text-white text-sm">📊</span>
            </div>
            <p class="text-xs font-medium text-gray-700">Analytics</p>
          </div>

          <div class="bg-white/40 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20 hover:bg-white/60 transition-all duration-300 group">
            <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-300">
              <span class="text-white text-sm">💰</span>
            </div>
            <p class="text-xs font-medium text-gray-700">Finance</p>
          </div>

          <div class="bg-white/40 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20 hover:bg-white/60 transition-all duration-300 group">
            <div class="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-300">
              <span class="text-white text-sm">📈</span>
            </div>
            <p class="text-xs font-medium text-gray-700">Reports</p>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  /* Custom animations */
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }

  @keyframes pulse-slow {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.8; }
  }

  /* Glass morphism enhancements */
  .backdrop-blur-sm {
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  /* Custom focus styles */
  input:focus,
  button:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }

  /* Enhanced hover effects */
  .group:hover .group-hover\:scale-110 {
    transform: scale(1.1);
  }

  /* Gradient text effect */
  .bg-clip-text {
    -webkit-background-clip: text;
    background-clip: text;
  }

  /* Smooth transitions */
  * {
    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  /* Loading animation */
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  /* Floating background elements */
  .absolute.animate-pulse {
    animation: pulse-slow 6s ease-in-out infinite;
  }

  /* Custom checkbox styling */
  input[type="checkbox"]:checked {
    background-color: #10b981;
    border-color: #10b981;
  }

  /* Enhanced shadows */
  .shadow-emerald-500\/25 {
    box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.25), 0 2px 4px -1px rgba(16, 185, 129, 0.06);
  }

  /* Enhanced loading bar animations */
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .shimmer-animation {
    animation: shimmer 2s infinite;
  }

  @keyframes completion-glow {
    0% { opacity: 0; }
    50% { opacity: 1; }
    100% { opacity: 0; }
  }

  .completion-glow {
    animation: completion-glow 1.5s ease-in-out;
  }

  /* Smooth progress bar transitions */
  .transition-all {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Enhanced shadow effects */
  .shadow-emerald-500\/50 {
    box-shadow: 0 0 4px rgba(16, 185, 129, 0.5);
  }

  /* Loading bar step markers */
  .scale-110 {
    transform: scale(1.1);
  }
</style>