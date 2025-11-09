<script>
  import { language } from '$lib/stores/language';
  import { t } from '$lib/i18n';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import ExportStatusCard from '$lib/components/ExportStatusCard.svelte';
  import UpdateStatusCard from '$lib/components/UpdateStatusCard.svelte';
  import DatabaseSyncCard from '$lib/components/DatabaseSyncCard.svelte';
  import { fade, fly, scale, slide } from 'svelte/transition';
  import { checkForUpdates, getCurrentVersion } from '$lib/updater';

  let selectedLanguage = 'en';
  let languages = language.getLanguages();
  let currentLanguage;
  let pageVisible = false;
  let checkingUpdates = false;
  let appVersion = '...'; // Will be loaded asynchronously
  
  // Update progress tracking
  let updateStatus = ''; // Status message
  let updateProgress = 0; // 0-100
  let updateError = null; // Error details
  let updateAvailable = false; // Whether update is available
  let updateInfo = null; // Update details (version, notes, etc.)

  // Subscribe to language changes
  const unsubscribe = language.subscribe(lang => {
    currentLanguage = lang;
    selectedLanguage = lang.code;
    
    // Update document direction for RTL support
    if (browser) {
      document.documentElement.dir = lang.isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = lang.code;
    }
  });

  onMount(async () => {
    // Set initial direction and language
    if (browser && currentLanguage) {
      document.documentElement.dir = currentLanguage.isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = currentLanguage.code;
    }
    
    // Load current app version
    try {
      appVersion = await getCurrentVersion();
    } catch (error) {
      console.error('Failed to load app version:', error);
      appVersion = '1.0.0';
    }
    
    // Trigger page animation
    setTimeout(() => {
      pageVisible = true;
    }, 100);
    
    return () => {
      unsubscribe();
    };
  });

  function handleLanguageChange(event) {
    const langCode = event.target.value;
    selectedLanguage = langCode;
    language.setLanguage(langCode);
    
    // Store in localStorage
    if (browser) {
      localStorage.setItem('language', langCode);
    }
  }

  function getFlagEmoji(langCode) {
    const flags = {
      'en': '🇬🇧',
      'fr': '🇫🇷',
      'ar': '🇸🇦'
    };
    return flags[langCode] || '🌍';
  }

  async function handleCheckUpdates() {
    checkingUpdates = true;
    updateError = null;
    updateStatus = 'Initializing update check...';
    updateProgress = 5;
    
    try {
      // Import check function from updater plugin
      const { check } = await import('@tauri-apps/plugin-updater');
      const { relaunch } = await import('@tauri-apps/plugin-process');
      
      updateStatus = 'Connecting to update server...';
      updateProgress = 15;
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Update check timed out after 30 seconds')), 30000)
      );
      
      updateStatus = 'Checking for new versions...';
      updateProgress = 30;
      
      const update = await Promise.race([check(), timeoutPromise]);
      
      updateProgress = 50;
      
      console.log('📦 Update check result:', update);
      console.log('📦 Update is null:', update === null);
      console.log('📦 Update available:', update?.available);
      
      // Handle null response (already up to date)
      if (update === null) {
        const currentVer = await getCurrentVersion();
        updateStatus = 'You are on the latest version!';
        updateProgress = 100;
        console.log('✅ Already up to date - version:', currentVer);
        
        // Reset after 3 seconds
        setTimeout(() => {
          updateStatus = '';
          updateProgress = 0;
          checkingUpdates = false;
        }, 3000);
        return;
      }
      
      if (update?.available) {
        updateAvailable = true;
        updateInfo = {
          version: update.version,
          currentVersion: update.currentVersion,
          notes: update.body || 'New features and improvements'
        };
        
        updateStatus = `Update available: v${update.version}`;
        updateProgress = 100;
        
        console.log('✨ Update available:', update.version);
        console.log('📝 Current version:', update.currentVersion);
        console.log('📋 Release notes:', update.body);
        
        // Show update dialog
        const shouldUpdate = confirm(
          `🎉 A new version is available!\n\n` +
          `Current version: ${update.currentVersion}\n` +
          `New version: ${update.version}\n\n` +
          `${update.body || 'New features and improvements included.'}\n\n` +
          `Would you like to download and install it now?\n` +
          `The app will restart after the update.`
        );
        
        if (shouldUpdate) {
          updateStatus = 'Downloading update...';
          updateProgress = 0;
          
          // Download and install with progress
          let downloadProgress = 0;
          await update.downloadAndInstall((progress) => {
            const percent = Math.round((progress.downloaded / progress.total) * 100);
            downloadProgress = percent;
            updateProgress = percent;
            updateStatus = `Downloading update... ${percent}% (${formatBytes(progress.downloaded)} / ${formatBytes(progress.total)})`;
            
            if (percent % 10 === 0) {
              console.log(`⬇️ Download progress: ${percent}%`);
            }
          });
          
          updateStatus = 'Update installed! Restarting...';
          updateProgress = 100;
          
          // Wait for user to see message
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Relaunch the app
          await relaunch();
        } else {
          updateStatus = 'Update cancelled by user';
          updateProgress = 0;
          checkingUpdates = false;
        }
      } else {
        // update exists but available = false (also means up to date)
        const currentVer = update.currentVersion || await getCurrentVersion();
        updateStatus = 'You are on the latest version!';
        updateProgress = 100;
        console.log('✅ No updates available - current version:', currentVer);
        
        // Reset after 3 seconds
        setTimeout(() => {
          updateStatus = '';
          updateProgress = 0;
          checkingUpdates = false;
        }, 3000);
      }
    } catch (error) {
      console.error('❌ Update check failed:', error);
      
      updateError = {
        message: error.message || 'Unknown error',
        details: error.stack || ''
      };
      
      // Provide specific error messages
      if (error.message?.includes('timed out')) {
        updateStatus = 'Update check timed out';
        updateError.message = 'Could not connect to update server within 30 seconds';
      } else if (error.message?.includes('Could not fetch')) {
        updateStatus = 'Could not connect to update server';
        updateError.message = 'Network error - please check your internet connection';
      } else if (error.message?.includes('signature')) {
        updateStatus = 'Update signature verification failed';
        updateError.message = 'Update package signature could not be verified';
      } else {
        updateStatus = 'Update check failed';
      }
      
      updateProgress = 0;
      checkingUpdates = false;
    }
  }
  
  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
</script>

<svelte:head>
  <title>{$t('common.navigation.settings')} - {$t('common.app.title')}</title>
</svelte:head>

<!-- Enhanced Settings Page with Glassmorphism -->
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
  <div class="relative z-10 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      {#if pageVisible}
        <div class="text-center mb-12" in:fly={{ y: -30, duration: 600, delay: 200 }}>
          <!-- Logo/Icon -->
          <div class="mx-auto w-20 h-20 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/25 mb-8">
            <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>

          <!-- Welcome Text -->
          <h1 class="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
            {$t('settings.title')}
          </h1>
          <p class="text-gray-600 font-medium text-lg">
            {$t('settings.description')}
          </p>
        </div>
      {/if}

      <!-- Settings Content -->
      {#if pageVisible}
        <div class="space-y-8">
          <!-- Language Settings Card -->
          <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden" in:scale={{ duration: 500, delay: 400, start: 0.95 }}>
            <!-- Header Section -->
            <div class="bg-gradient-to-r from-emerald-50 to-teal-50 px-8 py-6 border-b border-gray-200/50">
              <div class="flex items-center space-x-4">
                <!-- Language Icon -->
                <div class="w-12 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                </div>
                <div>
                  <h2 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    {$t('settings.language_settings.title')}
                  </h2>
                  <p class="text-gray-600 text-sm">{$t('settings.language_settings.description')}</p>
                </div>
              </div>
            </div>

            <!-- Language Options -->
            <div class="p-8">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                {#each languages as lang, index}
                  <label class="relative cursor-pointer group" in:fly={{ y: 20, duration: 400, delay: 600 + (index * 100) }}>
                    <input
                      type="radio"
                      name="language"
                      value={lang.code}
                      bind:group={selectedLanguage}
                      on:change={handleLanguageChange}
                      class="sr-only"
                    />
                    <div class="relative bg-white/70 backdrop-blur-sm border-2 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:scale-105 group-hover:bg-white {
                      selectedLanguage === lang.code 
                        ? 'border-emerald-500 bg-emerald-50/80 shadow-lg ring-2 ring-emerald-500/20' 
                        : 'border-gray-200 hover:border-emerald-300'
                    }">
                      <div class="flex items-center space-x-4">
                        <div class="text-3xl">{getFlagEmoji(lang.code)}</div>
                        <div class="flex-1">
                          <div class="font-bold text-gray-900 text-lg">{lang.name}</div>
                          <div class="text-sm text-gray-600">{$t(`common.language.${lang.code}`)}</div>
                          {#if lang.isRTL}
                            <div class="mt-2">
                              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {$t('settings.language_settings.rtl_support')}
                              </span>
                            </div>
                          {/if}
                        </div>
                        {#if selectedLanguage === lang.code}
                          <div class="text-emerald-600">
                            <div class="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                              <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        {/if}
                      </div>
                    </div>
                  </label>
                {/each}
              </div>

              <!-- Current Selection Info -->
              {#if currentLanguage}
                <div class="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200/50" in:slide={{ duration: 400, delay: 1000 }}>
                  <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div class="flex-1">
                      <p class="text-sm font-medium text-gray-900">
                        {$t('settings.language_settings.current_selection')}: <span class="font-bold text-blue-700">{currentLanguage.name}</span>
                      </p>
                      <div class="flex items-center space-x-2 mt-1">
                        <span class="text-xs text-gray-600">{$t('settings.language')}</span>
                        {#if currentLanguage.isRTL}
                          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {$t('settings.language_settings.rtl_support')}
                          </span>
                        {/if}
                      </div>
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <!-- Mobile Data Export & Sync Card -->
          <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden" in:scale={{ duration: 500, delay: 600, start: 0.95 }}>
            <ExportStatusCard />
          </div>

          <!-- Database Sync Card -->
          <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden" in:scale={{ duration: 500, delay: 650, start: 0.95 }}>
            <DatabaseSyncCard />
          </div>

          <!-- Software Updates Card -->
          <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden" in:scale={{ duration: 500, delay: 700, start: 0.95 }}>
            <!-- Header -->
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-blue-100/50">
              <div class="flex items-center space-x-4" style="direction: {currentLanguage?.code === 'ar' ? 'rtl' : 'ltr'}">
                <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div>
                  <h2 class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {$t('settings.updates.title')}
                  </h2>
                  <p class="text-sm text-gray-600 mt-1">
                    {$t('settings.updates.subtitle')}
                  </p>
                </div>
              </div>
            </div>

            <!-- Content -->
            <div class="p-8">
              <UpdateStatusCard />
            </div>
          </div>
        </div>
      {/if}

      <!-- Features Preview -->
      {#if pageVisible}
        <div class="grid grid-cols-3 gap-4 mt-12" in:fly={{ y: 30, duration: 600, delay: 1200 }}>
          <div class="bg-white/40 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20 hover:bg-white/60 transition-all duration-300 group">
            <div class="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-300">
              <span class="text-white text-sm">🌍</span>
            </div>
            <p class="text-xs font-medium text-gray-700">{$t('settings.features.multi_language')}</p>
          </div>

          <div class="bg-white/40 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20 hover:bg-white/60 transition-all duration-300 group">
            <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-300">
              <span class="text-white text-sm">📱</span>
            </div>
            <p class="text-xs font-medium text-gray-700">{$t('settings.features.mobile_sync')}</p>
          </div>

          <div class="bg-white/40 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20 hover:bg-white/60 transition-all duration-300 group">
            <div class="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-300">
              <span class="text-white text-sm">⚙️</span>
            </div>
            <p class="text-xs font-medium text-gray-700">{$t('settings.features.preferences')}</p>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  /* Glass morphism enhancements */
  .backdrop-blur-sm {
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  /* Custom focus styles */
  input:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
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

  /* Floating background elements */
  .animate-pulse {
    animation: pulse-slow 6s ease-in-out infinite;
  }

  @keyframes pulse-slow {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.8; }
  }

  /* Enhanced shadows */
  .shadow-emerald-500\/25 {
    box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.25), 0 2px 4px -1px rgba(16, 185, 129, 0.06);
  }

  .shadow-blue-500\/25 {
    box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.25), 0 2px 4px -1px rgba(59, 130, 246, 0.06);
  }

  /* Hover effects */
  .group:hover .group-hover\:scale-110 {
    transform: scale(1.1);
  }

  /* Custom animations */
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }

  /* Custom styles for better RTL support */
  
  :global([dir="rtl"]) .flex {
    flex-direction: row-reverse;
  }
  
  :global([dir="rtl"]) .gap-3 > * + * {
    margin-right: 0.75rem;
    margin-left: 0;
  }

  /* Enhanced button hover effects */

  /* Improved card hover effects */
  .hover\:shadow-lg:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }

  /* Loading state improvements */
</style>