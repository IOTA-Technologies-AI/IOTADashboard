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
 */

export const STAMP_CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
export const DEFAULT_STAMP_POSITIONS = { classification: 'top-right', documentId: 'top-right' };
export const STAMP_FONT_URL = '/fonts/IBMPlexSansCondensed-Regular.ttf';
export const STAMP_NOTE = 'Captured in IOTA Document Management System';

const RED = rgb(0.718, 0.114, 0.094);
const GREEN = rgb(0.043, 0.369, 0.255);
const GREY = rgb(0.4, 0.4, 0.4);
const MARGIN = 18;
const LEADING = 2;

let fontBytes;
const loadFont = async () => {
  fontBytes ??= fetch(STAMP_FONT_URL).then((res) => {
    if (!res.ok) throw new Error(`Stamp font unavailable (${res.status})`);
    return res.arrayBuffer();
  });
  return fontBytes;
};

/** The stamp's parts and their lines, top to bottom. */
export function stampParts({ documentId, version, classification }) {
  return {
    classification: [
      { text: String(classification || 'confidential').toUpperCase(), size: 8, color: RED },
    ],
    documentId: [
      { text: `${documentId} · v${version}`, size: 8.5, color: GREEN },
      { text: STAMP_NOTE, size: 6.5, color: GREY },
    ],
  };
}

export async function stampPdf(blob, { documentId, version, classification, positions, font }) {
  const pdf = await PDFDocument.load(await blob.arrayBuffer(), { ignoreEncryption: true });
  pdf.registerFontkit(fontkit);
  const face = await pdf.embedFont(font ?? (await loadFont()), { subset: true });
  const page = pdf.getPage(0);

  const where = { ...DEFAULT_STAMP_POSITIONS, ...positions };
  const parts = stampParts({ documentId, version, classification });

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
