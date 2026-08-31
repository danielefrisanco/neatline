import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  target: "es2022",
  platform: "neutral",
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  /**
   * Keep the `node:` prefix on builtin imports.
   *
   * tsup strips it by default, for compatibility with Node versions that
   * predate it — and stripping it is what stopped this library bundling for a
   * browser at all. The prefix is the only thing that tells a bundler
   * `fs/promises` is a builtin rather than a package it should go and find; the
   * bare form makes esbuild fail with "Could not resolve", and the `browser`
   * field in package.json cannot map a name that no longer says what it is.
   *
   * Node has had the prefix since 14.18 and `engines` asks for 20, so nothing
   * this package supports needs it removed.
   */
  removeNodeProtocol: false,
  /**
   * And leave them alone once the prefix survives.
   *
   * `platform: "neutral"` has no idea what a Node builtin is, so with the
   * prefix restored esbuild tries to find `node:fs/promises` on disk and fails.
   * Naming them external says what is true: these are the host's, not ours,
   * and every one of them is behind a lazy `await import` on a path the browser
   * never takes.
   */
  external: [/^node:/],
});
