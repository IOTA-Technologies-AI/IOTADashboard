/**
 * Is there actually a signature on this canvas / in this image?
 *
 * Counts *ink*: pixels that are opaque and dark. Light greys (a guide line,
 * hint text) do not count, so an image of an untouched pad is "blank".
 *
 * The API refuses a signature on the same rule
 * (IOTAApiServer/iotaapiserver/shared/signature-ink.ts) — keep the thresholds
 * in step, or the pad will enable Apply for a signature the server rejects.
 */

export const MIN_INK_PIXELS = 250;
export const MIN_INK_WIDTH = 60;
export const MIN_INK_HEIGHT = 12;

const INK_ALPHA = 128;
const INK_LUMA = 150;

/**
 * @param {ImageData} imageData
 * @returns {{ inkPixels: number, box: { x: number, y: number, width: number, height: number } | null }}
 */
export function measureInk({ data, width, height }) {
  let inkPixels = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < INK_ALPHA) continue;
      const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (luma >= INK_LUMA) continue;
      inkPixels += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  return {
    inkPixels,
    box: maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
  };
}

/** 'ok' | 'blank' | 'too-small' */
export function inkVerdict(ink) {
  if (!ink || ink.inkPixels === 0 || !ink.box) return 'blank';
  if (
    ink.inkPixels < MIN_INK_PIXELS ||
    ink.box.width < MIN_INK_WIDTH ||
    ink.box.height < MIN_INK_HEIGHT
  ) {
    return 'too-small';
  }
  return 'ok';
}

export function measureCanvasInk(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return measureInk(ctx.getImageData(0, 0, canvas.width, canvas.height));
}

/**
 * Measures a stored signature (data URL). Resolves to the verdict, or null
 * when the image cannot be loaded.
 */
export function inspectSignatureImage(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl || typeof window === 'undefined') {
      resolve(dataUrl ? null : 'blank');
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(inkVerdict(measureCanvasInk(canvas)));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
