import { stampForOffice } from 'src/utils/iota-offices';

// ----------------------------------------------------------------------
// Embeds signatures and the company stamp into an uploaded NDA PDF.
//
// One implementation for Finalize, Print and Download with Stamp &
// Signatures. They used to be three copies of the same loop, each of which
// threw on the first zone whose signatory had not signed yet — so a download
// taken while the partner was still pending failed outright with "Failed to
// process document for download" and no reason.
// ----------------------------------------------------------------------

/** Chunked btoa — a spread over a large PDF overflows the call stack. */
export function uint8ToBase64(bytes) {
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export const base64ToUint8 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

const fmtDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** "Ahmed Ali · 08 Oct 2026" — printed under each signature. */
export function signatureCaption(signatory) {
  if (!signatory) return '';
  return [signatory.name || signatory.email, fmtDate(signatory.signedAt)]
    .filter(Boolean)
    .join(' · ');
}

/** Fits `text` into `maxWidth` by shrinking the font, then truncating. */
function fitText(font, text, maxWidth, maxSize) {
  let size = maxSize;
  while (size > 5 && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.5;
  let out = text;
  while (out.length > 1 && font.widthOfTextAtSize(out, size) > maxWidth) {
    out = `${out.slice(0, -2)}…`;
  }
  return { text: out, size };
}

async function embedSignature(pdfDoc, dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) return null;
  const bytes = base64ToUint8(dataUrl.split(',')[1] || '');
  // Trust the bytes, not the label: a PNG starts with 0x89 'P' 'N' 'G'.
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
  return isPng ? pdfDoc.embedPng(bytes) : pdfDoc.embedJpg(bytes);
}

/**
 * @param {object} params
 * @param {string} params.base64          the source PDF
 * @param {object} params.nda             NDA record (signatories, iotaOffice)
 * @param {Array}  params.signatureZones  IOTA zones
 * @param {Array}  params.partnerSignatureZones
 * @param {Array}  params.stampPlacements
 * @param {boolean} [params.requireAllSigned] true for Finalize: an unsigned
 *        zone is an error. Otherwise it is left blank and reported in `pending`.
 * @returns {Promise<{ base64: string, pending: string[] }>}
 */
export async function stampNdaPdf({
  base64,
  nda,
  signatureZones = [],
  partnerSignatureZones = [],
  stampPlacements = [],
  requireAllSigned = false,
}) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

  let pdfDoc;
  try {
    // ignoreEncryption: PDFs exported with "restrict editing" carry an
    // owner password; pdf-lib refuses them by default although they open fine.
    pdfDoc = await PDFDocument.load(base64ToUint8(base64), { ignoreEncryption: true });
  } catch (err) {
    throw new Error(`The uploaded file could not be read as a PDF (${err?.message || err}).`);
  }
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pending = [];

  const placeZones = async (zones, signatories, indexKey, side) => {
    for (const zone of zones) {
      const page = pages[Math.max(0, (zone.page || 1) - 1)];
      if (!page) continue;
      const signatory = signatories[zone[indexKey] ?? 0];
      const who =
        signatory?.name || signatory?.email || `${side} signatory ${(zone[indexKey] ?? 0) + 1}`;

      if (!signatory?.signedAt || !signatory?.signatureData) {
        if (requireAllSigned) throw new Error(`${who} (${side}) has not signed yet.`);
        if (!pending.includes(who)) pending.push(who);
        continue;
      }

      const { width: pw, height: ph } = page.getSize();
      const x = (zone.xPct / 100) * pw;
      const top = ph - (zone.yPct / 100) * ph;
      const w = (zone.widthPct / 100) * pw;
      const h = (zone.heightPct / 100) * ph;

      // Bottom of the zone carries the signer's name and date; the signature
      // image fills the rest, keeping its proportions.
      const captionSize = Math.max(6, Math.min(9, h * 0.18));
      const captionH = captionSize + 3;
      const imageH = Math.max(0, h - captionH);

      let image = null;
      try {
        image = await embedSignature(pdfDoc, signatory.signatureData);
      } catch (err) {
        console.warn(`[nda-pdf] signature image for ${who} unreadable:`, err);
      }
      if (image && imageH > 0) {
        const scale = Math.min(w / image.width, imageH / image.height);
        const iw = image.width * scale;
        const ih = image.height * scale;
        page.drawImage(image, { x: x + (w - iw) / 2, y: top - ih, width: iw, height: ih });
      } else {
        // No usable image — the typed name stands in for it.
        const fitted = fitText(font, signatory.name || signatory.email, w, Math.min(16, imageH));
        page.drawText(fitted.text, {
          x,
          y: top - imageH / 2 - fitted.size / 2,
          size: fitted.size,
          font,
          color: rgb(0.05, 0.1, 0.3),
        });
      }

      const caption = fitText(font, signatureCaption(signatory), w, captionSize);
      page.drawText(caption.text, {
        x,
        y: top - h + 1,
        size: caption.size,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
    }
  };

  await placeZones(
    signatureZones,
    Array.isArray(nda?.iotaSignatories) ? nda.iotaSignatories : [],
    'iotaSignatoryIndex',
    'IOTA'
  );
  await placeZones(
    partnerSignatureZones,
    Array.isArray(nda?.partnerSignatories) ? nda.partnerSignatories : [],
    'partnerSignatoryIndex',
    'partner'
  );

  if (stampPlacements.length > 0) {
    const stampAsset = stampForOffice(nda?.iotaOffice);
    if (!stampAsset) {
      throw new Error(
        `No company stamp is configured for office "${nda?.iotaOffice}". ` +
          'Remove the stamp placements, or execute this agreement from an office that has one.'
      );
    }
    const res = await fetch(stampAsset);
    if (!res.ok) throw new Error(`The company stamp image could not be loaded (${res.status}).`);
    const stampImage = await pdfDoc.embedPng(new Uint8Array(await res.arrayBuffer()));
    for (const placement of stampPlacements) {
      const page = pages[Math.max(0, (placement.page || 1) - 1)];
      if (!page) continue;
      const { width: pw, height: ph } = page.getSize();
      const stampW = (placement.widthPct / 100) * pw;
      const stampH = stampW * (stampImage.height / stampImage.width);
      page.drawImage(stampImage, {
        x: (placement.xPct / 100) * pw - stampW / 2,
        y: ph - (placement.yPct / 100) * ph - stampH / 2,
        width: stampW,
        height: stampH,
        opacity: 0.85,
      });
    }
  }

  return { base64: uint8ToBase64(await pdfDoc.save()), pending };
}
