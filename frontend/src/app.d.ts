// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}
	
	namespace NodeJS {
		interface ProcessEnv {
			PUBLIC_BACKEND_URL: string;
		}
	}
}

export {}; 