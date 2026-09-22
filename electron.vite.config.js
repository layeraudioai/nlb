import { defineConfig } from 'electron-vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    base: './',
    plugins: [
        tailwindcss(),
        react()
    ],
    resolve: {
        preserveSymlinks: true
    },
    main: {
        build: {
		rollupOptions: {
                input: resolve(__dirname, 'dist/index.php'),
                assetsInclude: ['**/*.php']
            },
            target: 'node',
            minify: 'esbuild',
            esbuildOptions: {
                minify: true,
                legalComments: 'none',
                target: 'es2022'
            }
        },
    },
    preload: {
        build: {
            rollupOptions: {
                input: {
                    preload: resolve(__dirname, 'src/preload/index.ts')
                },
            },
        },
    }
});