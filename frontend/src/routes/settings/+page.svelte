<script>
  import { language } from '$lib/stores/language';
  import { t } from '$lib/i18n';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import ExportStatusCard from '$lib/components/ExportStatusCard.svelte';
  import { fade, fly, scale, slide } from 'svelte/transition';

  let selectedLanguage = 'en';
  let languages = language.getLanguages();
  let currentLanguage;
  let pageVisible = false;

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

  onMount(() => {
    // Set initial direction and language
    if (browser && currentLanguage) {
      document.documentElement.dir = currentLanguage.isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = currentLanguage.code;
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
</script>

<svelte:head>
  <title>{$t('common.navigation.settings')} - Cession Management</title>
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
            {$t('common.settings.title')}
          </h1>
          <p class="text-gray-600 font-medium text-lg">
            {$t('common.settings.description')}
          </p>
        </div>
      {/if}

    <!-- Settings Content -->
    <div class="space-y-6">
      <!-- Language Settings Card -->
      <div class="card">
        <div class="flex items-center gap-3 mb-6">
          <div class="p-2 bg-primary-100 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-semibold text-gray-900">{$t('common.settings.language_settings.title')}</h2>
            <p class="text-sm text-gray-600">{$t('common.settings.language_settings.description')}</p>
          </div>
        </div>

        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            {#each languages as lang}
              <label class="relative cursor-pointer">
                <input
                  type="radio"
                  name="language"
                  value={lang.code}
                  bind:group={selectedLanguage}
                  on:change={handleLanguageChange}
                  class="sr-only"
                />
                <div class="border-2 rounded-lg p-4 transition-all duration-200 hover:shadow-md {
                  selectedLanguage === lang.code 
                    ? 'border-primary-500 bg-primary-50 shadow-md' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }">
                  <div class="flex items-center gap-3">
                    <span class="text-2xl">{getFlagEmoji(lang.code)}</span>
                    <div class="flex-1">
                      <div class="font-medium text-gray-900">{lang.name}</div>
                      <div class="text-sm text-gray-500">{$t(`common.language.${lang.code}`)}</div>
                    </div>
                    {#if selectedLanguage === lang.code}
                      <div class="text-primary-600">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                        </svg>
                      </div>
                    {/if}
                  </div>
                  {#if lang.isRTL}
                    <div class="mt-2 text-xs text-gray-500 flex items-center gap-1">
                      
                    </div>
                  {/if}
                </div>
              </label>
            {/each}
          </div>

          <!-- Current Selection Info -->
          {#if currentLanguage}
            <div class="mt-6 p-4 bg-gray-50 rounded-lg">
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{$t('common.settings.language_settings.current_selection')}: <strong>{currentLanguage.name}</strong></span>
                {#if currentLanguage.isRTL}
                  <span class="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">RTL</span>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Mobile Data Export & Sync -->
      <ExportStatusCard />
    </div>
  </div>
</div>

<style>
  /* Custom styles for better RTL support */
  :global([dir="rtl"]) .card {
    text-align: right;
  }
  
  :global([dir="rtl"]) .flex {
    flex-direction: row-reverse;
  }
  
  :global([dir="rtl"]) .gap-3 > * + * {
    margin-right: 0.75rem;
    margin-left: 0;
  }
</style>