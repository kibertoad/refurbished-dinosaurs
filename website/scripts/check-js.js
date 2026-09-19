/**
 * Bundles assets/js/wishlist.ts the way Hugo's js.Build does, and throws the
 * result away.
 *
 *   pnpm check:js
 *
 * Hugo bundles this script with its own copy of esbuild at build time, and it
 * is the only thing that does, so a broken import or a dependency that does
 * not resolve through the linked contracts package would otherwise surface in
 * a deploy rather than in CI. Same entry, same options, no output.
 */

const path = require("path");
const esbuild = require("esbuild");

const root = path.join(__dirname, "..");

esbuild
  .build({
    absWorkingDir: root,
    entryPoints: [path.join("assets", "js", "wishlist.ts")],
    bundle: true,
    format: "iife",
    target: "es2020",
    minify: true,
    write: false,
    logLevel: "warning",
  })
  .then((result) => {
    const bytes = result.outputFiles.reduce((total, file) => total + file.contents.byteLength, 0);
    console.log(`wishlist.ts bundles to ${(bytes / 1024).toFixed(1)} kB minified`);
  })
  .catch(() => process.exit(1));
