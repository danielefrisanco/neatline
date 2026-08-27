/**
 * A minimal SVG node tree, serialised exactly once.
 *
 * Building the document as data rather than concatenating strings is what makes
 * every future layer a non-event: Phase 8 appends children to a node that
 * already exists instead of finding the right seam in a template literal. It
 * also means escaping happens in one place, so it cannot be forgotten at a
 * call site.
 *
 * Deliberately not a DOM: `tsconfig` excludes the DOM lib so the emitter can
 * never reach for `document` and quietly become browser-only.
 */

export type AttributeValue = string | number | undefined;
export type Attributes = Readonly<Record<string, AttributeValue>>;

export interface SvgElement {
  readonly kind: "element";
  readonly tag: string;
  readonly attributes: Attributes;
  readonly children: readonly SvgNode[];
}

export interface SvgText {
  readonly kind: "text";
  readonly value: string;
}

/**
 * Content serialised exactly as given.
 *
 * Only `<style>` needs this. Escaping is wrong there: an HTML parser treats
 * style content as raw text, so `&gt;` would arrive as those four literal
 * characters and break a child selector. Callers are responsible for handing
 * over content that is safe to embed — `resolveTheme` does that check.
 */
export interface SvgRaw {
  readonly kind: "raw";
  readonly value: string;
}

export type SvgNode = SvgElement | SvgText | SvgRaw;

export function el(
  tag: string,
  attributes: Attributes = {},
  children: readonly SvgNode[] = [],
): SvgElement {
  return { kind: "element", tag, attributes, children };
}

export function text(value: string): SvgText {
  return { kind: "text", value };
}

export function raw(value: string): SvgRaw {
  return { kind: "raw", value };
}

/**
 * A `<style>` element whose content survives both parsers.
 *
 * A standalone `.svg` is parsed as XML, where a bare `&` or `<` is a parse
 * error; inline SVG in HTML is parsed as raw text, where entities are not
 * decoded. CDATA is the one form both accept, so it is used exactly when the
 * content needs it and skipped otherwise, which keeps ordinary themes clean.
 */
export function styleElement(css: string): SvgElement {
  const needsCdata = css.includes("&") || css.includes("<");
  return el("style", {}, [raw(needsCdata ? `<![CDATA[\n${css}\n]]>` : css)]);
}

/** `&` first, or it would double-escape the entities added after it. */
function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;");
}

/**
 * Trim float noise so the same map serialises identically across runs —
 * snapshots are worthless if `1000` can come out as `999.9999999999999`.
 */
function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 1000) / 1000);
}

function formatAttributes(attributes: Attributes): string {
  let out = "";
  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined) continue;
    const formatted = typeof value === "number" ? formatNumber(value) : escapeAttribute(value);
    out += ` ${name}="${formatted}"`;
  }
  return out;
}

const INDENT = "  ";

/** One text child stays on the element's own line; anything else is indented. */
function isInline(node: SvgElement): boolean {
  return node.children.length === 1 && node.children[0]?.kind === "text";
}

function indentBlock(value: string, pad: string): string {
  return value
    .split("\n")
    .map((line) => (line === "" ? line : pad + line))
    .join("\n");
}

export function serialize(node: SvgNode, depth = 0): string {
  const pad = INDENT.repeat(depth);

  if (node.kind === "text") return pad + escapeText(node.value);
  if (node.kind === "raw") return indentBlock(node.value, pad);

  const open = `${pad}<${node.tag}${formatAttributes(node.attributes)}`;

  // Self-closing is valid for any SVG element, and an empty `<g/>` still
  // accepts appended children once parsed — which is the point of the
  // reserved layers.
  if (node.children.length === 0) return `${open}/>`;

  if (isInline(node)) {
    const child = node.children[0] as SvgText;
    return `${open}>${escapeText(child.value)}</${node.tag}>`;
  }

  const inner = node.children.map((child) => serialize(child, depth + 1)).join("\n");
  return `${open}>\n${inner}\n${pad}</${node.tag}>`;
}
