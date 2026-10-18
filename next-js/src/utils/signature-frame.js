/**
 * The frame printed around an e-signature on the document:
 *
 *   ╭─ IOTA eSigned by:
 *   │    (the signature)
 *   ╰─ 8A3F1C2D9E4B4A7F0C6B2E19D5A8F473
 *
 * A rounded bracket, a label, and the signature ID the API issued when the
 * signature was recorded (shared/signature-id.ts), so a printed signature
 * can be matched to its entry in the dashboard's signature log.
 *
 * Composed in the browser on a canvas, so every renderer — pdf-lib stamping
 * (stampNdaPdf), the react-pdf NDA and the HTML previews — shows the same
 * image. Only signatures that carry a signatureId are framed; older ones are
 * shown as they were.
 */

const FRAME_COLOR = '#1b3a8c';
const LABEL_COLOR = '#4b5563';
const ID_COLOR = '#1f2937';
export const FRAME_LABEL = 'IOTA eSigned by:';

const cache = new Map();

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Resolves to the framed PNG data URL, or the original on any failure. */
export async function frameSignature(dataUrl, signatureId) {
  if (!dataUrl || !signatureId || typeof document === 'undefined') return dataUrl;
  const key = `${signatureId}:${dataUrl.length}`;
  if (cache.has(key)) return cache.get(key);

  try {
    const img = await loadImage(dataUrl);
    // Everything scales with the signature, so the frame reads the same at any size.
    const u = Math.max(1, img.naturalHeight / 110);
    const labelSize = 15 * u;
    const idSize = 13 * u;
    const radius = 10 * u;
    const line = 2.2 * u;
    const pad = 6 * u;
    const tick = 18 * u; // length of the bracket's top and bottom arms
    const labelRow = labelSize * 1.5;
    const idRow = idSize * 1.6;

    const measure = document.createElement('canvas').getContext('2d');
    measure.font = `600 ${labelSize}px Helvetica, Arial, sans-serif`;
    const labelW = measure.measureText(FRAME_LABEL).width;
    measure.font = `${idSize}px "SFMono-Regular", Menlo, Consolas, monospace`;
    const idW = measure.measureText(signatureId).width;

    const left = pad + line;
    const textX = left + tick + 6 * u;
    const imgX = left + 14 * u;
    const width = Math.ceil(Math.max(imgX + img.naturalWidth, textX + labelW, textX + idW) + pad);
    const height = Math.ceil(labelRow + img.naturalHeight + idRow);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Bracket: top arm, rounded corner, spine, rounded corner, bottom arm.
    const top = labelRow / 2;
    const bottom = height - idRow / 2;
    ctx.strokeStyle = FRAME_COLOR;
    ctx.lineWidth = line;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(left + tick, top);
    ctx.lineTo(left + radius, top);
    ctx.arcTo(left, top, left, top + radius, radius);
    ctx.lineTo(left, bottom - radius);
    ctx.arcTo(left, bottom, left + radius, bottom, radius);
    ctx.lineTo(left + tick, bottom);
    ctx.stroke();

    ctx.textBaseline = 'middle';
    ctx.fillStyle = LABEL_COLOR;
    ctx.font = `600 ${labelSize}px Helvetica, Arial, sans-serif`;
    ctx.fillText(FRAME_LABEL, textX, top);
    ctx.fillStyle = ID_COLOR;
    ctx.font = `${idSize}px "SFMono-Regular", Menlo, Consolas, monospace`;
    ctx.fillText(signatureId, textX, bottom);

    ctx.drawImage(img, imgX, labelRow);

    const framed = canvas.toDataURL('image/png');
    cache.set(key, framed);
    return framed;
  } catch {
    return dataUrl;
  }
}

/** The signatories with each recorded signature framed. */
export async function frameSignatories(signatories) {
  if (!Array.isArray(signatories)) return signatories;
  return Promise.all(
    signatories.map(async (s) =>
      s?.signatureId && s?.signatureData
        ? { ...s, signatureData: await frameSignature(s.signatureData, s.signatureId) }
        : s
    )
  );
}

/** A copy of an NDA whose IOTA and partner signatures are framed. */
export async function withFramedNdaSignatures(nda) {
  if (!nda) return nda;
  const [iotaSignatories, partnerSignatories] = await Promise.all([
    frameSignatories(nda.iotaSignatories),
    frameSignatories(nda.partnerSignatories),
  ]);
  return { ...nda, iotaSignatories, partnerSignatories };
}
