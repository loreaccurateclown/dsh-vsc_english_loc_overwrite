#!/usr/bin/env node
/**
 * dsh-vsc-en — reapply English UI text to a locally installed
 * `local.dsh-vsc` VS Code extension after it updates.
 *
 * The extension ships no i18n layer: its Chinese copy is hardcoded in the
 * built files. This script patches those files in place, using the zh->en
 * tables in ./maps. Unknown (newer) strings are left untouched, so a run
 * against a newer version is always safe — it just translates less.
 *
 * Usage:
 *   node apply.js                 # newest local.dsh-vsc-* under ~/.vscode/extensions
 *   node apply.js --dir <path>    # explicit extension folder
 *   node apply.js --dry-run       # report what would change, write nothing
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const dirArg = (() => {
  const i = argv.indexOf('--dir');
  return i >= 0 ? argv[i + 1] : undefined;
})();

const mapsDir = path.join(__dirname, 'maps');

function loadMap(name) {
  const pairs = [];
  const file = path.join(mapsDir, name);
  if (!fs.existsSync(file)) return pairs;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue;
    const parts = line.split(/\t+<=>\t/);
    if (parts.length >= 2) pairs.push([parts[0], parts.slice(1).join('\t<=>\t')]);
  }
  return pairs.sort((a, b) => b[0].length - a[0].length);
}

function findExtension() {
  const root = path.join(os.homedir(), '.vscode', 'extensions');
  if (!fs.existsSync(root)) throw new Error(`no extensions dir at ${root}`);
  const candidates = fs.readdirSync(root).filter((n) => /^local\.dsh-vsc-/.test(n) && fs.statSync(path.join(root, n)).isDirectory());
  if (!candidates.length) throw new Error('no local.dsh-vsc-* extension installed');
  candidates.sort((a, b) => {
    const va = a.match(/(\d+\.\d+\.\d+)/)?.[1].split('.').map(Number) ?? [0];
    const vb = b.match(/(\d+\.\d+\.\d+)/)?.[1].split('.').map(Number) ?? [0];
    for (let i = 0; i < Math.max(va.length, vb.length); i++) if ((va[i] ?? 0) !== (vb[i] ?? 0)) return (vb[i] ?? 0) - (va[i] ?? 0);
    return 0;
  });
  return path.join(root, candidates[0]);
}

const htmlFiles = [
  'dist/media/native/panel.html',
  'dist/media/native/settings.html',
  'dist/media/shell.html',
  'package.json',
];

function decodeCjkEscapes(s) {
  return s.replace(/\\u([0-9A-Fa-f]{4})/g, (m, hex) => {
    const cp = parseInt(hex, 16);
    const cjk = (cp >= 0x2e80 && cp <= 0x9fff) || (cp >= 0x3000 && cp <= 0x303f) || (cp >= 0xff00 && cp <= 0xffef);
    return cjk ? String.fromCharCode(cp) : m;
  });
}

function applyToFile(file, pairs, opts) {
  let src = fs.readFileSync(file, 'utf8');
  if (opts.decode) src = decodeCjkEscapes(src);
  let hits = 0;
  for (const [zh, en] of pairs) {
    if (src.includes(zh)) { hits += src.split(zh).length - 1; src = src.split(zh).join(en); }
  }
  const remaining = (src.match(/[\u4e00-\u9fff]/g) || []).length;
  if (!dryRun && hits) {
    if (!fs.existsSync(file + '.bak')) fs.copyFileSync(file, file + '.bak');
    fs.writeFileSync(file, src);
  }
  return { hits, remaining };
}

function main() {
  const ext = dirArg ? path.resolve(dirArg) : findExtension();
  if (!fs.existsSync(ext)) throw new Error(`not a directory: ${ext}`);
  // Two disjoint tables on purpose: the HTML table is fine-grained (short UI
  // fragments) and would mangle source identifiers if applied to extension.js.
  const uiPairs = [...loadMap('core.txt'), ...loadMap('extra.txt')].sort((a, b) => b[0].length - a[0].length);
  const hostPairs = [...loadMap('extension.txt'), ...loadMap('extra.txt')].sort((a, b) => b[0].length - a[0].length);
  console.log(`extension: ${ext}`);
  console.log(`ui pairs: ${uiPairs.length}, host pairs: ${hostPairs.length}${dryRun ? ' (dry run)' : ''}`);
  let total = 0;
  for (const rel of htmlFiles) {
    const f = path.join(ext, rel);
    if (!fs.existsSync(f)) { console.log(`  skip ${rel} (missing)`); continue; }
    const { hits, remaining } = applyToFile(f, uiPairs, { decode: false });
    total += hits;
    console.log(`  ${rel}: ${hits} replaced, ${remaining} CJK left`);
  }
  const extJs = path.join(ext, 'dist/extension.js');
  if (fs.existsSync(extJs)) {
    const { hits, remaining } = applyToFile(extJs, hostPairs, { decode: true });
    total += hits;
    console.log(`  dist/extension.js: ${hits} replaced (escapes decoded), ${remaining} CJK left`);
  }
  console.log(`done: ${total} replacements${dryRun ? ' (nothing written)' : ''}`);
  console.log('Reload VS Code (Reload Window) for host-side changes to take effect.');
}

main();
