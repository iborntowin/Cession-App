<script>
  import { language } from '$lib/stores/language';
  import { t } from '$lib/i18n';
  import { browser } from '$app/environment';

  let isOpen = false;
  let languages = language.getLanguages();

  function toggleDropdown() {
    isOpen = !isOpen;
  }

  function handleLanguageSelect(langCode) {
    language.setLanguage(langCode);
    isOpen = false;
  }

  // Close dropdown when clicking outside
  function handleClickOutside(event) {
    const target = event.target;
    if (!target.closest('.language-switcher')) {
      isOpen = false;
    }
  }

  $: if (browser) {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    } else {
      document.removeEventListener('click', handleClickOutside);
    }
  }
</script>

<div class="language-switcher relative">
  <button
    type="button"
    class="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
    on:click={toggleDropdown}
  >
    <span class="text-xl">🌍</span>
    <span class="hidden md:inline">{$t('common.language.select')}</span>
  </button>

  {#if isOpen}
    <div
      class="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50"
      role="menu"
      aria-orientation="vertical"
      aria-labelledby="language-menu"
    >
      <div class="py-1" role="none">
        {#each languages as lang}
          <button
            class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            role="menuitem"
            on:click={() => handleLanguageSelect(lang.code)}
          >
            {#if lang.code === 'en'}
              🇬🇧
            {:else if lang.code === 'fr'}
              🇫🇷
            {:else if lang.code === 'ar'}
              🇲🇦
            {/if}
            <span class="ml-2">{lang.name}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style lang="postcss">
  /* Add any custom styles here */
</style>