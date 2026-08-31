/**
 * Taking the map away — the step that makes the tool a tool.
 *
 * **The library emits a document; this is where it becomes a picture**, and
 * that sentence is the whole reason PNG lives here rather than in the library.
 * A rasteriser is a dependency the library will not take and does not need,
 * because every browser already ships one: an SVG drawn into a `<canvas>` and
 * handed back through `toBlob()`.
 *
 * It works only because of a property the library has had since Phase 3 and
 * which is doing real work for the first time here. `render()` produces a
 * *flattened* document — every computed value on a presentation attribute, no
 * external font reference, no external anything — and an `<img>` holding an SVG
 * is a sealed box that fetches nothing. A map whose colours lived only in a
 * `<style>` block would rasterise as black shapes; a map that reached for a
 * webfont would rasterise without it, or taint the canvas and refuse to be read
 * back at all.
 *
 * **Size belongs to the export, not to the screen.** A map re-renders at any
 * size because it is geometry rather than pixels, so a preview sized to a
 * browser column and a poster at 2000 pixels are the same document twice —
 * which makes offering both nearly free, and makes not offering it a waste of
 * the one advantage vector has.
 */

/** How far past the canvas size a raster may go before a browser refuses it. */
const MAX_PIXELS = 8000;

/**
 * And how much of it there may be in total.
 *
 * A side limit is not enough on its own: 8000 × 8000 is inside it on both axes
 * and is 64 megapixels, which is a quarter of a gigabyte of RGBA before the PNG
 * encoder has been asked for anything. Forty megapixels is a 40-inch print at
 * 150 dpi, which is past what this tool is for.
 */
const MAX_AREA = 40e6;

export interface ExportSize {
  /** The multiplier, as it goes in the file name. */
  readonly scale: number;
  readonly width: number;
  readonly height: number;
  readonly label: string;
}

/**
 * The sizes this canvas can be exported at.
 *
 * Capped rather than clamped: a browser canvas has a hard limit on its
 * dimensions and a softer one on its area, and past either the result is not a
 * small PNG, it is a blank one. A size that cannot be produced is better left
 * out of the menu than offered and then failed.
 */
export function exportSizes(width: number, height: number): readonly ExportSize[] {
  const sizes: ExportSize[] = [];
  for (const scale of [1, 2, 3, 4]) {
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);
    // 1× is always offered: refusing it would be refusing to save the map the
    // tool has just drawn, which is not a limit anyone would accept.
    if (scale > 1 && (w > MAX_PIXELS || h > MAX_PIXELS || w * h > MAX_AREA)) continue;
    sizes.push({ scale, width: w, height: h, label: `${scale}× — ${w} × ${h}` });
  }
  return sizes;
}

/**
 * What to call the file.
 *
 * The region and the size, because the two things somebody wants to tell two
 * downloads apart by are what it is of and how big it is. A list of ISO codes
 * is a legal region and an illegal file name, so anything that is not a letter,
 * a digit or a dash becomes a dash.
 */
export function fileName(region: string, size: ExportSize, extension: string): string {
  const slug = region
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `neatline-${slug === "" ? "map" : slug}-${size.width}x${size.height}.${extension}`;
}

/**
 * A flattened SVG into a PNG blob, by way of a canvas.
 *
 * The image is loaded from a blob URL rather than a `data:` URI: a data URI has
 * to be percent-encoded or base64'd, which is a third again in size for a
 * document that can be a megabyte, and Safari has historically refused the long
 * ones outright.
 *
 * The canvas is sized in pixels and the image is drawn to fill it, which is
 * what makes this a *re-render* rather than an upscale — the browser rasterises
 * the vector at the size asked for, so a 4× export is four times the detail and
 * not four times the pixels.
 */
export async function rasterise(svg: string, size: ExportSize): Promise<Blob> {
  const source = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    image.width = size.width;
    image.height = size.height;
    await new Promise<void>((resolve, reject) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener(
        "error",
        () => reject(new Error("the browser could not read the map as an image")),
        { once: true },
      );
      image.src = source;
    });

    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("this browser has no 2D canvas");
    context.drawImage(image, 0, 0, size.width, size.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    // `toBlob` answers `null` when the canvas is tainted or too large for the
    // browser to hold, and neither says anything on the way in.
    if (blob === null) throw new Error(`a ${size.width} × ${size.height} canvas was too large to read back`);
    return blob;
  } finally {
    URL.revokeObjectURL(source);
  }
}

/** Hand a blob to the browser as a file. */
export function save(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  // Appended rather than clicked detached: Firefox ignores a click on a link
  // that is not in the document.
  document.body.append(link);
  link.click();
  link.remove();
  // Revoked late, because revoking it in the same tick cancels the download in
  // some browsers before it has started.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
