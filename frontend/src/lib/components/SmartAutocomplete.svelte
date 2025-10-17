<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  
  export let value = '';
  export let suggestions = [];
  export let placeholder = 'Type to search...';
  export let label = '';
  export let name = '';
  export let required = false;
  export let disabled = false;
  export let maxSuggestions = 5;
  export let learnFromInput = true; // Auto-learn from user inputs
  export let storageKey = ''; // Key for localStorage
  
  const dispatch = createEventDispatcher();
  
  let showSuggestions = false;
  let selectedIndex = 0;
  let filteredSuggestions = [];
  let inputElement;
  let learnedSuggestions = [];
  
  // Load learned suggestions from localStorage
  onMount(() => {
    if (learnFromInput && storageKey && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(`autocomplete_${storageKey}`);
      if (stored) {
        try {
          learnedSuggestions = JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse learned suggestions', e);
        }
      }
    }
  });
  
  // Combine provided suggestions with learned ones
  $: allSuggestions = [...new Set([...suggestions, ...learnedSuggestions])];
  
  // Filter suggestions based on input
  $: {
    if (value && value.length > 0) {
      // Fuzzy matching: case-insensitive, partial match
      const query = value.toLowerCase().trim();
      
      filteredSuggestions = allSuggestions
        .filter(s => s.toLowerCase().includes(query))
        .sort((a, b) => {
          // Prioritize suggestions that start with the query
          const aStarts = a.toLowerCase().startsWith(query);
          const bStarts = b.toLowerCase().startsWith(query);
          
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          
          // Then by length (shorter first)
          return a.length - b.length;
        })
        .slice(0, maxSuggestions);
      
      showSuggestions = filteredSuggestions.length > 0;
      selectedIndex = 0;
    } else {
      // Show recent suggestions when input is empty and focused
      filteredSuggestions = learnedSuggestions.slice(0, maxSuggestions);
      showSuggestions = false;
    }
  }
  
  function handleKeydown(e) {
    if (!showSuggestions || filteredSuggestions.length === 0) {
      if (e.key === 'ArrowDown' && filteredSuggestions.length > 0) {
        e.preventDefault();
        showSuggestions = true;
      }
      return;
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % filteredSuggestions.length;
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = selectedIndex === 0 
          ? filteredSuggestions.length - 1 
          : selectedIndex - 1;
        break;
      case 'Enter':
        if (showSuggestions && filteredSuggestions[selectedIndex]) {
          e.preventDefault();
          selectSuggestion(filteredSuggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        showSuggestions = false;
        break;
      case 'Tab':
        if (showSuggestions && filteredSuggestions[selectedIndex]) {
          e.preventDefault();
          selectSuggestion(filteredSuggestions[selectedIndex]);
        }
        break;
    }
  }
  
  function selectSuggestion(suggestion) {
    value = suggestion;
    showSuggestions = false;
    selectedIndex = 0;
    
    // Learn from selection
    if (learnFromInput && storageKey) {
      learnSuggestion(suggestion);
    }
    
    dispatch('select', suggestion);
    dispatch('input', value);
  }
  
  function learnSuggestion(suggestion) {
    if (!storageKey || typeof localStorage === 'undefined') return;
    
    // Add to learned suggestions (move to front if already exists)
    const filtered = learnedSuggestions.filter(s => s !== suggestion);
    learnedSuggestions = [suggestion, ...filtered].slice(0, 20); // Keep max 20
    
    // Save to localStorage
    try {
      localStorage.setItem(
        `autocomplete_${storageKey}`, 
        JSON.stringify(learnedSuggestions)
      );
    } catch (e) {
      console.error('Failed to save learned suggestions', e);
    }
  }
  
  function handleFocus() {
    if (filteredSuggestions.length > 0) {
      showSuggestions = true;
    }
  }
  
  function handleBlur() {
    // Delay to allow click on suggestion
    setTimeout(() => {
      showSuggestions = false;
      
      // Learn from manual input
      if (value && learnFromInput && storageKey && !allSuggestions.includes(value)) {
        learnSuggestion(value);
      }
    }, 200);
  }
  
  function handleInput(e) {
    const target = e.target;
    value = target.value;
    dispatch('input', value);
  }
  
  function clearInput() {
    value = '';
    showSuggestions = false;
    inputElement?.focus();
    dispatch('input', value);
    dispatch('clear');
  }
</script>

<div class="relative">
  {#if label}
    <label for={name} class="block text-sm font-medium text-gray-700 mb-2">
      {label}
      {#if required}
        <span class="text-red-500">*</span>
      {/if}
    </label>
  {/if}
  
  <div class="relative">
    <input
      bind:this={inputElement}
      type="text"
      {name}
      {placeholder}
      {required}
      {disabled}
      {value}
      on:input={handleInput}
      on:keydown={handleKeydown}
      on:focus={handleFocus}
      on:blur={handleBlur}
      class="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 {disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}"
      autocomplete="off"
    />
    
    <!-- Clear button -->
    {#if value && !disabled}
      <button
        type="button"
        on:click={clearInput}
        class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Clear input"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    {/if}
    
    <!-- Dropdown indicator -->
    {#if filteredSuggestions.length > 0 && !value}
      <div class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
    {/if}
  </div>
  
  <!-- Suggestions dropdown -->
  {#if showSuggestions && filteredSuggestions.length > 0}
    <div
      class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
      transition:slide={{ duration: 200 }}
    >
      {#each filteredSuggestions as suggestion, index}
        <button
          type="button"
          on:click={() => selectSuggestion(suggestion)}
          class="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0 {selectedIndex === index ? 'bg-purple-100 font-medium' : ''}"
        >
          <div class="flex items-center justify-between">
            <span class="text-gray-900">
              {#if value}
                {@html suggestion.replace(
                  new RegExp(value, 'gi'),
                  match => `<mark class="bg-yellow-200 font-semibold">${match}</mark>`
                )}
              {:else}
                {suggestion}
              {/if}
            </span>
            
            {#if selectedIndex === index}
              <svg class="w-4 h-4 text-purple-600 flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
            {/if}
          </div>
        </button>
      {/each}
      
      <!-- Keyboard hints -->
      <div class="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
        <span>↑↓ Navigate • Enter/Tab Select • Esc Close</span>
        {#if learnFromInput}
          <span class="text-purple-600">🧠 Learning enabled</span>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  /* Custom scrollbar for suggestions */
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-track {
    background: #f1f5f9;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
  
  /* Highlight matched text */
  :global(mark) {
    padding: 0 2px;
    border-radius: 2px;
  }
</style>
