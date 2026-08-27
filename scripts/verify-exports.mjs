/**
 * Proves the built package imports cleanly under both module systems.
 * Run after `npm run build`.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const esm = await import("../dist/index.js");
const cjs = require("../dist/index.cjs");

for (const [label, mod] of [
  ["esm", esm],
  ["cjs", cjs],
]) {
  assert.equal(typeof mod.mapper, "function", `${label}: named export missing`);

  const map = await mod.mapper({ region: "west-europe", detail: "110m", size: [640, 480] });
  assert.ok(map.svg.startsWith("<svg"), `${label}: no svg emitted`);
  assert.ok(map.svg.includes("<path"), `${label}: no geometry emitted`);
  assert.ok(Array.isArray(map.project([2.35, 48.86])), `${label}: project() broken`);
  assert.ok(map.svg.includes('viewBox="0 0 640 480"'), `${label}: options ignored`);
  assert.equal(typeof map.project, "function", `${label}: project() missing`);
  assert.equal(typeof map.toFile, "function", `${label}: toFile() missing`);

  console.log(`  ✓ ${label}`);
}

// The exports map promises `mapper/themes/minimal.css`. A promise that
// resolves to a missing file is worse than not making it.
const { readFile } = await import("node:fs/promises");
for (const [directory, table] of [
  ["themes", esm.THEMES],
  ["palettes", esm.PALETTES],
  ["typefaces", esm.TYPEFACES],
]) {
  for (const name of Object.keys(table)) {
    const path = new URL(`../${directory}/${name}.css`, import.meta.url);
    const css = await readFile(path, "utf8");
    assert.ok(css.includes(".mp"), `${directory}/${name}.css is not a map stylesheet`);
    console.log(`  ✓ ${directory}/${name}.css`);
  }
}

console.log("both module systems ok");
