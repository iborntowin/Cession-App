import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
	const isProduction = mode === 'production';
	
	return {
		plugins: [sveltekit()],
		optimizeDeps: {
			include: [
				'chart.js/auto',
				'@tauri-apps/api'
			]
		},
		server: {
			port: 5173,
			proxy: {
				'/api': {
					target: 'http://localhost:8082',
					changeOrigin: true,
					secure: false,
					ws: true
				}
			}
		},
		build: {
			target: 'esnext',
			minify: isProduction ? 'esbuild' : false,
			sourcemap: !isProduction,
			chunkSizeWarningLimit: 1000,
			assetsInlineLimit: 4096
		},
		define: {
			__APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
			__BUILD_TIME__: JSON.stringify(new Date().toISOString()),
			__IS_PRODUCTION__: JSON.stringify(isProduction)
		},
		publicDir: 'static',
		assetsInclude: ['**/*.ttf'],
		esbuild: {
			drop: isProduction ? ['console', 'debugger'] : []
		}
	};
});
