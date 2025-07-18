<script>
  import { createEventDispatcher } from 'svelte';
  import { showAlert, loading } from '$lib/stores';
  import * as api from '$lib/api';

  const dispatch = createEventDispatcher();

  export let showModal = false;

  let categories = [];
  let newCategoryName = '';
  let newCategoryDescription = '';
  let editingCategoryId = null;
  let editingCategoryName = '';
  let editingCategoryDescription = '';
  let error = null;

  $: if (showModal) {
    loadCategories();
    // Reset form when modal opens
    newCategoryName = '';
    newCategoryDescription = '';
    editingCategoryId = null;
    editingCategoryName = '';
    editingCategoryDescription = '';
    error = null;
  }

  async function loadCategories() {
    $loading = true;
    error = null;
    try {
      const result = await api.categories.getAll();
      if (result.success) {
        categories = result.data;
      } else {
        error = result.error || 'Failed to load categories.';
        showAlert(error, 'error');
      }
    } catch (err) {
      error = 'Error loading categories: ' + err.message;
      showAlert(error, 'error');
    } finally {
      $loading = false;
    }
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) {
      error = 'Category name cannot be empty.';
      return;
    }
    $loading = true;
    error = null;
    try {
      const result = await api.categories.create({ name: newCategoryName, description: newCategoryDescription });
      if (result.success) {
        showAlert('Category added successfully!', 'success');
        newCategoryName = '';
        newCategoryDescription = '';
        await loadCategories();
      } else {
        error = result.error || 'Failed to add category.';
        showAlert(error, 'error');
      }
    } catch (err) {
      error = 'Error adding category: ' + err.message;
      showAlert(error, 'error');
    } finally {
      $loading = false;
    }
  }

  function startEdit(category) {
    editingCategoryId = category.id;
    editingCategoryName = category.name;
    editingCategoryDescription = category.description;
    error = null;
  }

  async function handleUpdateCategory(categoryId) {
    if (!editingCategoryName.trim()) {
      error = 'Category name cannot be empty.';
      return;
    }
    $loading = true;
    error = null;
    try {
      const result = await api.categories.update(categoryId, { name: editingCategoryName, description: editingCategoryDescription });
      if (result.success) {
        showAlert('Category updated successfully!', 'success');
        editingCategoryId = null;
        editingCategoryName = '';
        editingCategoryDescription = '';
        await loadCategories();
      } else {
        error = result.error || 'Failed to update category.';
        showAlert(error, 'error');
      }
    } catch (err) {
      error = 'Error updating category: ' + err.message;
      showAlert(error, 'error');
    } finally {
      $loading = false;
    }
  }

  async function handleDeleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category? This cannot be undone.')) {
      return;
    }
    $loading = true;
    error = null;
    try {
      const result = await api.categories.delete(categoryId);
      if (result.success) {
        showAlert('Category deleted successfully!', 'success');
        await loadCategories();
      } else {
        error = result.error || 'Failed to delete category.';
        showAlert(error, 'error');
      }
    } catch (err) {
      error = 'Error deleting category: ' + err.message;
      showAlert(error, 'error');
    } finally {
      $loading = false;
    }
  }

  function closeModal() {
    dispatch('close');
  }
</script>

{#if showModal}
  <div class="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in">
    <div class="bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-xl shadow-2xl w-full max-w-2xl transform scale-95 animate-zoom-in border border-primary-500">
      <div class="p-6 border-b border-gray-700 flex justify-between items-center">
        <h2 class="text-2xl font-bold text-primary-300">Manage Categories</h2>
        <button on:click={closeModal} class="text-gray-400 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-6">
        {#if error}
          <div class="bg-red-800 text-white p-3 rounded-md mb-4 text-sm">{error}</div>
        {/if}

        <!-- Add New Category -->
        <div class="mb-8">
          <h3 class="text-xl font-semibold mb-4 text-primary-400">Add New Category</h3>
          <form on:submit|preventDefault={handleAddCategory} class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="newCategoryName" class="block text-sm font-medium text-gray-300 mb-1">Category Name</label>
              <input
                type="text"
                id="newCategoryName"
                bind:value={newCategoryName}
                class="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., Electronics"
                required
              />
            </div>
            <div>
              <label for="newCategoryDescription" class="block text-sm font-medium text-gray-300 mb-1">Description (Optional)</label>
              <input
                type="text"
                id="newCategoryDescription"
                bind:value={newCategoryDescription}
                class="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., Gadgets and accessories"
              />
            </div>
            <div class="md:col-span-2 text-right">
              <button
                type="submit"
                class="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-md font-semibold transition-colors duration-200"
                disabled={$loading}
              >
                {#if $loading}
                  <span class="inline-block animate-spin mr-2">⟳</span>
                {/if}
                Add Category
              </button>
            </div>
          </form>
        </div>

        <!-- Existing Categories List -->
        <div>
          <h3 class="text-xl font-semibold mb-4 text-primary-400">Existing Categories</h3>
          {#if categories.length === 0}
            <p class="text-gray-400 text-center py-4">No categories found. Add one above!</p>
          {:else}
            <div class="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {#each categories as category (category.id)}
                <div class="bg-gray-700 p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  {#if editingCategoryId === category.id}
                    <!-- Edit form -->
                    <div class="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                      <div>
                        <input
                          type="text"
                          bind:value={editingCategoryName}
                          class="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:ring-primary-500 focus:border-primary-500"
                          required
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          bind:value={editingCategoryDescription}
                          class="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                    <div class="flex gap-2 mt-3 md:mt-0">
                      <button on:click={() => handleUpdateCategory(category.id)} class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm font-semibold transition-colors duration-200" disabled={$loading}>Save</button>
                      <button on:click={() => editingCategoryId = null} class="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-md text-sm font-semibold transition-colors duration-200" disabled={$loading}>Cancel</button>
                    </div>
                  {:else}
                    <!-- Display mode -->
                    <div class="flex-grow">
                      <h4 class="font-semibold text-lg text-primary-200">{category.name}</h4>
                      <p class="text-gray-400 text-sm">{category.description || 'No description'}</p>
                    </div>
                    <div class="flex gap-2 mt-3 md:mt-0">
                      <button on:click={() => startEdit(category)} class="text-primary-400 hover:text-primary-200 text-sm font-medium transition-colors duration-200" disabled={$loading}>Edit</button>
                      <button on:click={() => handleDeleteCategory(category.id)} class="text-red-500 hover:text-red-400 text-sm font-medium transition-colors duration-200" disabled={$loading}>Delete</button>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <div class="p-6 border-t border-gray-700 flex justify-end">
        <button
          on:click={closeModal}
          class="bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 rounded-md font-semibold transition-colors duration-200"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Custom scrollbar for better aesthetics */
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: #374151; /* gray-700 */
    border-radius: 10px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #60a5fa; /* primary-400 */
    border-radius: 10px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #3b82f6; /* primary-500 */
  }

  /* Animations */
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .animate-fade-in {
    animation: fade-in 0.3s ease-out forwards;
  }

  @keyframes zoom-in {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  .animate-zoom-in {
    animation: zoom-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  }
</style> 