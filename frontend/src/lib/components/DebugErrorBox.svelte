<script>
  import { onMount } from 'svelte';
  
  export let errors = [];
  export let title = "Debug Error Log";
  
  let visible = true;
  let expanded = true;
  let autoScroll = true;
  
  function addError(error) {
    const timestamp = new Date().toLocaleTimeString();
    errors = [...errors, { timestamp, message: error, id: Date.now() }];
    if (autoScroll && expanded) {
      setTimeout(() => scrollToBottom(), 100);
    }
  }
  
  function clear() {
    errors = [];
  }
  
  function scrollToBottom() {
    const container = document.getElementById('debug-error-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }
  
  function copyAll() {
    const text = errors.map(e => `[${e.timestamp}] ${e.message}`).join('\n');
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  }
  
  // Export function so parent can call it
  export { addError };
</script>

{#if visible}
  <div class="debug-box" class:expanded>
    <div class="debug-header" on:click={() => expanded = !expanded}>
      <div class="debug-title">
        <span class="debug-icon">🐛</span>
        <span>{title}</span>
        <span class="debug-count">{errors.length}</span>
      </div>
      <div class="debug-controls">
        <button on:click|stopPropagation={copyAll} title="Copy all">📋</button>
        <button on:click|stopPropagation={clear} title="Clear">🗑️</button>
        <button on:click|stopPropagation={() => visible = false} title="Hide">✕</button>
        <span class="expand-icon">{expanded ? '▼' : '▶'}</span>
      </div>
    </div>
    
    {#if expanded}
      <div class="debug-body" id="debug-error-container">
        {#if errors.length === 0}
          <div class="debug-empty">No errors logged yet</div>
        {:else}
          {#each errors as error (error.id)}
            <div class="debug-entry">
              <span class="debug-time">[{error.timestamp}]</span>
              <pre class="debug-message">{error.message}</pre>
            </div>
          {/each}
        {/if}
      </div>
      
      <div class="debug-footer">
        <label>
          <input type="checkbox" bind:checked={autoScroll} />
          Auto-scroll
        </label>
      </div>
    {/if}
  </div>
{/if}

<style>
  .debug-box {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 500px;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 2px solid #ff6b6b;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(255, 107, 107, 0.3);
    z-index: 9999;
    font-family: 'Courier New', monospace;
    max-height: 400px;
    display: flex;
    flex-direction: column;
  }
  
  .debug-box.expanded {
    max-height: 600px;
  }
  
  .debug-header {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
    color: white;
    padding: 12px 16px;
    border-radius: 10px 10px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    user-select: none;
  }
  
  .debug-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: bold;
    font-size: 14px;
  }
  
  .debug-icon {
    font-size: 18px;
  }
  
  .debug-count {
    background: rgba(255, 255, 255, 0.3);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
  }
  
  .debug-controls {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  
  .debug-controls button {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
  }
  
  .debug-controls button:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  .expand-icon {
    font-size: 12px;
    margin-left: 4px;
  }
  
  .debug-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    background: #0f0f1e;
    color: #00ff00;
    font-size: 12px;
    max-height: 450px;
  }
  
  .debug-body::-webkit-scrollbar {
    width: 8px;
  }
  
  .debug-body::-webkit-scrollbar-track {
    background: #1a1a2e;
  }
  
  .debug-body::-webkit-scrollbar-thumb {
    background: #ff6b6b;
    border-radius: 4px;
  }
  
  .debug-empty {
    color: #666;
    text-align: center;
    padding: 20px;
    font-style: italic;
  }
  
  .debug-entry {
    margin-bottom: 8px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    border-left: 3px solid #ff6b6b;
  }
  
  .debug-time {
    color: #ffd93d;
    font-size: 11px;
    margin-right: 8px;
  }
  
  .debug-message {
    margin: 4px 0 0 0;
    color: #00ff00;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: 'Courier New', monospace;
    font-size: 11px;
  }
  
  .debug-footer {
    padding: 8px 12px;
    background: #16213e;
    border-radius: 0 0 10px 10px;
    border-top: 1px solid #ff6b6b;
  }
  
  .debug-footer label {
    color: #fff;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }
  
  .debug-footer input[type="checkbox"] {
    cursor: pointer;
  }
</style>
