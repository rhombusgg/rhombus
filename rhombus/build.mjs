import { context } from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";

const ctx = await context({
  entryPoints: ['app.tsx'],
  bundle: true,
  format: 'esm',
  outfile: 'static/app.js',
  platform: 'browser',
  minify: true,
  plugins: [solidPlugin()],
});

await ctx.watch();
console.log('Watching client js...');
