<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { token, alert, user } from '$lib/stores';
  import Alert from '$lib/components/Alert.svelte';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import Toast from '$lib/components/Toast.svelte';
  import { language } from '$lib/stores/language';
  import { t } from '$lib/i18n';
  
  // Data passed from +layout.js load function
  export let data;
  
  let isLoggedIn = !!data.token;
  let isMobileMenuOpen = false;
  let isPublicRoute = data.isPublicRoute; // Get from load function

  // Reactive block for handling token changes AFTER initial load
  $: if (browser && $token !== undefined && $token !== null) {
      console.log('Layout Svelte - Reactive Token Change - Token now exists:', !!$token);
      // If token appears and user is on a public route (like login/signup), redirect to home
      if (isPublicRoute) {
          console.log('Layout Svelte - Reactive Token Change - On public route with token, redirecting to /');
          goto('/');
      }
  } else if (browser && $token === null && !isPublicRoute) {
      console.log('Layout Svelte - Reactive Token Change - Token is null on protected route, redirecting to /login');
      // If token is null and user is on a protected route, redirect to login
       goto('/login');
  }

  // Wrap all browser-dependent code in a browser check
  if (browser) {
    console.log('Layout Svelte - Initial isLoggedIn from data:', isLoggedIn);
    console.log('Layout Svelte - Initial token from data:', data.token);
    console.log('Layout Svelte - Initial isPublicRoute from data:', isPublicRoute);
    
    // Subscribe to token changes to update UI (moved outside onMount)
    // The reactive block above handles redirection, this is just for the isLoggedIn variable
    const unsubscribe = token.subscribe(value => {
      console.log('Layout Svelte - Token store changed (for isLoggedIn variable): ', !!value);
      isLoggedIn = !!value;
    });

    onMount(() => {
      // onMount only runs in the browser, reliable place to check localStorage
      console.log('Layout Svelte - onMount - Checking token and redirecting if necessary');
      const tokenAfterMount = localStorage.getItem('token');
      console.log('Layout Svelte - onMount - Token in localStorage:', !!tokenAfterMount);

      // Check if user should be on a protected route but no token exists
      if (!tokenAfterMount && !isPublicRoute) {
          console.log('Layout Svelte - onMount - No token on protected route, redirecting to /login');
          goto('/login');
      }
      // Check if user is logged in (has token) but is on a public route (login/signup)
      if (tokenAfterMount && isPublicRoute) {
          console.log('Layout Svelte - onMount - Token exists on public route, redirecting to /');
          goto('/');
      }

      // Cleanup subscription on component destroy
      return () => {
        console.log('Layout Svelte - Unsubscribing from token store');
        unsubscribe();
      };
    });
  }
  
  function logout() {
    console.log('Layout Svelte - Logging out');
    token.set(null);
    // After logging out, redirect to login page
    if (browser) {
        goto('/login');
    }
  }
  
  function toggleMobileMenu() {
    isMobileMenuOpen = !isMobileMenuOpen;
  }

  const navigationItems = [
    { href: '/', label: $t('common.navigation.dashboard') },
    { href: '/clients', label: $t('common.navigation.clients') },
    { href: '/cessions', label: $t('common.navigation.cessions') },
    { href: '/inventory', label: $t('common.navigation.inventory') },
    { href: '/selling', label: $t('common.navigation.selling') },
    { href: '/finance', label: $t('common.navigation.finance') },
    { href: '/settings', label: $t('common.navigation.settings') }
  ];
</script>

{#if $alert.show}
  <div class="toast toast-{$alert.type} animate-fade-in">
    <span>{$alert.message}</span>
    <button class="ml-auto" on:click={() => $alert.show = false}>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
      </svg>
    </button>
  </div>
{/if}

{#if isLoggedIn}
  <div class="min-h-screen flex flex-col bg-gray-50">
    <header class="bg-primary-700 text-white shadow-md">
      <div class="container mx-auto px-4 py-3">
        <!-- Desktop Navigation -->
        <div class="flex justify-between items-center">
          <a href="/" class="text-xl font-bold flex items-center gap-2 animate-slide-in">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {$t('common.app.title')}
          </a>
          
          <!-- Mobile menu button -->
          <div class="md:hidden">
            <button 
              on:click={toggleMobileMenu}
              class="text-white focus:outline-none focus:ring-2 focus:ring-white rounded-md p-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {#if isMobileMenuOpen}
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                {:else}
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                {/if}
              </svg>
            </button>
          </div>
          
          <!-- Desktop Navigation Links -->
          <nav class="hidden md:flex items-center space-x-6">
            <a href="/" class="hover:text-primary-200 transition-colors flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              {$t('common.navigation.dashboard')}
            </a>
            <a href="/clients" class="hover:text-primary-200 transition-colors flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              {$t('common.navigation.clients')}
            </a>
            <a href="/cessions" class="hover:text-primary-200 transition-colors flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
              </svg>
              {$t('common.navigation.cessions')}
            </a>
            <a href="/inventory" class="hover:text-primary-200 transition-colors flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd" />
              </svg>
              {$t('common.navigation.inventory')}
            </a>
            <a href="/selling" class="hover:text-primary-200 transition-colors flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd" />
              </svg>
              {$t('common.navigation.selling')}
            </a>
            <a href="/finance" class="hover:text-primary-200 transition-colors flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
              </svg>
              {$t('common.navigation.financial')}
            </a>
            <a href="/settings" class="hover:text-primary-200 transition-colors flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
              </svg>
              {$t('common.navigation.settings')}
            </a>
            <button on:click={logout} class="hover:text-primary-200 transition-colors flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm7 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm1 4a1 1 0 102 0V7a1 1 0 10-2 0v4z" clip-rule="evenodd" />
              </svg>
              {$t('common.actions.logout')}
            </button>
          </nav>
        </div>
        
        <!-- Mobile Navigation Menu -->
        {#if isMobileMenuOpen}
          <div class="md:hidden mt-3 pt-3 border-t border-primary-600 animate-slide-up">
            <nav class="flex flex-col space-y-3">
              <a href="/" class="hover:text-primary-200 transition-colors flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                {$t('common.navigation.dashboard')}
              </a>
              <a href="/clients" class="hover:text-primary-200 transition-colors flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
                {$t('common.navigation.clients')}
              </a>
              <a href="/cessions" class="hover:text-primary-200 transition-colors flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                </svg>
                {$t('common.navigation.cessions')}
              </a>
              <a href="/inventory" class="hover:text-primary-200 transition-colors flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd" />
                </svg>
                {$t('common.navigation.inventory')}
              </a>
              <a href="/selling" class="hover:text-primary-200 transition-colors flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.5 2a.5.5 0 00-.5.5v2a.5.5 0 00.5.5h2a.5.5 0 00.5-.5v-2a.5.5 0 00-.5-.5h-2zM8 4a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v2a.5.5 0 01-.5.5h-2a.5.5 0 01-.5-.5V4zm-3 8a.5.5 0 00-.5.5v2a.5.5 0 00.5.5h2a.5.5 0 00.5-.5v-2a.5.5 0 00-.5-.5h-2zM8 12a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v2a.5.5 0 01-.5.5h-2a.5.5 0 01-.5-.5v-2zM3 7a.5.5 0 00-.5.5v2a.5.5 0 00.5.5h2a.5.5 0 00.5-.5v-2a.5.5 0 00-.5-.5H3zm5 0a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v2a.5.5 0 01-.5.5h-2a.5.5 0 01-.5-.5V7zm5-5a.5.5 0 00-.5.5v2a.5.5 0 00.5.5h2a.5.5 0 00.5-.5v-2a.5.5 0 00-.5-.5h-2zM13 7a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v2a.5.5 0 01-.5.5h-2a.5.5 0 01-.5-.5V7zm-5 5a.5.5 0 00-.5.5v2a.5.5 0 00.5.5h2a.5.5 0 00.5-.5v-2a.5.5 0 00-.5-.5h-2zM13 12a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v2a.5.5 0 01-.5.5h-2a.5.5 0 01-.5-.5v-2z" clip-rule="evenodd" />
                </svg>
                {$t('common.navigation.selling')}
              </a>
              <a href="/finance" class="hover:text-primary-200 transition-colors flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                </svg>
                {$t('common.navigation.financial')}
              </a>
              <a href="/settings" class="hover:text-primary-200 transition-colors flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
                </svg>
                {$t('common.navigation.settings')}
              </a>
              <button on:click={logout} class="hover:text-primary-200 transition-colors flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm7 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm1 4a1 1 0 102 0V7a1 1 0 10-2 0v4z" clip-rule="evenodd" />
                </svg>
                {$t('common.actions.logout')}
              </button>
            </nav>
          </div>
        {/if}
      </div>
    </header>
    
    <main class="flex-grow container mx-auto px-4 py-6 animate-fade-in">
      <slot />
    </main>
    
    <footer class="bg-gray-100 border-t">
      <div class="container mx-auto px-4 py-3 text-center text-gray-600 text-sm">
        &copy; {new Date().getFullYear()} {$t('common.app.title')}
      </div>
    </footer>
  </div>
{:else}
  <div class="animate-fade-in">
    <slot />
  </div>
{/if}

<Toast />
