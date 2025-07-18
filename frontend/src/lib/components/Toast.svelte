<script>
    import { toast } from '$lib/toast';
    import { fade } from 'svelte/transition';
    import { onDestroy } from 'svelte';

    let timeoutId;

    $: if ($toast) {
        // Clear any existing timeout
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        // Set new timeout
        timeoutId = setTimeout(() => {
            toast.hide();
        }, 3000);
    }

    onDestroy(() => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    });
</script>

{#if $toast}
    <div
        class="fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white 
               { $toast.type === 'success' ? 'bg-green-500' : '' }
               { $toast.type === 'error' ? 'bg-red-500' : '' }
               { $toast.type === 'warning' ? 'bg-yellow-500' : '' }
               { $toast.type === 'info' ? 'bg-blue-500' : '' }"
        transition:fade
    >
        {$toast.message}
    </div>
{/if} 