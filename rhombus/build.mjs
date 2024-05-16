import { context } from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";

const ctx = await context({
  entryPoints: ['app.tsx'],
  bundle: true,
  minify: true,
  outfile: 'static/app.js',
  globalName: "rhombus",
  plugins: [solidPlugin()],
});

await ctx.watch();
console.log('Watching client js...');
