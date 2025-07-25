<script>
  import { createEventDispatcher } from 'svelte';
  import { showAlert, loading } from '$lib/stores';
  import { api } from '$lib/api';
  import { fade, fly, scale, slide } from 'svelte/transition';

  export let show = false;
  export let newOrEditedCategory = { id: null, name: '' };

  const dispatch = createEventDispatcher();

  let isSaving = false;
  let allCategories = [];
  let selectedCategoryForEdit = null;
  let formVisible = false;

  $: if (show) {
    loadAllCategories();
    // Trigger form animation
    setTimeout(() => {
      formVisible = true;
    }, 100);
  } else {
    formVisible = false;
  }

  async function loadAllCategories() {
    $loading = true;
    try {
      const response = await api.categories.getAll();
      if (response.success) {
        allCategories = response.data;
      } else {
        showAlert(response.error || 'Failed to load categories', 'error');
      }
    } catch (error) {
      showAlert(`Error loading categories: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      $loading = false;
    }
  }

  async function handleSubmit() {
    isSaving = true;
    try {
      if (newOrEditedCategory.id) {
        // Update existing category
        const result = await api.categories.update(newOrEditedCategory.id, newOrEditedCategory);
        if (result.success) {
          showAlert('Category updated successfully!', 'success');
        } else {
          throw new Error(result.error);
        }
      } else {
        // Create new category
        const result = await api.categories.create(newOrEditedCategory);
        if (result.success) {
          showAlert('Category created successfully!', 'success');
        } else {
          throw new Error(result.error);
        }
      }
      dispatch('save');
      newOrEditedCategory = { id: null, name: '' }; // Reset form
      selectedCategoryForEdit = null; // Clear selected for edit
      await loadAllCategories(); // Reload categories list
    } catch (error) {
      console.error('Error saving category:', error);
      showAlert(`Error saving category: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      isSaving = false;
    }
  }

  function handleEditClick(category) {
    newOrEditedCategory = { ...category };
    selectedCategoryForEdit = category; // Set the category being edited
  }

  async function handleDeleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category? This cannot be undone.')) {
      return;
    }
    $loading = true;
    try {
      const result = await api.categories.delete(categoryId);
      if (result.success) {
        showAlert('Category deleted successfully!', 'success');
        await loadAllCategories();
        if (selectedCategoryForEdit && selectedCategoryForEdit.id === categoryId) {
          newOrEditedCategory = { id: null, name: '' };
          selectedCategoryForEdit = null;
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      showAlert(`Error deleting category: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      $loading = false;
    }
  }

  function clearForm() {
    newOrEditedCategory = { id: null, name: '' };
    selectedCategoryForEdit = null;
  }

  function closeModal() {
    show = false;
    clearForm();
  }
</script>

{#if show}
  <!-- Enhanced Modal Background with Glassmorphism -->
  <div class="fixed inset-0 bg-gradient-to-br from-slate-900/90 via-blue-900/80 to-indigo-900/90 backdrop-blur-sm flex items-center justify-center z-50 p-4" in:fade={{ duration: 300 }}>
    <!-- Animated Background Elements -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl animate-pulse"></div>
      <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl animate-pulse" style="animation-delay: 2s;"></div>
    </div>

    {#if formVisible}
      <div class="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-4xl border border-white/20 overflow-hidden" in:scale={{ duration: 500, start: 0.95 }}>
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
                  Category Management
                </h2>
                <p class="text-gray-600 text-sm">Organize your inventory with custom categories</p>
              </div>
            </div>
            <button 
              on:click={closeModal} 
              class="w-10 h-10 bg-white/80 hover:bg-white rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all duration-200 shadow-sm hover:shadow-md"
              aria-label="Close modal"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Main Content -->
        <div class="p-8">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Existing Categories List -->
            <div class="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
              <div class="flex items-center space-x-3 mb-6">
                <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z"/>
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-900">Existing Categories</h3>
                {#if allCategories.length > 0}
                  <div class="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {allCategories.length} {allCategories.length === 1 ? 'category' : 'categories'}
                  </div>
                {/if}
              </div>

              {#if $loading}
                <div class="flex items-center justify-center py-12">
                  <div class="flex items-center space-x-3">
                    <div class="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                    <span class="text-gray-600 font-medium">Loading categories...</span>
                  </div>
                </div>
              {:else if allCategories.length > 0}
                <div class="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {#each allCategories as cat (cat.id)}
                    <div class="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 hover:shadow-md transition-all duration-200 {selectedCategoryForEdit && selectedCategoryForEdit.id === cat.id ? 'ring-2 ring-emerald-500 bg-emerald-50/80' : ''}" in:fly={{ y: 20, duration: 300 }}>
                      <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                          <div class="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
                            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                            </svg>
                          </div>
                          <span class="font-semibold text-gray-900">{cat.name}</span>
                        </div>
                        <div class="flex space-x-2">
                          <button
                            type="button"
                            on:click={() => handleEditClick(cat)}
                            class="flex items-center space-x-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors duration-200 text-sm"
                            aria-label="Edit {cat.name}"
                          >
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            on:click={() => handleDeleteCategory(cat.id)}
                            class="flex items-center space-x-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium transition-colors duration-200 text-sm"
                            aria-label="Delete {cat.name}"
                          >
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
                <button
                  type="button"
                  on:click={clearForm}
                  class="mt-4 w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                  aria-label="Add new category"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                  </svg>
                  <span>Add New Category</span>
                </button>
              {:else}
                <div class="text-center py-12">
                  <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z"/>
                    </svg>
                  </div>
                  <p class="text-gray-500 font-medium">No categories found</p>
                  <p class="text-gray-400 text-sm mt-1">Add one below!</p>
                </div>
              {/if}
            </div>

            <!-- Add/Edit Category Form -->
            <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200/50">
              <div class="flex items-center space-x-3 mb-6">
                <div class="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="{selectedCategoryForEdit ? 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' : 'M12 6v6m0 0v6m0-6h6m-6 0H6'}"/>
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-900">
                  {selectedCategoryForEdit ? 'Edit Category' : 'Add New Category'}
                </h3>
              </div>
              
              <form on:submit|preventDefault={handleSubmit} class="space-y-6">
                <!-- Category Name Field -->
                <div class="space-y-2">
                  <label for="category-name" class="block text-sm font-semibold text-gray-700">
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
                      id="category-name"
                      bind:value={newOrEditedCategory.name}
                      class="w-full pl-12 pr-4 py-3 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 hover:bg-white"
                      placeholder="Enter category name"
                      required
                      aria-required="true"
                    />
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex justify-end space-x-3">
                  {#if selectedCategoryForEdit}
                    <button
                      type="button"
                      on:click={clearForm}
                      class="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors duration-200"
                    >
                      Cancel
                    </button>
                  {/if}
                  <button
                    type="submit"
                    disabled={isSaving}
                    class="group relative flex justify-center items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium border border-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-busy={isSaving}
                  >
                    {#if isSaving}
                      <div class="flex items-center space-x-3">
                        <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Saving...</span>
                      </div>
                    {:else}
                      <div class="flex items-center space-x-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        <span>Save Category</span>
                      </div>
                    {/if}
                  </button>
                </div>
              </form>
            </div>
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

  /* Ring focus styles */
  .ring-2 {
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.5);
  }

  /* Enhanced button hover effects */
  button:hover {
    transform: translateY(-1px);
  }

  button:active {
    transform: translateY(0);
  }

  /* Improved card hover effects */
  .hover\:shadow-md:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  /* Loading state improvements */
  .disabled\:opacity-50:disabled {
    opacity: 0.5;
  }

  .disabled\:cursor-not-allowed:disabled {
    cursor: not-allowed;
  }
</style>