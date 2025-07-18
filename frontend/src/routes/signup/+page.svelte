<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { token, user, showAlert } from '$lib/stores';
  import { authApi } from '$lib/api';
  import Spinner from '$lib/components/Spinner.svelte';
  
  let email = '';
  let password = '';
  let firstName = '';
  let lastName = '';
  let isLoading = false;
  let error = '';
  
  onMount(() => {
    // If user is already logged in, redirect to dashboard
    if ($token) {
      goto('/');
    }
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

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8 animate-fade-in">
    <div>
      <h1 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Create your account
      </h1>
      <p class="mt-2 text-center text-sm text-gray-600">
        Sign up for the Cession Management System
      </p>
    </div>
    
    <form class="mt-8 space-y-6" on:submit|preventDefault={handleSignup}>
      <div class="rounded-md shadow-sm -space-y-px">
        <div>
          <label for="first-name" class="sr-only">First name</label>
          <input 
            id="first-name" 
            name="firstName" 
            type="text" 
            autocomplete="given-name" 
            required 
            bind:value={firstName}
            class="input rounded-t-md rounded-b-none" 
            placeholder="First name" 
          />
        </div>
        <div>
          <label for="last-name" class="sr-only">Last name</label>
          <input 
            id="last-name" 
            name="lastName" 
            type="text" 
            autocomplete="family-name" 
            required 
            bind:value={lastName}
            class="input rounded-t-none rounded-b-none" 
            placeholder="Last name" 
          />
        </div>
        <div>
          <label for="email-address" class="sr-only">Email address</label>
          <input 
            id="email-address" 
            name="email" 
            type="email" 
            autocomplete="email" 
            required 
            bind:value={email}
            class="input rounded-t-none rounded-b-none" 
            placeholder="Email address" 
          />
        </div>
        <div>
          <label for="password" class="sr-only">Password</label>
          <input 
            id="password" 
            name="password" 
            type="password" 
            autocomplete="new-password" 
            required 
            bind:value={password}
            class="input rounded-t-none rounded-b-md" 
            placeholder="Password (min. 6 characters)" 
          />
        </div>
      </div>

      {#if error}
        <div class="text-red-500 text-sm mt-2 animate-fade-in">
          {error}
        </div>
      {/if}

      <div>
        <button 
          type="submit" 
          class="btn btn-primary w-full flex justify-center py-2 px-4"
          disabled={isLoading}
        >
          {#if isLoading}
            <Spinner size="sm" color="white" isLoading={true} />
            <span class="ml-2">Creating account...</span>
          {:else}
            Sign up
          {/if}
        </button>
      </div>
      
      <div class="text-center">
        <a href="/login" class="text-primary-600 hover:text-primary-500">
          Already have an account? Sign in
        </a>
      </div>
    </form>
  </div>
</div>
