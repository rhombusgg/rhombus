import tailwindcss from "npm:tailwindcss";
import postcss from "npm:postcss";
import { Features, transform } from "npm:lightningcss";
import * as esbuild from "npm:esbuild";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader";
import * as path from "jsr:@std/path";
import { parseArgs } from "jsr:@std/cli/parse-args";

import { deepMerge } from "./merge.ts";

const flags = parseArgs(Deno.args, {
  string: ["output", "directory"],
  collect: ["directory"],
  alias: {
    directory: ["d", "dir"],
    output: ["o"],
  },
  default: {
    output: "./tailwind.css",
  },
});

const directories = flags.directory;

const tailwindConfigs = directories.flatMap((directory) => {
  const file = path.join(directory, "tailwind.config.ts");
  try {
    Deno.statSync(file);
    return [file];
  } catch {
    return [];
  }
});

function identifier(file: string) {
  return file.replaceAll(/[./-]/g, "_");
}

const contents = `
import { deepMerge } from "./merge.ts";
${tailwindConfigs.map((file) => `import * as ${identifier(file)} from "${file}";`).join("\n")}

const configs = [
  ${tailwindConfigs.map((file) => `${identifier(file)}`).join(", \n  ")}
];

export default configs.reduce((acc, file) => {
  return deepMerge(acc, file.tailwind);
}, {});
`;

await Deno.writeTextFile("./codegen.ts", contents);

await esbuild.build({
  plugins: [...denoPlugins({ loader: "portable" })],
  entryPoints: ["./codegen.ts"],
  outfile: "./tailwind.config.js",
  bundle: true,
  format: "esm",
  target: "esnext",
  keepNames: true,
});

const generatedConfig = await Deno.readTextFile("./tailwind.config.js");

Promise.all(
  tailwindConfigs.map(async (config) => {
    const jsFile = path.join(path.dirname(config), "tailwind.config.js");
    await Deno.writeTextFile(jsFile, generatedConfig);
  }),
);

const configs = await Promise.all(
  tailwindConfigs.map(async (file) => {
    const config = await import(file);
    const directory = path.dirname(file);
    config.tailwind.content = config.tailwind.content.map((content: string) =>
      path.join(directory, content),
    );
    return config;
  }),
);

const config = configs.reduce(
  (acc, config) => deepMerge(acc, config.tailwind),
  {},
);

const tailwindPlugin = tailwindcss({
  config,
});

const appCsses = directories.flatMap((directory) => {
  const file = path.join(directory, "app.css");
  try {
    Deno.statSync(file);
    return [file];
  } catch {
    return [];
  }
});

const appCss = appCsses.map((file) => Deno.readTextFileSync(file)).join("\n");

const result = await postcss([tailwindPlugin]).process(appCss, {
  from: undefined,
  to: undefined,
});

// adapted from https://github.com/tailwindlabs/tailwindcss/blob/5da6968996df92ece30b7087775178a100bf8ed5/packages/%40tailwindcss-postcss/src/index.ts#L217
function optimizeCss(css: string) {
  function optimize(code: Uint8Array) {
    return transform({
      code,
      minify: true,
      sourceMap: false,
      filename: flags.output,
      drafts: {
        customMedia: true,
      },
      nonStandard: {
        deepSelectorCombinator: true,
      },
      include: Features.Nesting,
      exclude: Features.LogicalProperties,
      targets: {
        safari: (16 << 16) | (4 << 8),
      },
      errorRecovery: true,
    }).code;
  }
  const encodedCss = new TextEncoder().encode(css);

  // See above link why we need to optimize twice
  return optimize(optimize(encodedCss)).toString();
}

await Deno.writeTextFile(flags.output, optimizeCss(result.css));
