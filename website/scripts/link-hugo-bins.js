/**
 * Puts back the one node_modules/.bin entry Hugo insists on.
 *
 * Hugo runs the Tailwind CLI itself: `css.TailwindCSS` looks `tailwindcss` up
 * in node_modules/.bin and runs it through Node, refusing anything it cannot
 * trace to a Node.js script ("binary \"tailwindcss\" is not a Node.js script").
 * That fails the build before a single byte of CSS is written.
 *
 * pnpm's shims defeat that lookup on both kinds of system:
 *
 * - On Linux and macOS it writes a POSIX shell shim where npm would have made a
 *   symlink to the script. Hugo follows symlinks and reads shebangs, but a
 *   shell script is neither, so this replaces the shim with the symlink.
 * - On Windows, Go's exec.LookPath only finds files with a PATHEXT extension,
 *   so Hugo gets `tailwindcss.CMD` whatever sits next to it. It takes the first
 *   `..\` or `node_modules\` path in that file as the script, and in pnpm's
 *   shim that is a NODE_PATH entry, not the CLI. This rewrites the .CMD so the
 *   CLI is the only path in it.
 *
 * It runs from the site's postinstall, so a plain `pnpm install` is enough.
 * Nothing here is fatal: a missing bin directory means dependencies are not
 * installed yet, and an install that cannot fix the bin should still finish.
 *
 * `--check` verifies the same thing instead of fixing it, which is what CI
 * runs: Hugo is the only thing that trips over this, and Hugo only runs on a
 * deploy, so without the check a broken link reaches production unseen.
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const binDir = path.join(root, "node_modules", ".bin");
const windows = process.platform === "win32";

/** The regex Hugo (common/hexec/exec.go) uses to find the script in a wrapper. */
const hugoEntryPointRe = /[/\\]((?:\.\.|node_modules)[/\\][\w@][\w@./\\-]*)/;

/** @param {string} packagePath  e.g. "@tailwindcss/cli" */
function linkBin(packagePath) {
  const packageDir = path.join(root, "node_modules", ...packagePath.split("/"));
  const manifest = path.join(packageDir, "package.json");
  if (!fs.existsSync(manifest)) return;

  const bins = JSON.parse(fs.readFileSync(manifest, "utf8")).bin ?? {};
  for (const [name, entry] of Object.entries(bins)) {
    const target = path.join(packageDir, entry);
    if (!fs.existsSync(target)) continue;

    if (windows) {
      const shim = path.join(binDir, `${name}.CMD`);
      const content = cmdShimFor(target);
      if (!fs.existsSync(shim) || fs.readFileSync(shim, "utf8") !== content) {
        fs.writeFileSync(shim, content);
      }
      continue;
    }

    const link = path.join(binDir, name);
    if (!linksTo(link, target)) {
      fs.rmSync(link, { force: true });
      fs.symlinkSync(path.relative(binDir, target), link);
      fs.chmodSync(target, 0o755);
    }
  }
}

/**
 * pnpm's shim without the NODE_PATH block. The CLI is an ES module, and Node
 * ignores NODE_PATH for those anyway.
 *
 * @param {string} target
 */
function cmdShimFor(target) {
  const entry = path.relative(binDir, target).split(path.sep).join("\\");
  return [
    "@SETLOCAL",
    "@SET PATHEXT=%PATHEXT:;.JS;=;%",
    `@node "%~dp0\\${entry}" %*`,
    "",
  ].join("\r\n");
}

function linksTo(link, target) {
  try {
    return fs.realpathSync(link) === fs.realpathSync(target) && fs.lstatSync(link).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Whether Hugo would accept what is in .bin today, resolved the way Hugo
 * resolves it on this platform.
 *
 * @param {string} name
 */
function checkBin(name) {
  const file = path.join(binDir, windows ? `${name}.CMD` : name);
  const shown = `node_modules/.bin/${path.basename(file)}`;
  if (!fs.existsSync(file)) {
    return `${shown} is missing; run \`pnpm install\``;
  }

  const content = fs.readFileSync(file, "utf8");
  if (windows) {
    const match = hugoEntryPointRe.exec(content);
    const script = match && path.join(binDir, match[1].replaceAll("\\", "/"));
    if (!script || !fs.existsSync(script) || !/\.[cm]?js$/.test(script)) {
      return `Hugo cannot find the Node.js script ${shown} runs`;
    }
    return null;
  }

  const shebang = content.slice(0, 64).split("\n", 1)[0] ?? "";
  if (!shebang.startsWith("#!") || !shebang.includes("node")) {
    return `${shown} is not a Node.js script, which is what Hugo requires`;
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
