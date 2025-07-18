import { Writable, Readable } from 'svelte/store';

export const languages: Record<string, string>;
export const defaultLanguage: string;
export const currentLanguage: Writable<string>;
export const t: Readable<(key: string) => string>;

export function loadTranslations(lang: string): Record<string, string>;
export function setLanguage(lang: string): void; 