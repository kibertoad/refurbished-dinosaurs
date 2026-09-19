/**
 * Puts back the one node_modules/.bin entry Hugo insists on.
 *
 * Hugo runs the Tailwind CLI itself: `css.TailwindCSS` looks `tailwindcss` up
 * in node_modules/.bin and runs it through Node, refusing anything that is not
 * a Node.js script ("binary \"tailwindcss\" is not a Node.js script"). That
 * fails the build before a single byte of CSS is written.
 *
 * pnpm writes package bins as POSIX shell shims rather than as symlinks to the
 * script itself, which is exactly what Hugo refuses, so this replaces that one
 * shim with the link npm would have made. It runs from the site's postinstall,
 * so a plain `pnpm install` is enough.
 *
 * Nothing here is fatal: a missing bin directory means dependencies are not
 * installed yet, and a platform without symlinks is better off with the shim
 * than with a failed install.
 *
 * `--check` verifies the same thing instead of fixing it, which is what CI
 * runs: Hugo is the only thing that trips over this, and Hugo only runs on a
 * deploy, so without the check a broken link reaches production unseen.
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const binDir = path.join(root, "node_modules", ".bin");

/** @param {string} packagePath  e.g. "@tailwindcss/cli" */
function linkBin(packagePath) {
  const packageDir = path.join(root, "node_modules", ...packagePath.split("/"));
  const manifest = path.join(packageDir, "package.json");
  if (!fs.existsSync(manifest)) return;

  const bins = JSON.parse(fs.readFileSync(manifest, "utf8")).bin ?? {};
  for (const [name, entry] of Object.entries(bins)) {
    const target = path.join(packageDir, entry);
    const link = path.join(binDir, name);

    if (fs.existsSync(target) && !linksTo(link, target)) {
      fs.rmSync(link, { force: true });
      fs.symlinkSync(path.relative(binDir, target), link);
      fs.chmodSync(target, 0o755);
    }
  }
}

function linksTo(link, target) {
  try {
    return fs.realpathSync(link) === fs.realpathSync(target) && fs.lstatSync(link).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Whether Hugo would accept what is in .bin today: a link it can follow to a
 * file Node can run.
 *
 * @param {string} name
 */
function checkBin(name) {
  const link = path.join(binDir, name);
  if (!fs.existsSync(link)) {
    return `node_modules/.bin/${name} is missing; run \`pnpm install\``;
  }

  const shebang = fs.readFileSync(link, "utf8").slice(0, 64).split("\n", 1)[0] ?? "";
  if (!shebang.startsWith("#!") || !shebang.includes("node")) {
    return `node_modules/.bin/${name} is not a Node.js script, which is what Hugo requires`;
  }

  return null;
}

const BINS = { "@tailwindcss/cli": ["tailwindcss"] };

if (process.argv.includes("--check")) {
  const problems = Object.values(BINS).flat().map(checkBin).filter(Boolean);
  for (const problem of problems) console.error(problem);

  if (problems.length) {
    console.error("`pnpm install` runs the fix; see website/scripts/link-hugo-bins.js");
    process.exit(1);
  }
  console.log("Hugo's node_modules/.bin entries look right");
} else if (fs.existsSync(binDir)) {
  try {
    for (const packagePath of Object.keys(BINS)) linkBin(packagePath);
  } catch (error) {
    console.warn(`could not relink the Tailwind CLI for Hugo: ${error.message}`);
  }
}
