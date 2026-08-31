import type { ExportSize } from "./export.js";

/**
 * The browser's half of an export: an SVG into a PNG, and a blob onto a disk.
 *
 * **The library emits a document; this is where it becomes a picture**, and
 * that sentence is the whole reason PNG lives in the tool rather than in the
 * library. A rasteriser is a dependency the library will not take and does not
 * need, because every browser already ships one.
 *
 * Nothing here is unit-tested, and that is the point of it being its own file:
 * it is all `document`, `window` and `canvas`, none of which exist where the
 * library's tests run. What can be decided without a browser was decided in
 * `export.ts`; what is left is verified by downloading a file from a real one.
 */

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
