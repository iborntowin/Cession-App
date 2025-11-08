<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { token, user, showAlert } from '$lib/stores';
  import { authApi } from '$lib/api';
  import { fade, fly, scale, slide } from 'svelte/transition';
  import Spinner from '$lib/components/Spinner.svelte';

  let email = '';
  let password = '';
  let firstName = '';
  let lastName = '';
  let isLoading = false;
  let error = '';

  // Animation states
  let formVisible = false;
  let backgroundLoaded = false;

  onMount(() => {
    // If user is already logged in, redirect to dashboard
    if ($token) {
      goto('/');
    }

    // Trigger form animation after mount
    setTimeout(() => {
      formVisible = true;
      backgroundLoaded = true;
    }, 100);
  });

  async function handleSignup() {
    error = '';
    isLoading = true;

    if (!email || !password || !firstName || !lastName) {
      error = 'Please fill in all fields';
      isLoading = false;
      return;
    }

    if (password.length < 6) {
      error = 'Password must be at least 6 characters';
      isLoading = false;
      return;
    }

    const result = await authApi.signup(email, password, firstName, lastName);

    isLoading = false;

    if (result.success) {
      showAlert('Account created successfully! Welcome to Cession Management.', 'success');
      goto('/');
    } else {
      error = result.error;
    }
  }
</script>

<!-- Enhanced Signup Page -->
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
            Create your account
          </h1>
          <p class="text-gray-600 font-medium">
            Sign up for the Cession Management System
          </p>
        </div>
      {/if}

      <!-- Signup Form -->
      {#if formVisible}
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden" in:scale={{ duration: 500, delay: 400, start: 0.95 }}>
          <div class="px-8 py-10">
            <form class="space-y-6" on:submit|preventDefault={handleSignup}>
              <!-- Name Fields -->
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label for="first-name" class="block text-sm font-semibold text-gray-700">
                    First name
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                      </svg>
                    </div>
                    <input
                      id="first-name"
                      name="firstName"
                      type="text"
                      autocomplete="given-name"
                      required
                      bind:value={firstName}
                      class="w-full pl-12 pr-4 py-3 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 hover:bg-white"
                      placeholder="First name"
                    />
                  </div>
                </div>

                <div class="space-y-2">
                  <label for="last-name" class="block text-sm font-semibold text-gray-700">
                    Last name
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                      </svg>
                    </div>
                    <input
                      id="last-name"
                      name="lastName"
                      type="text"
                      autocomplete="family-name"
                      required
                      bind:value={lastName}
                      class="w-full pl-12 pr-4 py-3 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 hover:bg-white"
                      placeholder="Last name"
                    />
                  </div>
                </div>
              </div>

              <!-- Email Field -->
              <div class="space-y-2">
                <label for="email-address" class="block text-sm font-semibold text-gray-700">
                  Email address
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/>
                    </svg>
                  </div>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autocomplete="email"
                    required
                    bind:value={email}
                    class="w-full pl-12 pr-4 py-3 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 hover:bg-white"
                    placeholder="Email address"
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
                    autocomplete="new-password"
                    required
                    bind:value={password}
                    class="w-full pl-12 pr-4 py-3 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 hover:bg-white"
                    placeholder="Password (min. 6 characters)"
                  />
                </div>
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
                  disabled={isLoading}
                  class="group relative w-full flex justify-center items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium border border-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                >
                  {#if isLoading}
                    <div class="flex items-center space-x-3">
                      <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Creating account...</span>
                    </div>
                  {:else}
                    <div class="flex items-center space-x-2">
                      <span>Sign up</span>
                      <svg class="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                      </svg>
                    </div>
                  {/if}
                </button>
              </div>

              <!-- Sign In Link -->
              <div class="text-center">
                <a href="/login" class="font-semibold text-emerald-600 hover:text-emerald-500 transition-colors hover:underline">
                  Already have an account? Sign in
                </a>
              </div>
            </form>
          </div>
        </div>
      {/if}

      <!-- Features Preview -->
      {#if formVisible}
        <div class="grid grid-cols-3 gap-4" in:fly={{ y: 30, duration: 600, delay: 800 }}>
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

  /* Enhanced shadows */
  .shadow-emerald-500\/25 {
    box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.25), 0 2px 4px -1px rgba(16, 185, 129, 0.06);
  }
</style>