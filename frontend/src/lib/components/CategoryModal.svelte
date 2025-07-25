<script>
  import { createEventDispatcher } from 'svelte';
  import { showAlert, loading } from '$lib/stores';
  import * as api from '$lib/api';
  import { fade, fly, scale, slide } from 'svelte/transition';

  const dispatch = createEventDispatcher();

  export let showModal = false;

  let categories = [];
  let newCategoryName = '';
  let newCategoryDescription = '';
  let editingCategoryId = null;
  let editingCategoryName = '';
  let editingCategoryDescription = '';
  let error = null;
  let formVisible = false;

  $: if (showModal) {
    loadCategories();
    // Reset form when modal opens
    newCategoryName = '';
    newCategoryDescription = '';
    editingCategoryId = null;
    editingCategoryName = '';
    editingCategoryDescription = '';
    error = null;
    
    // Trigger form animation
    setTimeout(() => {
      formVisible = true;
    }, 100);
  } else {
    formVisible = false;
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
  <!-- Enhanced Modal Background with Glassmorphism -->
  <div class="fixed inset-0 bg-gradient-to-br from-slate-900/90 via-blue-900/80 to-indigo-900/90 backdrop-blur-sm flex items-center justify-center z-50 p-4" in:fade={{ duration: 300 }}>
    <!-- Animated Background Elements -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl animate-pulse"></div>
      <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl animate-pulse" style="animation-delay: 2s;"></div>
    </div>

    {#if formVisible}
      <div class="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-3xl border border-white/20 overflow-hidden" in:scale={{ duration: 500, start: 0.95 }}>
        <!-- Header Section -->
        <div class="bg-gradient-to-r from-emerald-50 to-teal-50 px-8 py-6 border-b border-gray-200/50">
          <div class="flex justify-between items-center">
            <div class="flex items-center space-x-4">
              <!-- Category Icon -->
              <div class="w-12 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z"/>
                </svg>
              </div>
              <div>
                <h2 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Manage Categories
                </h2>
                <p class="text-gray-600 text-sm">Organize your inventory with custom categories</p>
              </div>
            </div>
            <button 
              on:click={closeModal} 
              class="w-10 h-10 bg-white/80 hover:bg-white rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Main Content -->
        <div class="p-8 space-y-8">
          <!-- Error Message -->
          {#if error}
            <div class="bg-red-50 border border-red-200 rounded-xl p-4" in:slide={{ duration: 300 }}>
              <div class="flex items-center">
                <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <p class="text-sm text-red-700 font-medium">{error}</p>
              </div>
            </div>
          {/if}

          <!-- Add New Category Section -->
          <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200/50">
            <div class="flex items-center space-x-3 mb-6">
              <div class="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
              </div>
              <h3 class="text-xl font-bold text-gray-900">Add New Category</h3>
            </div>
            
            <form on:submit|preventDefault={handleAddCategory} class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Category Name Field -->
                <div class="space-y-2">
                  <label for="newCategoryName" class="block text-sm font-semibold text-gray-700">
                    Category Name
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="newCategoryName"
                      bind:value={newCategoryName}
                      class="w-full pl-12 pr-4 py-3 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 hover:bg-white"
                      placeholder="e.g., Electronics"
                      required
                    />
                  </div>
                </div>

                <!-- Description Field -->
                <div class="space-y-2">
                  <label for="newCategoryDescription" class="block text-sm font-semibold text-gray-700">
                    Description (Optional)
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/>
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="newCategoryDescription"
                      bind:value={newCategoryDescription}
                      class="w-full pl-12 pr-4 py-3 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 hover:bg-white"
                      placeholder="e.g., Gadgets and accessories"
                    />
                  </div>
                </div>
              </div>

              <!-- Submit Button -->
              <div class="flex justify-end">
                <button
                  type="submit"
                  disabled={$loading}
                  class="group relative flex justify-center items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium border border-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {#if $loading}
                    <div class="flex items-center space-x-3">
                      <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Adding...</span>
                    </div>
                  {:else}
                    <div class="flex items-center space-x-2">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                      </svg>
                      <span>Add Category</span>
                    </div>
                  {/if}
                </button>
              </div>
            </form>
          </div>

          <!-- Existing Categories List -->
          <div class="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
            <div class="flex items-center space-x-3 mb-6">
              <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z"/>
                </svg>
              </div>
              <h3 class="text-xl font-bold text-gray-900">Existing Categories</h3>
              {#if categories.length > 0}
                <div class="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {categories.length} {categories.length === 1 ? 'category' : 'categories'}
                </div>
              {/if}
            </div>

            {#if categories.length === 0}
              <div class="text-center py-12">
                <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z"/>
                  </svg>
                </div>
                <p class="text-gray-500 font-medium">No categories found</p>
                <p class="text-gray-400 text-sm mt-1">Create your first category using the form above</p>
              </div>
            {:else}
              <div class="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {#each categories as category (category.id)}
                  <div class="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-gray-200/50 hover:shadow-md transition-all duration-200" in:fly={{ y: 20, duration: 300 }}>
                    {#if editingCategoryId === category.id}
                      <!-- Edit form -->
                      <div class="space-y-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div class="space-y-2">
                            <label class="block text-sm font-semibold text-gray-700">Category Name</label>
                            <input
                              type="text"
                              bind:value={editingCategoryName}
                              class="w-full px-4 py-2 bg-white/70 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900"
                              required
                            />
                          </div>
                          <div class="space-y-2">
                            <label class="block text-sm font-semibold text-gray-700">Description</label>
                            <input
                              type="text"
                              bind:value={editingCategoryDescription}
                              class="w-full px-4 py-2 bg-white/70 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900"
                            />
                          </div>
                        </div>
                        <div class="flex justify-end space-x-3">
                          <button 
                            on:click={() => editingCategoryId = null} 
                            class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200" 
                            disabled={$loading}
                          >
                            Cancel
                          </button>
                          <button 
                            on:click={() => handleUpdateCategory(category.id)} 
                            class="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md" 
                            disabled={$loading}
                          >
                            {#if $loading}
                              <div class="flex items-center space-x-2">
                                <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Saving...</span>
                              </div>
                            {:else}
                              Save Changes
                            {/if}
                          </button>
                        </div>
                      </div>
                    {:else}
                      <!-- Display mode -->
                      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div class="flex-grow">
                          <div class="flex items-center space-x-3 mb-2">
                            <div class="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
                              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                              </svg>
                            </div>
                            <h4 class="font-bold text-lg text-gray-900">{category.name}</h4>
                          </div>
                          <p class="text-gray-600 text-sm ml-13">{category.description || 'No description provided'}</p>
                        </div>
                        <div class="flex space-x-2">
                          <button 
                            on:click={() => startEdit(category)} 
                            class="flex items-center space-x-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors duration-200 text-sm" 
                            disabled={$loading}
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                            <span>Edit</span>
                          </button>
                          <button 
                            on:click={() => handleDeleteCategory(category.id)} 
                            class="flex items-center space-x-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium transition-colors duration-200 text-sm" 
                            disabled={$loading}
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <!-- Footer -->
        <div class="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-t border-gray-200/50 flex justify-between items-center">
          <div class="flex items-center space-x-2 text-sm text-gray-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>Categories help organize your inventory items</span>
          </div>
          <button
            on:click={closeModal}
            class="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  /* Custom scrollbar for better aesthetics */
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(243, 244, 246, 0.5);
    border-radius: 10px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(to bottom, #10b981, #0d9488);
    border-radius: 10px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(to bottom, #059669, #0f766e);
  }

  /* Glass morphism enhancements */
  .backdrop-blur-sm {
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .backdrop-blur-xl {
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
  }

  /* Custom focus styles */
  input:focus,
  button:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }

  /* Gradient text effect */
  .bg-clip-text {
    -webkit-background-clip: text;
    background-clip: text;
  }

  /* Smooth transitions */
  * {
    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  /* Loading animation */
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  /* Floating background elements */
  .animate-pulse {
    animation: pulse-slow 6s ease-in-out infinite;
  }

  @keyframes pulse-slow {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.8; }
  }

  /* Enhanced shadows */
  .shadow-emerald-500\/25 {
    box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.25), 0 2px 4px -1px rgba(16, 185, 129, 0.06);
  }

  /* Hover effects */
  .group:hover .group-hover\:scale-110 {
    transform: scale(1.1);
  }

  /* Custom animations */
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }

  .animate-float {
    animation: float 3s ease-in-out infinite;
  }
</style> 