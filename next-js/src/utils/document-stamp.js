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
 * The lines of one page, from its pdf.js text items: { y, text, xs, ends,
 * sizes, cuts, marked }, top to bottom, in PDF user space. Items are joined into a
 * line by their baseline, as pdf.js may split a phrase into several pieces
 * (or one per glyph); only horizontal text is read. `xs`, `ends` and `sizes`
 * hold each character's left and right edge and font size; `marked` is the
 * text with " | " for a gap wider than a character, as the document check
 * reads it, and `cuts` the index in `text` of each such gap (the cells'
 * boundaries). The document check and the corrections both number lines from
 * this, so a line means the same thing to both.
 */
export function pageLines(items) {
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

  const rows = [];
  pieces.forEach((p) => {
    const row = rows[rows.length - 1];
    if (row && Math.abs(row.y - p.y) <= p.size * 0.3) row.pieces.push(p);
    else rows.push({ y: p.y, pieces: [p] });
  });

  return rows.map(({ y, pieces: row }) => {
    row.sort((a, b) => a.x - b.x);
    // Every character with its edges; a gap between pieces is a space.
    const chars = [];
    row.forEach((p, i) => {
      const prev = chars[chars.length - 1];
      if (i > 0 && p.x - prev.end > p.size * 0.15) {
        chars.push({ ch: ' ', x: prev.end, end: p.x, size: p.size });
      }
      const step = p.width / (p.str.length || 1);
      [...p.str].forEach((ch, k) => {
        chars.push({ ch, x: p.x + step * k, end: p.x + step * (k + 1), size: p.size });
      });
    });
    // Runs of white space become one space; a run wider than a character is a cell boundary.
    let text = '';
    let marked = '';
    const xs = [];
    const ends = [];
    const sizes = [];
    const cuts = [];
    for (let i = 0; i < chars.length; i += 1) {
      const c = chars[i];
      if (!/\s/.test(c.ch)) {
        text += c.ch;
        marked += c.ch;
        xs.push(c.x);
        ends.push(c.end);
        sizes.push(c.size);
      } else {
        let j = i;
        while (j + 1 < chars.length && /\s/.test(chars[j + 1].ch)) j += 1;
        if (text && j + 1 < chars.length) {
          const wide = chars[j].end - c.x > c.size;
          if (wide) cuts.push(text.length);
          text += ' ';
          marked += wide ? ' | ' : ' ';
          xs.push(c.x);
          ends.push(chars[j].end);
          sizes.push(c.size);
        }
        i = j;
      }
    }
    return { y, text, marked, xs, ends, sizes, cuts, size: Math.max(...row.map((p) => p.size)) };
  });
}

/**
 * Where each typed quotation number is printed, from pdf.js text items on one
 * page: { label (as printed), x, y, end, size }, in PDF user space.
 */
export function findQuotationNumbers(items) {
  const found = [];
  pageLines(items).forEach(({ y, text, xs, ends, size }) => {
    for (const m of text.matchAll(QUOTATION_NUMBER)) {
      const last = m.index + m[0].length - 1;
      found.push({
        label: m[0].slice(0, m[0].length - m[1].length),
        x: xs[m.index],
        end: ends[last],
        y,
        size,
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

/** The text of a PDF as the document check reads it: pages of lines, " | " between columns. */
export async function readPdfLines(blob) {
  const pages = await textItemsByPage(new Uint8Array(await blob.arrayBuffer()));
  return pages.map((items) => pageLines(items).map((l) => l.marked));
}

const channel = (v) => Math.round(v / 8) * 8;
const distance = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

/**
 * The background and text colours of each box, from the page rendered by
 * pdf.js: the background is the commonest colour on a ring just outside the
 * box, the text the pixel inside it furthest from that. A box on a shaded
 * table row is then covered in its shade, not white. Falls back to white and
 * black when the page cannot be rendered (no canvas).
 */
async function boxColours(bytes, boxesByPage) {
  const out = new Map();
  if (typeof document === 'undefined') return out;
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc ||= '/pdf.worker.min.mjs';
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  try {
    for (const [index, boxes] of boxesByPage) {
      const page = await doc.getPage(index + 1);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      await page.render({ canvasContext: ctx, viewport }).promise;
      const pixel = (x, y) => {
        const [cx, cy] = viewport.convertToViewportPoint(x, y).map(Math.round);
        if (cx < 0 || cy < 0 || cx >= canvas.width || cy >= canvas.height) return null;
        return [...ctx.getImageData(cx, cy, 1, 1).data.slice(0, 3)];
      };
      boxes.forEach((box) => {
        const ring = [];
        const pad = 1.5;
        for (let x = box.x - pad; x <= box.x + box.width + pad; x += 1.5) {
          ring.push(pixel(x, box.y - pad), pixel(x, box.y + box.height + pad));
        }
        for (let y = box.y; y <= box.y + box.height; y += 1.5) {
          ring.push(pixel(box.x - pad, y), pixel(box.x + box.width + pad, y));
        }
        const counts = new Map();
        ring.filter(Boolean).forEach((c) => {
          const key = c.map(channel).join(',');
          counts.set(key, (counts.get(key) ?? 0) + 1);
        });
        const top = [...counts.entries()].sort((x, y) => y[1] - x[1])[0];
        const bg = top ? top[0].split(',').map(Number) : [255, 255, 255];
        let ink = [0, 0, 0];
        let far = -1;
        for (let x = box.x; x <= box.x + box.width; x += 0.75) {
          for (let y = box.y; y <= box.y + box.height; y += 0.75) {
            const c = pixel(x, y);
            if (c && distance(c, bg) > far) {
              far = distance(c, bg);
              ink = c;
            }
          }
        }
        out.set(box, {
          bg: rgb(...bg.map((v) => Math.min(255, v) / 255)),
          ink: far > 60 ? rgb(...ink.map((v) => v / 255)) : BLACK,
        });
      });
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }
  return out;
}

/**
 * Prints each correction { page, line, find, replace, align } over the text
 * it replaces. The unit rewritten is the cell holding it (the run of text
 * between wide gaps), so punctuation beside the old text and a cell's
 * alignment survive: the old cell is covered in its own background colour
 * and the new one printed in the stamp font, in the old text's colour, size
 * and baseline. Amounts align to the cell's right edge; words to its left
 * edge, or its right edge in the right half of the page (an address block).
 * A longer cell may use the free space beside it, then is shrunk, to 70% at
 * most. The old words stay in the file underneath, covered. Resolves to the
 * corrections that could not be placed (the text is no longer on that line).
 */
async function applyCorrections(pdf, bytes, face, corrections) {
  const pages = await textItemsByPage(new Uint8Array(bytes.slice(0)));
  const placed = [];
  const missed = [];
  const byLine = new Map();
  corrections.forEach((c) => {
    const k = `${c.page}:${c.line}`;
    byLine.set(k, [...(byLine.get(k) ?? []), c]);
  });

  byLine.forEach((list, k) => {
    const [pageNo, lineNo] = k.split(':').map(Number);
    const items = pages[pageNo - 1];
    const lines = items ? pageLines(items) : [];
    const line = lines[lineNo - 1];
    if (!line) {
      missed.push(...list);
      return;
    }
    const { x: ox, width: pageWidth } = pdf.getPage(pageNo - 1).getCropBox();
    // Cells: [start, end) in line.text, split at the wide gaps.
    const bounds = [-1, ...line.cuts, line.text.length];
    const cells = bounds.slice(1).map((end, n) => ({ start: bounds[n] + 1, end, edits: [] }));
    list.forEach((c) => {
      let found = false;
      cells.forEach((cell) => {
        if (c.find && line.text.slice(cell.start, cell.end).includes(c.find)) {
          cell.edits.push(c);
          found = true;
        }
      });
      if (!found) missed.push(c);
    });

    cells.forEach((cell, n) => {
      if (!cell.edits.length) return;
      const old = line.text.slice(cell.start, cell.end);
      const value = cell.edits.reduce((t, c) => t.split(c.find).join(c.replace), old);
      const x0 = line.xs[cell.start];
      const x1 = line.ends[cell.end - 1];
      const size = Math.max(...line.sizes.slice(cell.start, cell.end));
      const right = cell.edits.every((c) => c.align === 'right') || x0 > ox + pageWidth / 2;
      // Free space up to the neighbouring cell (or the page margin).
      const margin = ox + 28;
      const limitLeft = n > 0 ? line.ends[cells[n - 1].end - 1] + size * 0.6 : margin;
      const limitRight =
        n < cells.length - 1 ? line.xs[cells[n + 1].start] - size * 0.6 : ox + pageWidth - 28;
      const room = Math.max(x1 - x0, right ? x1 - limitLeft : limitRight - x0);
      const natural = face.widthOfTextAtSize(value, size);
      const textSize = natural > room ? Math.max(size * 0.7, (size * room) / natural) : size;
      const width = face.widthOfTextAtSize(value, textSize);
      const x = right ? x1 - width : x0;
      const left = Math.min(x, x0) - 0.75;
      const boxRight = Math.max(x + width, x1) + 0.75;
      placed.push({
        index: pageNo - 1,
        box: { x: left, y: line.y - size * 0.28, width: boxRight - left, height: size * 1.22 },
        text: { value, x, y: line.y, size: textSize },
      });
    });
  });

  const byPage = new Map();
  placed.forEach((p) => byPage.set(p.index, [...(byPage.get(p.index) ?? []), p.box]));
  let colours = new Map();
  try {
    colours = await boxColours(new Uint8Array(bytes.slice(0)), byPage);
  } catch (err) {
    console.error('Page colours not read; correcting on white:', err);
  }
  placed.forEach(({ index, box, text }) => {
    const page = pdf.getPage(index);
    const { bg = WHITE, ink = BLACK } = colours.get(box) ?? {};
    page.drawRectangle({ ...box, color: bg });
    page.drawText(text.value, { x: text.x, y: text.y, size: text.size, font: face, color: ink });
  });
  return missed;
}

/**
 * The PDF as it is filed: the corrections accepted in the document check
 * printed in, then every typed quotation number reprinted as
 * `quotationNumber`, and nothing else changed. A PDF that cannot be rewritten
 * comes back as it was. Resolves to { blob, replaced, corrected, missed }.
 */
export async function rewritePdf(blob, { quotationNumber, corrections = [], font } = {}) {
  try {
    const bytes = await blob.arrayBuffer();
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    pdf.registerFontkit(fontkit);
    const face = await pdf.embedFont(font ?? (await loadFont()), { subset: true });
    const missed = corrections.length ? await applyCorrections(pdf, bytes, face, corrections) : [];
    const corrected = corrections.length - missed.length;
    const replaced = quotationNumber
      ? await replaceQuotationNumbers(pdf, new Uint8Array(bytes.slice(0)), face, quotationNumber)
      : 0;
    if (!replaced && !corrected) return { blob, replaced: 0, corrected: 0, missed };
    return {
      blob: new Blob([await pdf.save()], { type: 'application/pdf' }),
      replaced,
      corrected,
      missed,
    };
  } catch (err) {
    console.error('PDF not rewritten:', err);
    return { blob, replaced: 0, corrected: 0, missed: corrections };
  }
}

/** The PDF with every typed quotation number reprinted (see rewritePdf). */
export async function setQuotationNumber(blob, quotationNumber, { font } = {}) {
  const { blob: out, replaced } = await rewritePdf(blob, { quotationNumber, font });
  return { blob: out, replaced };
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
