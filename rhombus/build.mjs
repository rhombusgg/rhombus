import { build } from "esbuild";
import { context } from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";

const options = {
  entryPoints: ['frontend/app.tsx'],
  bundle: true,
  minify: true,
  outfile: 'static/app.js',
  globalName: "rhombus",
  plugins: [solidPlugin()],
};

if (process.env.WATCH === 'true') {
  const ctx = await context(options);

  await ctx.watch();
  console.log('Watching client js...');
} else {
  build(options).catch(() => process.exit(1));
}
