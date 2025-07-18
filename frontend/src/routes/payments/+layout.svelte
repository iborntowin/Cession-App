<script>
  import { page } from '$app/stores';
</script>

<div class="min-h-screen bg-gray-50">
  <div class="py-4 px-4 mx-auto">
    <nav class="mdc-typography--body2 mb-4 flex items-center gap-2">
      <a href="/" class="text-primary hover:underline">Home</a>
      <span class="text-gray-500">/</span>
      <span class="text-gray-700">Payments</span>
    </nav>
    
    <slot />
  </div>
</div>