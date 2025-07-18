<!-- Document Preview and Edit Page -->
<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { api } from '$lib/api';
    import { showAlert } from '$lib/stores';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import Spinner from '$lib/components/Spinner.svelte';

    let documentContent = '';
    let isEditing = false;
    let isLoading = true;
    let editedContent = '';

    onMount(async () => {
        try {
            const response = await api.get(`/cessions/${$page.params.id}/document`);
            documentContent = response;
            editedContent = response;
            isLoading = false;
        } catch (error) {
            showAlert('Failed to load document', 'error');
            isLoading = false;
        }
    });

    async function saveDocument() {
        try {
            await api.put(`/cessions/${$page.params.id}/document`, editedContent);
            documentContent = editedContent;
            isEditing = false;
            showAlert('Document saved successfully', 'success');
        } catch (error) {
            showAlert('Failed to save document', 'error');
        }
    }

    function printDocument() {
        window.print();
    }
</script>

<PageHeader title="Document Preview" />

<div class="container mx-auto px-4 py-8">
    {#if isLoading}
        <div class="flex justify-center items-center h-64">
            <Spinner />
        </div>
    {:else}
        <div class="bg-white shadow-lg rounded-lg p-6">
            <div class="flex justify-end space-x-4 mb-6">
                {#if isEditing}
                    <button
                        on:click={() => {
                            editedContent = documentContent;
                            isEditing = false;
                        }}
                        class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Cancel
                    </button>
                    <button
                        on:click={saveDocument}
                        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Save Changes
                    </button>
                {:else}
                    <button
                        on:click={() => isEditing = true}
                        class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Edit Document
                    </button>
                    <button
                        on:click={printDocument}
                        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print Document
                    </button>
                {/if}
            </div>

            <div class="border rounded-lg p-6 bg-white">
                {#if isEditing}
                    <textarea
                        bind:value={editedContent}
                        class="w-full h-[800px] p-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    ></textarea>
                {:else}
                    <div class="prose max-w-none">
                        {@html documentContent}
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    @media print {
        .container > div:not(:last-child) {
            display: none;
        }
        .container {
            padding: 0;
        }
    }
</style> 