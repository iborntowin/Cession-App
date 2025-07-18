import { writable } from 'svelte/store';

const createToastStore = () => {
    const { subscribe, set } = writable(null);

    return {
        subscribe,
        show: (message, type = 'info') => {
            set({ message, type });
            setTimeout(() => set(null), 3000); // Hide after 3 seconds
        },
        hide: () => set(null)
    };
};

export const toast = createToastStore();

export function showToast(message, type = 'info') {
    toast.show(message, type);
} 