<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  
  const dispatch = createEventDispatcher();
  
  export let version = '';
  export let releaseNotes = '';
  export let downloadProgress = 0;
  export let installing = false;
  export let show = false;
  
  let expanded = false;
  let autoHideTimer = null;
  
  $: isDownloading = downloadProgress > 0 && downloadProgress < 100 && !installing;
  $: isInstalling = installing;
  
  onMount(() => {
    if (show && !isDownloading && !isInstalling) {
      // Auto-hide notification after 10 seconds if user doesn't interact
      autoHideTimer = setTimeout(() => {
        show = false;
      }, 10000);
    }
    
    return () => {
      if (autoHideTimer) clearTimeout(autoHideTimer);
    };
  });
  
  function handleInstall() {
    if (autoHideTimer) clearTimeout(autoHideTimer);
    dispatch('install');
  }
  
  function handleDismiss() {
    if (autoHideTimer) clearTimeout(autoHideTimer);
    dispatch('dismiss');
    show = false;
  }
  
  function toggleExpanded() {
    if (autoHideTimer) clearTimeout(autoHideTimer);
    expanded = !expanded;
  }
</script>

{#if show}
  <div 
    class="notification-container"
    transition:fly="{{ y: -100, duration: 400 }}"
  >
    <div class="notification-card" class:expanded>
      <!-- Header -->
      <div class="notification-header">
        <div class="icon-container">
          {#if isDownloading}
            <svg class="icon downloading" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
          {:else if isInstalling}
            <svg class="icon installing" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle class="spinner" cx="12" cy="12" r="10" stroke-width="3" />
            </svg>
          {:else}
            <svg class="icon update" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
          {/if}
        </div>
        
        <div class="notification-content">
          <div class="notification-title">
            {#if isDownloading}
              Downloading Update {version}
            {:else if isInstalling}
              Installing Update {version}
            {:else}
              Update Available: Version {version}
            {/if}
          </div>
          
          {#if isDownloading}
            <div class="notification-subtitle">
              {downloadProgress}% complete
            </div>
          {:else if isInstalling}
            <div class="notification-subtitle">
              Please wait while we update your application...
            </div>
          {:else}
            <div class="notification-subtitle">
              A new version of Cession Management App is ready to install
            </div>
          {/if}
        </div>
        
        {#if !isDownloading && !isInstalling}
          <button class="close-button" on:click={handleDismiss} aria-label="Dismiss">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        {/if}
      </div>
      
      <!-- Progress Bar -->
      {#if isDownloading || isInstalling}
        <div class="progress-container">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              class:indeterminate={isInstalling}
              style="width: {isInstalling ? '100%' : `${downloadProgress}%`}"
            ></div>
          </div>
        </div>
      {/if}
      
      <!-- Release Notes (Expandable) -->
      {#if releaseNotes && !isDownloading && !isInstalling}
        <div class="release-notes-section">
          <button class="expand-button" on:click={toggleExpanded}>
            <span>What's new</span>
            <svg 
              class="expand-icon" 
              class:rotated={expanded}
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          
          {#if expanded}
            <div class="release-notes-content" transition:fade="{{ duration: 200 }}">
              {releaseNotes}
            </div>
          {/if}
        </div>
      {/if}
      
      <!-- Actions -->
      {#if !isDownloading && !isInstalling}
        <div class="notification-actions">
          <button class="action-button secondary" on:click={handleDismiss}>
            Later
          </button>
          <button class="action-button primary" on:click={handleInstall}>
            <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Install Now
          </button>
        </div>
      {/if}
      
      {#if isInstalling}
        <div class="notification-footer">
          <p class="footer-text">
            ⚠️ Please don't close the application during installation
          </p>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .notification-container {
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 9999;
    max-width: 420px;
    pointer-events: auto;
  }
  
  .notification-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    box-shadow: 0 20px 50px rgba(102, 126, 234, 0.4), 
                0 10px 20px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    animation: slideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    transition: all 0.3s ease;
  }
  
  .notification-card.expanded {
    max-height: 600px;
  }
  
  @keyframes slideIn {
    from {
      transform: translateY(-100px) scale(0.9);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }
  
  .notification-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 20px;
    position: relative;
  }
  
  .icon-container {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(10px);
  }
  
  .icon {
    width: 28px;
    height: 28px;
    color: white;
  }
  
  .icon.downloading {
    animation: bounce 1.5s ease-in-out infinite;
  }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
  
  .icon.installing .spinner {
    stroke-dasharray: 50;
    stroke-dashoffset: 0;
    animation: spin 1.5s linear infinite;
    fill: none;
  }
  
  @keyframes spin {
    to { stroke-dashoffset: -100; }
  }
  
  .notification-content {
    flex: 1;
    min-width: 0;
  }
  
  .notification-title {
    font-size: 16px;
    font-weight: 600;
    color: white;
    margin-bottom: 4px;
    line-height: 1.4;
  }
  
  .notification-subtitle {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.85);
    line-height: 1.4;
  }
  
  .close-button {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.15);
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
  }
  
  .close-button:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: scale(1.05);
  }
  
  .close-button svg {
    width: 18px;
    height: 18px;
    color: white;
  }
  
  .progress-container {
    padding: 0 20px 16px;
  }
  
  .progress-bar {
    height: 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #48ff91, #00d4ff);
    border-radius: 3px;
    transition: width 0.3s ease;
    box-shadow: 0 0 10px rgba(72, 255, 145, 0.5);
  }
  
  .progress-fill.indeterminate {
    animation: indeterminate 1.5s ease-in-out infinite;
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(255, 255, 255, 0.4) 50%, 
      transparent 100%
    );
    background-size: 200% 100%;
  }
  
  @keyframes indeterminate {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  
  .release-notes-section {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0 20px;
  }
  
  .expand-button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    background: none;
    border: none;
    color: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s ease;
  }
  
  .expand-button:hover {
    opacity: 0.8;
  }
  
  .expand-icon {
    width: 20px;
    height: 20px;
    transition: transform 0.3s ease;
  }
  
  .expand-icon.rotated {
    transform: rotate(180deg);
  }
  
  .release-notes-content {
    padding-bottom: 16px;
    font-size: 13px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.9);
    max-height: 150px;
    overflow-y: auto;
  }
  
  .release-notes-content::-webkit-scrollbar {
    width: 6px;
  }
  
  .release-notes-content::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
  
  .release-notes-content::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }
  
  .notification-actions {
    display: flex;
    gap: 8px;
    padding: 16px 20px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .action-button {
    flex: 1;
    padding: 12px 20px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  
  .action-button.secondary {
    background: rgba(255, 255, 255, 0.15);
    color: white;
    backdrop-filter: blur(10px);
  }
  
  .action-button.secondary:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: translateY(-1px);
  }
  
  .action-button.primary {
    background: white;
    color: #667eea;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .action-button.primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }
  
  .action-button.primary:active {
    transform: translateY(0);
  }
  
  .button-icon {
    width: 18px;
    height: 18px;
  }
  
  .notification-footer {
    padding: 12px 20px;
    background: rgba(0, 0, 0, 0.2);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .footer-text {
    margin: 0;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.9);
    text-align: center;
  }
  
  /* Responsive adjustments */
  @media (max-width: 480px) {
    .notification-container {
      left: 12px;
      right: 12px;
      top: 12px;
      max-width: none;
    }
    
    .notification-title {
      font-size: 14px;
    }
    
    .notification-subtitle {
      font-size: 13px;
    }
  }
  
  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .notification-card,
    .icon.downloading,
    .progress-fill,
    .expand-icon,
    .action-button {
      animation: none;
      transition: none;
    }
  }
</style>
