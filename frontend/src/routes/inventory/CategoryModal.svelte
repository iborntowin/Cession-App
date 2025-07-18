<script>
  import { createEventDispatcher } from 'svelte';
  import { showAlert, loading } from '$lib/stores';
  import { api } from '$lib/api';

  export let show = false;
  export let newOrEditedCategory = { id: null, name: '' };

  const dispatch = createEventDispatcher();

  let isSaving = false;
  let allCategories = [];
  let selectedCategoryForEdit = null;

  $: if (show) {
    loadAllCategories();
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
  <div 
    class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-40" 
    on:click={closeModal}
    role="presentation"
    aria-hidden="true"
  ></div>
  <div 
    class="fixed inset-0 z-50 overflow-y-auto"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
      <div 
        class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-xl sm:p-6"
        on:click|stopPropagation={() => {}}
        on:keydown={(e) => e.key === 'Escape' && closeModal()}
        tabindex="0"
      >
        <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
          <button
            type="button"
            class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            on:click={closeModal}
            aria-label="Close modal"
          >
            <span class="sr-only">Close</span>
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="sm:flex sm:items-start">
          <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
            <h3 id="modal-title" class="text-lg font-medium leading-6 text-gray-900 mb-4">
              Category Management
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Existing Categories List -->
              <div>
                <h4 class="text-md font-semibold text-gray-800 mb-3">Existing Categories</h4>
                {#if $loading}
                  <p>Loading categories...</p>
                {:else if allCategories.length > 0}
                  <ul class="divide-y divide-gray-200 rounded-md border border-gray-200 max-h-60 overflow-y-auto" role="list">
                    {#each allCategories as cat (cat.id)}
                      <li class="py-3 px-4 flex items-center justify-between {selectedCategoryForEdit && selectedCategoryForEdit.id === cat.id ? 'bg-primary-50' : ''}" role="listitem">
                        <span class="text-sm font-medium text-gray-900">{cat.name}</span>
                        <div class="flex space-x-2">
                          <button
                            type="button"
                            on:click={() => handleEditClick(cat)}
                            class="text-primary-600 hover:text-primary-900 text-sm font-medium"
                            aria-label="Edit {cat.name}"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            on:click={() => handleDeleteCategory(cat.id)}
                            class="text-red-600 hover:text-red-900 text-sm font-medium"
                            aria-label="Delete {cat.name}"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    {/each}
                  </ul>
                  <button
                    type="button"
                    on:click={clearForm}
                    class="mt-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    aria-label="Add new category"
                  >
                    + Add New
                  </button>
                {:else}
                  <p class="text-sm text-gray-500">No categories found. Add one below!</p>
                {/if}
              </div>

              <!-- Add/Edit Category Form -->
              <div>
                <h4 class="text-md font-semibold text-gray-800 mb-3">
                  {selectedCategoryForEdit ? 'Edit Category' : 'Add New Category'}
                </h4>
                <form on:submit|preventDefault={handleSubmit} class="space-y-4">
                  <div>
                    <label for="category-name" class="block text-sm font-medium text-gray-700">Category Name</label>
                    <input
                      type="text"
                      id="category-name"
                      bind:value={newOrEditedCategory.name}
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      placeholder="Enter category name"
                      required
                      aria-required="true"
                    />
                  </div>

                  <div class="flex justify-end space-x-3">
                    <button
                      type="submit"
                      class="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isSaving}
                      aria-busy={isSaving}
                    >
                      {#if isSaving}
                        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      {:else}
                        Save Category
                      {/if}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}