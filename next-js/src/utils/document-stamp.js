import { rgb, degrees, PDFDocument, StandardFonts } from 'pdf-lib';

/**
 * The Document Management stamp, drawn on the first page of an uploaded PDF as
 * it is downloaded or previewed (bottom-right, in a white box so it reads on a
 * dark cover):
 *
 *   CONFIDENTIAL
 *   IOVQ-TIYT-QLIY · v2
 *   Captured in IOTA Document Management System
 *
 * The file kept in OneDrive is the original; only the copy handed out is
 * stamped, so it always shows the current classification. Proposals generated
 * by the dashboard print the same stamp themselves (resource-calculation-form-view).
 */

const GREEN = rgb(0.043, 0.369, 0.255);
const RED = rgb(0.718, 0.114, 0.094);
const GREY = rgb(0.4, 0.4, 0.4);
const MARGIN = 24;
const PAD = 5;

export async function stampPdf(blob, { documentId, version, classification }) {
  const pdf = await PDFDocument.load(await blob.arrayBuffer(), { ignoreEncryption: true });
  const page = pdf.getPage(0);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);

  const lines = [
    {
      text: String(classification || 'confidential').toUpperCase(),
      font: bold,
      size: 7,
      color: RED,
    },
    { text: `${documentId} · v${version}`, font: bold, size: 8, color: GREEN },
    { text: 'Captured in IOTA Document Management System', font: regular, size: 6.5, color: GREY },
  ];
  const width = Math.max(...lines.map((l) => l.font.widthOfTextAtSize(l.text, l.size))) + PAD * 2;
  const height = lines.reduce((h, l) => h + l.size + 2, 0) + PAD * 2 - 2;

  // Work in the page as the reader sees it: a rotated page is drawn in its
  // unrotated space, so the "bottom-right" corner maps to a different one.
  const { x: ox, y: oy, width: w, height: h } = page.getCropBox();
  const rotation = ((page.getRotation().angle % 360) + 360) % 360;
  const viewW = rotation % 180 ? h : w;
  // Box corner in the viewed page (origin bottom-left).
  const vx = viewW - MARGIN - width;
  const vy = MARGIN;
  const toPage = (x, y) => {
    if (rotation === 90) return { x: ox + w - y, y: oy + x };
    if (rotation === 180) return { x: ox + w - x, y: oy + h - y };
    if (rotation === 270) return { x: ox + y, y: oy + h - x };
    return { x: ox + x, y: oy + y };
  };
  const rotate = degrees(rotation);

  const corner = toPage(vx, vy);
  page.drawRectangle({
    x: corner.x,
    y: corner.y,
    width,
    height,
    rotate,
    color: rgb(1, 1, 1),
    opacity: 0.94,
    borderColor: GREEN,
    borderWidth: 0.75,
  });

  // Right-aligned lines, top to bottom.
  let top = vy + height - PAD;
  lines.forEach((l) => {
    top -= l.size;
    const at = toPage(vx + width - PAD - l.font.widthOfTextAtSize(l.text, l.size), top);
    page.drawText(l.text, { x: at.x, y: at.y, size: l.size, font: l.font, color: l.color, rotate });
    top -= 2;
  });

  return new Blob([await pdf.save()], { type: 'application/pdf' });
}
