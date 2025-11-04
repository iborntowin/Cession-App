<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { token, alert, user } from '$lib/stores';
  import Alert from '$lib/components/Alert.svelte';
  import { browser } from '$app/environment';
  import { goto, afterNavigate } from '$app/navigation';
  import { page } from '$app/stores';
  import Toast from '$lib/components/Toast.svelte';
  import EnhancedToast from '$lib/components/EnhancedToast.svelte';
  import CommandPalette from '$lib/components/CommandPalette.svelte';
  import KeyboardShortcutsHelp from '$lib/components/KeyboardShortcutsHelp.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import UpdateNotification from '$lib/components/UpdateNotification.svelte';
  import DebugErrorBox from '$lib/components/DebugErrorBox.svelte';
  import { language } from '$lib/stores/language';
  import { t } from '$lib/i18n';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { checkForUpdatesEnhanced } from '$lib/custom-updater';
  
  export let data;
  
  let isLoggedIn = !!data.token;
  let isMobileMenuOpen = false;
  let isPublicRoute = data.isPublicRoute;
  
  // Update notification state
  let showUpdateNotification = false;
  let updateVersion = '';
  let updateReleaseNotes = '';
  let updateDownloadProgress = 0;
  let updateInstalling = false;
  let updateObject = null;
  
  // Debug error box
  let debugErrors = [];
  let debugBoxComponent;
  
  // Make debug logging function global
  if (browser) {
    window.debugLog = (message) => {
      console.log('[DEBUG]', message);
      if (debugBoxComponent) {
        debugBoxComponent.addError(message);
      }
      debugErrors = [...debugErrors, { timestamp: new Date().toLocaleTimeString(), message, id: Date.now() }];
    };
  }
  
  // Reactive current route tracking
  import { derived } from 'svelte/store';
  // Use a derived store for currentRoute to always be up-to-date
  const currentRouteStore = derived(page, ($page) => $page.url.pathname);
  let currentRoute = '';
  $: currentRoute = $page.url.pathname;

  $: if (browser && $token !== undefined && $token !== null) {
      if (isPublicRoute) {
          goto('/');
      }
  } else if (browser && $token === null && !isPublicRoute) {
      goto('/login');
  }

  if (browser) {
    const unsubscribe = token.subscribe(value => {
      isLoggedIn = !!value;
    });

    onMount(() => {
      const tokenAfterMount = localStorage.getItem('token');
      
      if (!tokenAfterMount && !isPublicRoute) {
          goto('/login');
      }
      if (tokenAfterMount && isPublicRoute) {
          goto('/');
      }

      // Check for updates on startup
      if (tokenAfterMount) {
        setTimeout(() => {
          checkForUpdates();
        }, 10000); // Check 10 seconds after app loads
      }

      return () => {
        unsubscribe();
      };
    });
  }
  
  async function checkForUpdates() {
    try {
      console.log('🔍 Checking for updates...');
      const result = await checkForUpdatesEnhanced();
      
      if (result.available) {
        console.log('✨ Update available:', result.version);
        updateVersion = result.version;
        updateReleaseNotes = result.notes || 'New features and improvements';
        updateObject = result;
        showUpdateNotification = true;
      } else {
        console.log('✅ App is up to date');
      }
    } catch (error) {
      console.error('❌ Failed to check for updates:', error);
    }
  }
  
  async function handleInstallUpdate() {
    if (!updateObject || !updateObject.downloadAndInstall) {
      console.error('No update object available');
      return;
    }
    
    try {
      updateDownloadProgress = 0;
      updateInstalling = false;
      
      await updateObject.downloadAndInstall(
        (progress) => {
          // Progress callback
          updateDownloadProgress = progress.percent || 0;
          console.log(`📥 Download progress: ${updateDownloadProgress}%`);
        },
        (status, details) => {
          // Status callback
          console.log(`📊 Update status: ${status}`, details);
          
          if (status === 'download-complete') {
            updateDownloadProgress = 100;
          } else if (status === 'installing') {
            updateInstalling = true;
          } else if (status === 'completed') {
            console.log('✅ Update completed, app will restart');
          }
        }
      );
    } catch (error) {
      console.error('❌ Update installation failed:', error);
      showUpdateNotification = false;
      updateDownloadProgress = 0;
      updateInstalling = false;
      
      // Show error to user
      $alert = {
        show: true,
        type: 'error',
        message: 'Update installation failed: ' + (error.message || error)
      };
    }
  }
  
  function handleDismissUpdate() {
    showUpdateNotification = false;
  }
  
  function logout() {
    token.set(null);
    if (browser) {
        goto('/login');
    }
  }
  
  function toggleMobileMenu() {
    isMobileMenuOpen = !isMobileMenuOpen;
  }

  // Make navigation items reactive to ensure translations update
  $: navigationItems = [
    { href: '/', label: $t('common.navigation.dashboard'), icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/clients', label: $t('common.navigation.clients'), icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { href: '/cessions', label: $t('common.navigation.cessions'), icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { href: '/inventory', label: $t('common.navigation.inventory'), icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { href: '/selling', label: $t('common.navigation.selling'), icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
    { href: '/finance', label: $t('common.navigation.financial'), icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M3 12h18M3 12v-1a2 2 0 012-2h14a2 2 0 012 2v1M3 12v7a2 2 0 002 2h14a2 2 0 002-2v-7' },
    { href: '/settings', label: $t('common.navigation.settings'), icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
  ];
  // Determine the active navigation item by finding the longest matching path prefix.
  $: activeHref = navigationItems
    .map(item => item.href)
    .filter(href => {
      if (href === '/') {
        // The root path should only be active if it's an exact match.
        return $page.url.pathname === '/';
      }
      // For other paths, check if the current path starts with the nav href.
      return $page.url.pathname.startsWith(href);
    })
    .reduce((bestMatch, currentHref) => {
      // The longest match is the most specific one.
      if (currentHref.length > bestMatch.length) {
        return currentHref;
      }
      return bestMatch;
    }, ($page.url.pathname === '/') ? '/' : '');

  $: getActiveClass = (itemHref) => {
    return itemHref === activeHref ? 
      'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 shadow-inner' : 
      'text-gray-700 hover:bg-gray-100 hover:text-gray-900';
  };
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
  <div class="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
    <!-- Sticky Glassmorphic Header -->
    <header class="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg shadow-black/5">
      <div class="max-w-7xl mx-auto px-6 py-4">
        <div class="flex justify-between items-center">
          <!-- Logo/Brand -->
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 class="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {$t('common.app.title')}
            </h1>
          </div>
          
          <!-- Mobile menu button -->
          <div class="md:hidden">
            <button 
              on:click={toggleMobileMenu}
              class="text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-md p-2"
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
          <nav class="hidden md:flex items-center space-x-1">
            {#each navigationItems as item (item.href)}
              <a 
                href={item.href} 
                class={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${getActiveClass(item.href)}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
                </svg>
                <span>{item.label}</span>
              </a>
            {/each}
            
            <!-- User dropdown/logout -->
            <div class="relative ml-2">
              <button 
                class="flex items-center space-x-1 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                on:click={logout}
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span class="text-sm font-medium text-gray-700 hidden lg:inline">{$t('common.actions.logout')}</span>
              </button>
            </div>
          </nav>
        </div>
        
        <!-- Mobile Navigation Menu -->
        {#if isMobileMenuOpen}
          <div class="md:hidden mt-4 pt-4 border-t border-gray-200/50 animate-fly" transition:fly={{ y: -20, duration: 200 }}>
            <nav class="flex flex-col space-y-2">
              {#each navigationItems as item (item.href)}
                <a 
                  href={item.href} 
                  class={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-3 ${getActiveClass(item.href)}`}
                  on:click={() => isMobileMenuOpen = false}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
                  </svg>
                  <span>{item.label}</span>
                </a>
              {/each}
              
              <button 
                on:click={logout}
                class="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors flex items-center gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>{$t('common.actions.logout')}</span>
              </button>
            </nav>
          </div>
        {/if}
      </div>
    </header>
    
    <!-- Main Content -->
    <main class="flex-grow max-w-7xl mx-auto w-full px-6 py-6" transition:fly={{ y: 20, duration: 300, easing: cubicOut }}>
      {#if isLoggedIn && currentRoute !== '/'}
        <Breadcrumbs />
      {/if}
      <slot />
    </main>
    
    <!-- Footer -->
    <footer class="bg-white/80 backdrop-blur-sm border-t border-white/20 py-4 mt-8">
      <div class="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm">
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
<EnhancedToast />
<CommandPalette />
<KeyboardShortcutsHelp />

<!-- Update Notification -->
<UpdateNotification 
  bind:show={showUpdateNotification}
  version={updateVersion}
  releaseNotes={updateReleaseNotes}
  downloadProgress={updateDownloadProgress}
  installing={updateInstalling}
  on:install={handleInstallUpdate}
  on:dismiss={handleDismissUpdate}
/>

<!-- Debug Error Box -->
<DebugErrorBox 
  bind:this={debugBoxComponent}
  bind:errors={debugErrors}
  title="Update Debug Log"
/>