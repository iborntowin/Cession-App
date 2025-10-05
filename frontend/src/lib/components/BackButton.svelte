<script>
  import { goto } from '$app/navigation';
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  
  export let href = '/';
  export let label = 'Back';
  export let variant = 'default'; // 'default', 'minimal', 'pill'
  
  function handleClick() {
    goto(href);
  }
</script>

<button
  on:click={handleClick}
  class="group inline-flex items-center space-x-2 transition-all duration-300 ease-out
         {variant === 'pill' ? 'px-4 py-2 bg-white/80 hover:bg-white backdrop-blur-md rounded-full shadow-lg hover:shadow-xl border border-gray-200/50' : 
          variant === 'minimal' ? 'px-3 py-2 hover:bg-gray-100/50 rounded-xl' :
          'px-4 py-2 bg-gradient-to-r from-gray-50 to-white hover:from-white hover:to-gray-50 rounded-xl shadow-sm hover:shadow-md border border-gray-200/50'}"
  in:fly={{ x: -20, duration: 400, easing: quintOut }}
>
  <!-- Animated Back Arrow -->
  <div class="relative w-5 h-5 flex items-center justify-center">
    <svg 
      class="w-5 h-5 text-gray-700 group-hover:text-blue-600 transition-all duration-300 group-hover:-translate-x-1 group-hover:scale-110" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        stroke-width="2.5" 
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
      />
    </svg>
    
    <!-- Animated circle background on hover -->
    <div class="absolute inset-0 bg-blue-50 rounded-full scale-0 group-hover:scale-150 transition-transform duration-300 -z-10 opacity-0 group-hover:opacity-100"></div>
  </div>
  
  <!-- Label Text -->
  <span class="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
    {label}
  </span>
  
  <!-- Optional subtle glow effect -->
  <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400/0 via-blue-400/5 to-purple-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
</button>

<style>
  button {
    position: relative;
    overflow: hidden;
  }
  
  /* Smooth press effect */
  button:active {
    transform: scale(0.98);
    transition: transform 0.1s ease;
  }
  
  /* iOS-style tap feedback */
  @media (hover: none) {
    button:active {
      background-color: rgba(0, 0, 0, 0.05);
    }
  }
</style>
