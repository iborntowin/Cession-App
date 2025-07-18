<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { token, user, showAlert, setAuth, clearAuth } from '$lib/stores';
  import { authApi, checkDbHealth } from '$lib/api';
  import Spinner from '$lib/components/Spinner.svelte';
  import HealthStatus from '$lib/components/HealthStatus.svelte';
  
  let email = '';
  let password = '';
  let isLoading = false;
  let error = '';

  // Health status state
  let healthStatus = 'checking';
  let backendReachable = false;
  let databaseConnected = false;
  let healthError = '';
  let canLogin = false;

  // Handle health status updates
  function handleHealthUpdate(event) {
    const { status, backendReachable: backend, databaseConnected: db, errorMessage } = event.detail;
    healthStatus = status;
    backendReachable = backend;
    databaseConnected = db;
    healthError = errorMessage;
    
    // Enable login only when backend is reachable and database is connected
    canLogin = backend && db && status === 'healthy';
    
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
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Sign in to your account
      </h2>
    </div>
    <!-- Health Status Display -->
    <HealthStatus 
      on:healthUpdate={handleHealthUpdate}
      autoRefresh={true}
      showActions={true}
    />
    <form class="mt-8 space-y-6" on:submit|preventDefault={handleLogin}>
      <div class="rounded-md shadow-sm -space-y-px">
        <div>
          <label for="email" class="sr-only">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            bind:value={email}
            class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
            placeholder="Email address"
            autocomplete="email"
          />
        </div>
        <div>
          <label for="password" class="sr-only">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            bind:value={password}
            class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
            placeholder="Password"
            autocomplete="current-password"
          />
        </div>
      </div>

      {#if error}
        <div class="text-red-500 text-sm text-center">{error}</div>
      {/if}

      <div>
        <button
          type="submit"
          disabled={isLoading || !canLogin}
          class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if isLoading}
            <Spinner size="sm" />
          {:else if !canLogin}
            {#if healthStatus === 'starting'}
              Waiting for backend...
            {:else if healthStatus === 'checking'}
              Checking system...
            {:else}
              System unavailable
            {/if}
          {:else}
            Sign in
          {/if}
        </button>
      </div>

      <!-- Additional help text when system is not ready -->
      {#if !canLogin && (healthStatus === 'error' || healthStatus === 'unhealthy')}
        <div class="text-center text-sm text-gray-600">
          <p>Please wait for the system to be ready before signing in.</p>
          {#if healthError}
            <p class="text-red-600 mt-1">Issue: {healthError}</p>
          {/if}
        </div>
      {/if}
    </form>
    <div class="text-sm text-center">
      <p class="text-gray-600">
        Don't have an account?
        <a href="/signup" class="font-medium text-primary-600 hover:text-primary-500">
          Sign up
        </a>
      </p>
    </div>
  </div>
</div>
