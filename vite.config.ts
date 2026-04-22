import { svelte } from '@sveltejs/vite-plugin-svelte';
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		svelte(),
		Icons({ compiler: 'svelte' }),
		{
			name: 'spa-fallback-404',
			apply: 'build',
			closeBundle() {
				const out = resolve('build');
				copyFileSync(resolve(out, 'index.html'), resolve(out, '404.html'));
			}
		}
	],
	build: {
		outDir: 'build'
	}
});
