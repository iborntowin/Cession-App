<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { token, user, showAlert, setAuth, clearAuth } from '$lib/stores';
  import { authApi, checkDbHealth } from '$lib/api';
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

  // Enhanced loading bar state
  let loadingBarProgress = 0;
  let loadingMessage = 'Initializing...';
  let isLoadingComplete = false;
  let loadingStartTime = 0;
  let progressInterval;
  let progressTimeout;
  let maxWaitTime = 30000; // 30 seconds max wait time

  // Handle health status updates
  function handleHealthUpdate(event) {
    const { status, backendReachable: backend, databaseConnected: db, errorMessage } = event.detail;
    healthStatus = status;
    backendReachable = backend;
    databaseConnected = db;
    healthError = errorMessage;

    // Enable login only when backend is reachable and database is connected
    canLogin = backend && db && status === 'healthy';

    // Start realistic loading sequence immediately, regardless of status
    if (!isLoadingComplete && loadingBarProgress === 0) {
      startRealisticLoading();
    }

    // Update progress based on actual status
    if (status === 'healthy' && canLogin) {
      // System is ready - complete the loading
      if (loadingBarProgress < 100) {
        finishLoading();
      }
    } else if (status === 'starting' || status === 'checking') {
      // Show intermediate progress for system startup
      if (loadingBarProgress < 30) {
        animateProgressTo(30, 'Connecting to services...');
      }
    } else if (status === 'unhealthy' || status === 'error') {
      // Auto-refresh when system has issues to retry connection
      if (loadingBarProgress < 100) {
        setTimeout(() => {
          console.log('System unhealthy, refreshing page to retry...');
          window.location.reload();
        }, 3000); // Wait 3 seconds before refresh to show error state
      }
    }

    // If backend becomes available and we were waiting, try login again
    if (canLogin && isLoading && email && password) {
      handleLogin();
    }
  }

  function startRealisticLoading() {
    if (isLoadingComplete || loadingStartTime > 0) return; // Prevent multiple starts
    
    loadingStartTime = Date.now();
    
    // Set maximum wait timeout (reduced to 15 seconds)
    const maxWaitTimeout = setTimeout(() => {
      if (!isLoadingComplete) {
        loadingMessage = 'Taking longer than expected...';
        animateProgressTo(95, 'Retrying connection...', 1000);
        
        setTimeout(() => {
          console.log('Max wait time exceeded, refreshing page...');
          refreshPage();
        }, 2000);
      }
    }, 15000); // Reduced from 30 seconds to 15 seconds
    
    // Stage 1: Fast initial progress (0% → 60% in 1s)
    animateProgressTo(60, 'Loading workspace...', 1000);
    
    setTimeout(() => {
      // Stage 2: Slower progress (60% → 90% in 2s) - reduced time
      animateProgressTo(90, 'Syncing data...', 2000);
      
      setTimeout(() => {
        // Stage 3: Check if system is ready, if not wait briefly then complete anyway
        if (canLogin) {
          clearTimeout(maxWaitTimeout);
          finishLoading();
        } else {
          // Wait for backend to be ready but with shorter timeout
          let waitCount = 0;
          const maxWaitCount = 10; // Maximum 5 seconds (10 * 500ms)
          
          const waitForBackend = setInterval(() => {
            waitCount++;
            
            if (canLogin) {
              clearInterval(waitForBackend);
              clearTimeout(maxWaitTimeout);
              finishLoading();
            } else if (waitCount >= maxWaitCount) {
              // If backend still not ready after 5 seconds, complete anyway
              clearInterval(waitForBackend);
              clearTimeout(maxWaitTimeout);
              console.log('Backend not ready after 5 seconds, completing loading anyway');
              finishLoading();
            }
          }, 500);
        }
      }, 2000); // Reduced from 2500ms to 2000ms
    }, 1000);
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
    animateProgressTo(100, 'System ready!', 800);
    
    setTimeout(() => {
      isLoadingComplete = true;
      // Enable login when loading completes, regardless of health status
      if (!canLogin) {
        canLogin = true;
        console.log('Login enabled after loading completion');
      }
    }, 800);
  }

  function refreshPage() {
    // Reset loading state before refresh
    loadingBarProgress = 0;
    loadingMessage = 'Initializing...';
    isLoadingComplete = false;
    loadingStartTime = 0;
    
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

    // Trigger form animation after mount
    setTimeout(() => {
      formVisible = true;
      backgroundLoaded = true;
    }, 100);

    // Fallback: Start loading after 2 seconds if not started yet
    setTimeout(() => {
      if (loadingBarProgress === 0 && !isLoadingComplete) {
        console.log('Fallback: Starting loading sequence');
        startRealisticLoading();
      }
    }, 2000);

    // Ultimate fallback: Complete loading after 20 seconds no matter what
    setTimeout(() => {
      if (!isLoadingComplete) {
        console.log('Ultimate fallback: Forcing loading completion');
        finishLoading();
      }
    }, 20000);
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
            
            <!-- Progress info with dynamic messages -->
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
                  {loadingBarProgress}%
                </span>
                
                <!-- Time indicator -->
                {#if loadingStartTime > 0}
                  <span class="text-xs text-gray-400">
                    {Math.round((Date.now() - loadingStartTime) / 1000)}s
                  </span>
                {/if}
              </div>
            </div>
            
            <!-- System status indicators -->
            <div class="flex items-center justify-center space-x-4 mt-3 pt-2 border-t border-gray-100">
              <div class="flex items-center space-x-1">
                <div class="w-2 h-2 rounded-full transition-all duration-300 {
                  backendReachable ? 'bg-emerald-500 shadow-emerald-500/50 shadow-sm' : 'bg-gray-300'
                }"></div>
                <span class="text-xs text-gray-600">API</span>
              </div>
              <div class="flex items-center space-x-1">
                <div class="w-2 h-2 rounded-full transition-all duration-300 {
                  databaseConnected ? 'bg-emerald-500 shadow-emerald-500/50 shadow-sm' : 'bg-gray-300'
                }"></div>
                <span class="text-xs text-gray-600">Database</span>
              </div>
              <div class="flex items-center space-x-1">
                <div class="w-2 h-2 rounded-full transition-all duration-300 {
                  canLogin ? 'bg-emerald-500 shadow-emerald-500/50 shadow-sm' : 'bg-gray-300'
                }"></div>
                <span class="text-xs text-gray-600">Auth</span>
              </div>
            </div>
          </div>

          <!-- Health Status Component -->
          <div class="mt-3">
            <HealthStatus 
              on:healthUpdate={handleHealthUpdate}
              autoRefresh={false}
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
                  disabled={isLoading || (!canLogin && !isLoadingComplete)}
                  class="group relative w-full flex justify-center items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium border border-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                >
                  {#if isLoading}
                    <div class="flex items-center space-x-3">
                      <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </div>
                  {:else if !canLogin && !isLoadingComplete}
                    <div class="flex items-center space-x-3">
                      <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>
                        {#if loadingBarProgress < 100}
                          Loading system...
                        {:else if healthStatus === 'starting'}
                          Waiting for backend...
                        {:else if healthStatus === 'checking'}
                          Checking system...
                        {:else}
                          System unavailable
                        {/if}
                      </span>
                    </div>
                  {:else}
                    <div class="flex items-center space-x-2">
                      <span>Sign in</span>
                      <svg class="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                      </svg>
                    </div>
                  {/if}
                </button>
              </div>

              <!-- System Status Help -->
              {#if !canLogin && !isLoadingComplete && (healthStatus === 'error' || healthStatus === 'unhealthy')}
                <div class="bg-amber-50 border border-amber-200 rounded-xl p-4" in:slide={{ duration: 300 }}>
                  <div class="flex items-start">
                    <div class="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-amber-800">System Not Ready</p>
                      <p class="text-sm text-amber-700 mt-1">Please wait for the system to be ready before signing in.</p>
                      {#if healthError}
                        <p class="text-sm text-red-600 mt-2 font-medium">Issue: {healthError}</p>
                      {/if}
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