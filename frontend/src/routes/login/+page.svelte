<script>
  import { onMount } from 'svelte';
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

  // Loading bar state
  let loadingBarProgress = 0;

  // Handle health status updates
  function handleHealthUpdate(event) {
    const { status, backendReachable: backend, databaseConnected: db, errorMessage } = event.detail;
    healthStatus = status;
    backendReachable = backend;
    databaseConnected = db;
    healthError = errorMessage;

    // Enable login only when backend is reachable and database is connected
    canLogin = backend && db && status === 'healthy';

    // Update loading bar based on health status
    if (status === 'healthy') {
      loadingBarProgress = 100;
    } else if (status === 'starting') {
      loadingBarProgress = 30;
    } else if (status === 'checking') {
      loadingBarProgress = 10;
    } else {
      loadingBarProgress = 0;
    }

    // If backend becomes available and we were waiting, try login again
    if (canLogin && isLoading && email && password) {
      handleLogin();
    }
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

          <!-- Creative Loading Bar -->
          <div class="mt-4">
            <div class="relative w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                class="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 rounded-full transition-all duration-500 ease-out"
                style="width: {loadingBarProgress}%"
              >
                <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
                <div class="absolute right-0 top-0 h-full w-2 bg-white/40 animate-pulse"></div>
              </div>
            </div>
            <div class="flex justify-between items-center mt-2">
              <span class="text-xs text-gray-500">
                {#if healthStatus === 'healthy'}
                  All systems operational
                {:else if healthStatus === 'starting'}
                  Backend starting...
                {:else if healthStatus === 'checking'}
                  Checking services...
                {:else}
                  System issues detected
                {/if}
              </span>
              <span class="text-xs font-medium text-emerald-600">{loadingBarProgress}%</span>
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

              <!-- Remember Me & Forgot Password -->
              <div class="flex items-center justify-between">
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    class="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2 transition-colors"
                  />
                  <span class="ml-2 text-sm text-gray-600">Remember me</span>
                </label>
                <a href="/forgot-password" class="text-sm font-medium text-emerald-600 hover:text-emerald-500 transition-colors">
                  Forgot password?
                </a>
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
                  {:else if !canLogin}
                    <div class="flex items-center space-x-3">
                      <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>
                        {#if healthStatus === 'starting'}
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
              {#if !canLogin && (healthStatus === 'error' || healthStatus === 'unhealthy')}
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

  /* Loading bar shimmer effect */
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .bg-gradient-to-r::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    animation: shimmer 2s infinite;
  }
</style>