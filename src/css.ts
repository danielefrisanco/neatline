/**
 * A deliberately small CSS reader.
 *
 * Not a general engine, and not trying to be. It exists because two jobs need
 * the same thing: scoping a theme so it cannot leak out of the map, and
 * flattening a theme onto presentation attributes for tools that ignore
 * stylesheets. Both need rules as data, so both go through here.
 *
 * Supported: plain rules, and rules nested one level inside `@media`,
 * `@supports` or `@layer`. Anything else is passed through untouched and
 * unscoped, which is the honest outcome for `@font-face` or `@import` — they
 * have no selector to scope.
 */

export interface Declaration {
  readonly property: string;
  readonly value: string;
}

export interface Rule {
  readonly kind: "rule";
  readonly selector: string;
  readonly declarations: readonly Declaration[];
  /** The wrapping at-rule prelude, or `null` at the top level. */
  readonly at: string | null;
}

export interface Verbatim {
  readonly kind: "verbatim";
  readonly text: string;
}

export type CssNode = Rule | Verbatim;

const NESTABLE = /^@(media|supports|layer)\b/;

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Split on a separator, ignoring any that sits inside parentheses. */
function splitTopLevel(input: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < input.length; i += 1) {
    const character = input[i];
    if (character === "(") depth += 1;
    else if (character === ")") depth -= 1;
    else if (character === separator && depth === 0) {
      parts.push(input.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(input.slice(start));
  return parts;
}

function parseDeclarations(body: string): Declaration[] {
  const declarations: Declaration[] = [];
  for (const chunk of splitTopLevel(body, ";")) {
    const text = chunk.trim();
    if (text === "") continue;
    // First colon only: a custom property's value may contain more.
    const colon = text.indexOf(":");
    if (colon === -1) continue;
    const property = text.slice(0, colon).trim();
    const value = text.slice(colon + 1).trim();
    if (property === "" || value === "") continue;
    declarations.push({ property, value });
  }
  return declarations;
}

export function parseCss(css: string, at: string | null = null): CssNode[] {
  const source = at === null ? stripComments(css) : css;
  const nodes: CssNode[] = [];
  let index = 0;

  while (index < source.length) {
    const open = source.indexOf("{", index);
    if (open === -1) break;

    const prelude = source.slice(index, open).trim();

    let depth = 1;
    let cursor = open + 1;
    while (cursor < source.length && depth > 0) {
      if (source[cursor] === "{") depth += 1;
      else if (source[cursor] === "}") depth -= 1;
      cursor += 1;
    }
    const body = source.slice(open + 1, cursor - 1);

    if (prelude.startsWith("@")) {
      if (NESTABLE.test(prelude)) {
        nodes.push(...parseCss(body, prelude));
      } else {
        nodes.push({ kind: "verbatim", text: `${prelude} {${body}}` });
      }
    } else if (prelude !== "") {
      nodes.push({ kind: "rule", selector: prelude, declarations: parseDeclarations(body), at });
    }

    index = cursor;
  }

  return nodes;
}

/**
 * Constrain a selector to one map.
 *
 * A `<style>` block inside inline SVG is not scoped to that SVG — it applies to
 * the whole host document. Two differently themed maps on one page would
 * otherwise overwrite each other's rules, and a map would restyle anything on
 * the page that happened to share a class name.
 *
 * A selector already rooted at `.mp` gets the scope class fused onto that
 * compound (`.mp.mp-t-x1y2z3`); anything else is constrained as a descendant.
 */
export function scopeSelector(selector: string, scope: string): string {
  return splitTopLevel(selector, ",")
    .map((part) => {
      const trimmed = part.trim();
      if (trimmed === "") return trimmed;
      if (trimmed === ".mp") return `.mp.${scope}`;
      if (trimmed.startsWith(".mp ") || trimmed.startsWith(".mp.") || trimmed.startsWith(".mp:")) {
        return `.mp.${scope}${trimmed.slice(3)}`;
      }
      return `.mp.${scope} ${trimmed}`;
    })
    .filter((part) => part !== "")
    .join(", ");
}

export function scopeCss(nodes: readonly CssNode[], scope: string): CssNode[] {
  return nodes.map((node) =>
    node.kind === "rule" ? { ...node, selector: scopeSelector(node.selector, scope) } : node,
  );
}

/**
 * The ids this library owns, as a prefix.
 *
 * A caller's own `url(#my-gradient)` is theirs and is left exactly as written.
 * Only the built-in names get namespaced, because only those are emitted by the
 * library and only those can therefore collide between two of its documents.
 */
const OWNED_ID = /url\(\s*#(mp-[\w-]*?)\s*\)/g;

/**
 * Namespace the built-in `url(#…)` references in a stylesheet.
 *
 * The SVG ids used to be constants while the stylesheets were properly scoped
 * to a hash, so two maps in one HTML document shared `mp-land-clip`,
 * `mp-stripe` and `mp-relief` — and every reference resolved to whichever map
 * the parser reached first. That is one map's rivers clipped to another map's
 * coastline, silently.
 *
 * The authored name does not change: a theme still says `filter:
 * url(#mp-relief)`, which is what the docs promise and what every stylesheet in
 * the wild already says. Only the emitted pair moves, together — the id on the
 * definition and the reference in the stylesheet shipped beside it.
 */
export function scopeIds(css: string, scope: string): string {
  return css.replace(OWNED_ID, (_, id: string) => `url(#${id}-${scope})`);
}

/** The same rewrite, applied to parsed nodes — what the flattening pass reads. */
export function scopeIdsInNodes(nodes: readonly CssNode[], scope: string): CssNode[] {
  return nodes.map((node) =>
    node.kind === "rule"
      ? {
          ...node,
          declarations: node.declarations.map((d) => ({
            ...d,
            value: scopeIds(d.value, scope),
          })),
        }
      : node,
  );
}

export function serializeCss(nodes: readonly CssNode[]): string {
  const lines: string[] = [];
  let openAt: string | null = null;

  const closeAt = () => {
    if (openAt !== null) {
      lines.push("}");
      openAt = null;
    }
  };

  for (const node of nodes) {
    if (node.kind === "verbatim") {
      closeAt();
      lines.push(node.text);
      continue;
    }
    if (node.at !== openAt) {
      closeAt();
      if (node.at !== null) {
        lines.push(`${node.at} {`);
        openAt = node.at;
      }
    }
    const indent = node.at === null ? "" : "  ";
    const body = node.declarations
      .map((d) => `${indent}  ${d.property}: ${d.value};`)
      .join("\n");
    lines.push(`${indent}${node.selector} {\n${body}\n${indent}}`);
  }
  closeAt();

  return lines.join("\n");
}

/**
 * FNV-1a. Not a security hash — it only has to be short, stable and
 * dependency-free, so that the same stylesheet always produces the same scope
 * class and the output stays byte-identical across runs.
 */
export function hashCss(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).padStart(7, "0").slice(-7);
}
