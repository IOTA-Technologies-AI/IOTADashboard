import fontkit from '@pdf-lib/fontkit';
import { rgb, degrees, PDFDocument } from 'pdf-lib';

/**
 * The Document Management stamp, printed as plain text (no box) on the first
 * page of an uploaded PDF as it is downloaded or previewed:
 *
 *   CONFIDENTIAL                                  ← the classification
 *   IOVQ-TIYT-QLIY · v2                           ← the document ID line
 *   Captured in IOTA Document Management System
 *
 * Each part goes in the corner chosen for the document (stampPositions,
 * default top-right for both); parts sharing a corner stack, classification
 * first. Set in IBM Plex Sans Condensed Regular. The file kept in OneDrive is
 * the original; only the copy handed out is stamped, so it always shows the
 * current classification. Generated proposals print the same stamp themselves
 * (resource-calculation-form-view, STAMP_* there).
 *
 * With `quotationNumber`, a quotation number typed into the file as
 * "Quotation #XXXX-XXXX-XXXX" (optionally already "-v2") is printed over with
 * the current one wherever it sits, on any page, so a proposal copied from an
 * older one cannot go out quoting that one's number (see replaceQuotationNumbers).
 */

export const STAMP_CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
export const DEFAULT_STAMP_POSITIONS = {
  classification: 'top-right',
  documentId: 'top-right',
  documentIdTone: 'dark',
};
/**
 * Colours of the document ID line and its note, chosen per document
 * (stampPositions.documentIdTone): dark for a light page, light for a dark
 * one, such as a full-bleed cover image.
 */
export const STAMP_TONES = {
  dark: { label: 'Dark', id: '#0B5E41', note: '#666666' },
  light: { label: 'Light', id: '#9BE8C5', note: '#E6E6E6' },
};
export const STAMP_FONT_URL = '/fonts/IBMPlexSansCondensed-Regular.ttf';
export const STAMP_NOTE = 'Captured in IOTA Document Management System';

const RED = rgb(0.718, 0.114, 0.094);
const hexRgb = (hex) => rgb(...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255));
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const MARGIN = 18;
const LEADING = 2;

/**
 * "Quotation #9Y54-S822-1CLC", "Quotation No: 9Y54-S822-1CLC-v2" … — the label
 * as printed, then a document ID (with any version after it) in group 1.
 */
const QUOTATION_NUMBER =
  /Quotation\s*(?:#|No\.?|Number)\s*:?\s*#?\s*([A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}(?:\s*[-·]?\s*v\d+)?)/gi;

let fontBytes;
const loadFont = async () => {
  fontBytes ??= fetch(STAMP_FONT_URL).then((res) => {
    if (!res.ok) throw new Error(`Stamp font unavailable (${res.status})`);
    return res.arrayBuffer();
  });
  return fontBytes;
};

/** The stamp's parts and their lines, top to bottom. */
export function stampParts({ documentId, version, classification, tone }) {
  const colors = STAMP_TONES[tone] ?? STAMP_TONES.dark;
  return {
    classification: [
      { text: String(classification || 'confidential').toUpperCase(), size: 8, color: RED },
    ],
    documentId: [
      { text: `${documentId} · v${version}`, size: 8.5, color: hexRgb(colors.id) },
      { text: STAMP_NOTE, size: 6.5, color: hexRgb(colors.note) },
    ],
  };
}

/**
 * Where each typed quotation number is printed, from pdf.js text items on one
 * page: { text (the label as printed), x, y, end, size }, in PDF user space.
 * Items are joined into lines by their baseline, as pdf.js may split a phrase
 * into several pieces (or one per glyph); only horizontal text is read.
 */
export function findQuotationNumbers(items) {
  const pieces = items
    .filter((it) => it.str && !it.transform[1] && !it.transform[2])
    .map((it) => ({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
      width: it.width || 0,
      size: Math.abs(it.transform[3]) || 10,
    }))
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const lines = [];
  pieces.forEach((p) => {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line.y - p.y) <= p.size * 0.3) line.pieces.push(p);
    else lines.push({ y: p.y, pieces: [p] });
  });

  const found = [];
  lines.forEach(({ y, pieces: row }) => {
    row.sort((a, b) => a.x - b.x);
    // The line's text, and the x of every character in it.
    let text = '';
    const xs = [];
    const ends = [];
    row.forEach((p, i) => {
      if (i > 0 && p.x - ends[ends.length - 1] > p.size * 0.15) {
        text += ' ';
        xs.push(ends[ends.length - 1]);
        ends.push(p.x);
      }
      const step = p.width / (p.str.length || 1);
      [...p.str].forEach((ch, k) => {
        text += ch;
        xs.push(p.x + step * k);
        ends.push(p.x + step * (k + 1));
      });
    });
    for (const m of text.matchAll(QUOTATION_NUMBER)) {
      const last = m.index + m[0].length - 1;
      found.push({
        label: m[0].slice(0, m[0].length - m[1].length),
        x: xs[m.index],
        end: ends[last],
        y,
        size: Math.max(...row.map((p) => p.size)),
      });
    }
  });
  return found;
}

/** pdf.js text items of every page, keyed by page index. */
async function textItemsByPage(bytes) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc ||= '/pdf.worker.min.mjs';
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  try {
    const pages = [];
    for (let n = 1; n <= doc.numPages; n += 1) {
      const page = await doc.getPage(n);
      pages.push((await page.getTextContent()).items);
    }
    return pages;
  } finally {
    await doc.destroy();
  }
}

/**
 * Prints `quotationNumber` over each typed quotation number: the old one is
 * covered with white and the label reprinted in the stamp font at the same
 * size and baseline — aligned to its right edge when it sat in the right half
 * of the page (e.g. top right), to its left edge otherwise. Assumes the number
 * sits on a white background, as on IOTA's proposal template. Returns how
 * many were replaced.
 */
async function replaceQuotationNumbers(pdf, bytes, face, quotationNumber) {
  const pages = await textItemsByPage(bytes);
  let count = 0;
  pages.forEach((items, index) => {
    const page = pdf.getPage(index);
    const { x: ox, width: w } = page.getCropBox();
    findQuotationNumbers(items).forEach((hit) => {
      const text = `${hit.label}${quotationNumber}`;
      const width = face.widthOfTextAtSize(text, hit.size);
      const alignRight = hit.end > ox + w / 2;
      const x = alignRight ? hit.end - width : hit.x;
      const left = Math.min(x, hit.x) - 1;
      const right = Math.max(x + width, hit.end) + 1;
      page.drawRectangle({
        x: left,
        y: hit.y - hit.size * 0.3,
        width: right - left,
        height: hit.size * 1.3,
        color: WHITE,
      });
      page.drawText(text, { x, y: hit.y, size: hit.size, font: face, color: BLACK });
      count += 1;
    });
  });
  return count;
}

export async function stampPdf(
  blob,
  { documentId, version, classification, positions, font, quotationNumber }
) {
  const bytes = await blob.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  pdf.registerFontkit(fontkit);
  const face = await pdf.embedFont(font ?? (await loadFont()), { subset: true });
  if (quotationNumber) {
    try {
      // A copy: pdf.js takes ownership of the buffer it is given.
      await replaceQuotationNumbers(pdf, new Uint8Array(bytes.slice(0)), face, quotationNumber);
    } catch (err) {
      // The stamp still goes on; only the typed number is left as it was.
      console.error('Quotation number not replaced:', err);
    }
  }
  const page = pdf.getPage(0);

  const where = { ...DEFAULT_STAMP_POSITIONS, ...positions };
  const parts = stampParts({ documentId, version, classification, tone: where.documentIdTone });

  // Lines per corner, classification first when both share one.
  const corners = {};
  ['classification', 'documentId'].forEach((part) => {
    const corner = STAMP_CORNERS.includes(where[part]) ? where[part] : 'top-right';
    corners[corner] = [...(corners[corner] ?? []), ...parts[part]];
  });

  // Work in the page as the reader sees it: a rotated page is drawn in its
  // unrotated space, so each viewed corner maps to a different one.
  const { x: ox, y: oy, width: w, height: h } = page.getCropBox();
  const rotation = ((page.getRotation().angle % 360) + 360) % 360;
  const viewW = rotation % 180 ? h : w;
  const viewH = rotation % 180 ? w : h;
  const toPage = (x, y) => {
    if (rotation === 90) return { x: ox + w - y, y: oy + x };
    if (rotation === 180) return { x: ox + w - x, y: oy + h - y };
    if (rotation === 270) return { x: ox + y, y: oy + h - x };
    return { x: ox + x, y: oy + y };
  };
  const rotate = degrees(rotation);

  Object.entries(corners).forEach(([corner, lines]) => {
    const top = corner.startsWith('top');
    const right = corner.endsWith('right');
    const blockHeight = lines.reduce((sum, l) => sum + l.size + LEADING, 0) - LEADING;
    // Baseline of the first line, in the viewed page (origin bottom-left).
    let y = top ? viewH - MARGIN - lines[0].size : MARGIN + blockHeight - lines[0].size;
    lines.forEach((l, i) => {
      if (i > 0) y -= l.size + LEADING;
      const width = face.widthOfTextAtSize(l.text, l.size);
      const at = toPage(right ? viewW - MARGIN - width : MARGIN, y);
      page.drawText(l.text, { x: at.x, y: at.y, size: l.size, font: face, color: l.color, rotate });
    });
  });

  return new Blob([await pdf.save()], { type: 'application/pdf' });
}
