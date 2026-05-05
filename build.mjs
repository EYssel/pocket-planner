import * as esbuild from 'esbuild';
import { builtinModules } from 'node:module';

const isWatch = process.argv.includes('--watch');

/** @type {esbuild.BuildOptions} */
const commonConfig = {
  bundle: true,
  minify: !isWatch,
  sourcemap: isWatch,
  format: 'cjs',
  platform: 'node',
  // Externalize all built-in node modules and electron
  external: ['electron', 'electron-updater', 'electron-store', 'node-cron', ...builtinModules, ...builtinModules.map(m => `node:${m}`)],
};

async function build() {
  const contexts = [
    // Main Process
    await esbuild.context({
      ...commonConfig,
      entryPoints: ['main.ts'],
      outfile: 'dist/main.js',
    }),
    
    // Preload Script
    await esbuild.context({
      ...commonConfig,
      entryPoints: ['preload.ts'],
      outfile: 'dist/preload.js',
    }),

    // Renderer Process
    await esbuild.context({
      ...commonConfig,
      platform: 'browser',
      entryPoints: ['renderer.ts'],
      outfile: 'dist/renderer.js',
      // Renderer doesn't need external node modules
      external: [],
    }),

    // Helper Scripts
    await esbuild.context({
      ...commonConfig,
      entryPoints: ['scripts/seed-test-data.ts'],
      outfile: 'dist/scripts/seed-test-data.js',
    }),
    await esbuild.context({
      ...commonConfig,
      entryPoints: ['scripts/clean-dev-data.ts'],
      outfile: 'dist/scripts/clean-dev-data.js',
    }),
  ];

  if (isWatch) {
    console.log('⚡ Watching for changes...');
    await Promise.all(contexts.map(ctx => ctx.watch()));
  } else {
    console.log('📦 Building for production...');
    await Promise.all(contexts.map(ctx => ctx.rebuild()));
    await Promise.all(contexts.map(ctx => ctx.dispose()));
    console.log('✅ Build complete!');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
