import type { CssNode, Declaration, Rule } from "./css.js";
import { el, type Attributes, type SvgElement, type SvgNode } from "./svg.js";

/**
 * Flatten a stylesheet onto presentation attributes.
 *
 * Two audiences need this. Figma and Illustrator import SVG but ignore
 * `<style>`, so a themed map arrives at a designer as black shapes. And some
 * non-browser renderers invert the cascade and let a presentation attribute
 * beat a stylesheet, which Phase 2 discovered the hard way.
 *
 * This is not a CSS engine. It matches class selectors and descendant
 * combinators, which is what the bundled themes use and what the documented
 * authoring convention asks for. Selectors it cannot understand are skipped
 * rather than half-applied, and are reported so the caller is not guessing.
 */

/** Properties that exist as SVG presentation attributes. Nothing else transfers. */
const PRESENTATION = new Set([
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "opacity",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "letter-spacing",
  "text-anchor",
  "dominant-baseline",
  "paint-order",
  "vector-effect",
  "filter",
  "r",
  "display",
  "visibility",
]);

type Compound = readonly string[];

/** A selector we can honour: only class compounds, only descendant combinators. */
function parseSelector(selector: string): Compound[] | null {
  const compounds: Compound[] = [];
  for (const part of selector.trim().split(/\s+/)) {
    if (part === "") continue;
    if (!/^(\.[A-Za-z_][\w-]*)+$/.test(part)) return null;
    compounds.push(part.split(".").filter(Boolean));
  }
  return compounds.length === 0 ? null : compounds;
}

function classesOf(element: SvgElement): Set<string> {
  const value = element.attributes["class"];
  return new Set(typeof value === "string" ? value.split(/\s+/).filter(Boolean) : []);
}

function matches(compound: Compound, classes: ReadonlySet<string>): boolean {
  return compound.every((name) => classes.has(name));
}

interface Candidate {
  readonly compounds: readonly Compound[];
  readonly declarations: readonly Declaration[];
  readonly specificity: number;
  readonly order: number;
}

/**
 * Descendant matching, walking the ancestor stack from the outside in.
 * The final compound must match the element itself.
 */
function selectorApplies(
  compounds: readonly Compound[],
  stack: readonly ReadonlySet<string>[],
): boolean {
  const last = compounds[compounds.length - 1];
  const own = stack[stack.length - 1];
  if (last === undefined || own === undefined || !matches(last, own)) return false;

  let ancestor = stack.length - 2;
  for (let i = compounds.length - 2; i >= 0; i -= 1) {
    const wanted = compounds[i] as Compound;
    let found = false;
    while (ancestor >= 0) {
      const candidate = stack[ancestor] as ReadonlySet<string>;
      ancestor -= 1;
      if (matches(wanted, candidate)) {
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return true;
}

const VAR_PATTERN = /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/;

function resolveValue(value: string, tokens: ReadonlyMap<string, string>, depth = 0): string {
  if (depth > 8) return value;
  const match = VAR_PATTERN.exec(value);
  if (match === null) return value;
  const name = match[1] as string;
  const fallback = match[2];
  const replacement = tokens.get(name) ?? fallback ?? "";
  const next = value.slice(0, match.index) + replacement + value.slice(match.index + match[0].length);
  return resolveValue(next, tokens, depth + 1);
}

/**
 * Turn a CSS `drop-shadow()` into a real SVG filter.
 *
 * `filter: drop-shadow(...)` is a CSS Filter Effects function. Browsers accept
 * it, including through the presentation attribute — but SVG 1.1 only allows
 * `url(#id)` there, so every viewer and design tool that predates CSS filters
 * silently drops it and the relief disappears. `feDropShadow` is understood far
 * more widely, and this is what the reserved `<defs>` block exists for.
 */
const DROP_SHADOW =
  /drop-shadow\(\s*(-?[\d.]+)px\s+(-?[\d.]+)px(?:\s+([\d.]+)px)?\s*((?:[^()]|\([^()]*\))*?)\s*\)\s*$/;

interface ShadowFilter {
  readonly id: string;
  readonly element: SvgElement;
}

function shadowFilter(value: string, index: number): ShadowFilter | null {
  const match = DROP_SHADOW.exec(value);
  if (match === null) return null;

  const [dx, dy] = [match[1] as string, match[2] as string];
  // CSS states a blur radius; a Gaussian filter wants a standard deviation.
  const blur = Number(match[3] ?? "0") / 2;
  const colour = (match[4] ?? "").trim() || "black";

  let floodColour = colour;
  let floodOpacity: string | undefined;
  // Split the alpha out: flood-opacity is honoured far more widely than an
  // alpha channel inside flood-color.
  const rgba = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(
    colour,
  );
  if (rgba !== null) {
    floodColour = `rgb(${rgba[1]},${rgba[2]},${rgba[3]})`;
    if (rgba[4] !== undefined) floodOpacity = rgba[4];
  }

  const id = `mp-shadow-${index}`;
  return {
    id,
    element: el(
      "filter",
      { id, x: "-25%", y: "-25%", width: "150%", height: "150%" },
      [
        el("feDropShadow", {
          dx,
          dy,
          stdDeviation: blur,
          "flood-color": floodColour,
          "flood-opacity": floodOpacity,
        }),
      ],
    ),
  };
}

export interface InlineResult {
  readonly root: SvgElement;
  /** Selectors that were skipped because they are beyond this matcher. */
  readonly skipped: readonly string[];
}

export function inlineStyles(root: SvgElement, nodes: readonly CssNode[]): InlineResult {
  const candidates: Candidate[] = [];
  const skipped: string[] = [];
  let order = 0;

  for (const node of nodes) {
    if (node.kind !== "rule") continue;
    const rule = node as Rule;
    // A conditional rule may or may not apply at view time; baking it in would
    // be a guess. The stylesheet still ships, so the browser still honours it.
    if (rule.at !== null) continue;
    for (const selector of rule.selector.split(",")) {
      const compounds = parseSelector(selector);
      if (compounds === null) {
        skipped.push(selector.trim());
        continue;
      }
      candidates.push({
        compounds,
        declarations: rule.declarations,
        specificity: compounds.reduce((total, c) => total + c.length, 0),
        order: (order += 1),
      });
    }
  }

  const filters = new Map<string, ShadowFilter>();

  function walk(
    node: SvgNode,
    stack: readonly ReadonlySet<string>[],
    inherited: ReadonlyMap<string, string>,
  ): SvgNode {
    if (node.kind === "text" || node.kind === "raw") return node;

    const own = classesOf(node);
    const nextStack = [...stack, own];

    const applicable = candidates
      .filter((candidate) => selectorApplies(candidate.compounds, nextStack))
      .sort((a, b) => a.specificity - b.specificity || a.order - b.order);

    // Custom properties inherit, so an element sees its ancestors' tokens too.
    const tokens = new Map(inherited);
    for (const candidate of applicable) {
      for (const declaration of candidate.declarations) {
        if (declaration.property.startsWith("--")) {
          tokens.set(declaration.property, declaration.value);
        }
      }
    }

    const painted: Record<string, string> = {};
    for (const candidate of applicable) {
      for (const declaration of candidate.declarations) {
        if (!PRESENTATION.has(declaration.property)) continue;
        painted[declaration.property] = resolveValue(declaration.value, tokens).trim();
      }
    }

    const shadow = painted["filter"];
    if (shadow !== undefined && shadow.includes("drop-shadow")) {
      const existing = filters.get(shadow);
      const made = existing ?? shadowFilter(shadow, filters.size + 1);
      if (made !== null) {
        filters.set(shadow, made);
        painted["filter"] = `url(#${made.id})`;
      }
    }

    const attributes: Attributes = { ...node.attributes, ...painted };
    const children = node.children.map((child) => walk(child, nextStack, tokens));
    return el(node.tag, attributes, children);
  }

  const walked = walk(root, [], new Map()) as SvgElement;
  if (filters.size === 0) return { root: walked, skipped };

  // Definitions have to exist before anything references them, which is why
  // the slot sits ahead of everything drawn.
  const children = walked.children.map((child) =>
    child.kind === "element" && child.tag === "defs"
      ? el(child.tag, child.attributes, [
          ...child.children,
          ...[...filters.values()].map((f) => f.element),
        ])
      : child,
  );

  return { root: el(walked.tag, walked.attributes, children), skipped };
}
