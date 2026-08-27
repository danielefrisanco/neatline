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

  const map = mod.mapper({ region: "west-europe", size: [640, 480] });
  assert.ok(map.svg.startsWith("<svg"), `${label}: no svg emitted`);
  assert.ok(map.svg.includes('viewBox="0 0 640 480"'), `${label}: options ignored`);
  assert.equal(typeof map.project, "function", `${label}: project() missing`);
  assert.equal(typeof map.toFile, "function", `${label}: toFile() missing`);

  console.log(`  ✓ ${label}`);
}

console.log("both module systems ok");
