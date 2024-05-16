import { context } from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";

const ctx = await context({
  entryPoints: ['app.tsx'],
  bundle: true,
  outfile: 'static/app.js',
  sourcemap: "inline",
  globalName: "rhombus",
  plugins: [solidPlugin()],
});

await ctx.watch();
console.log('Watching client js...');
