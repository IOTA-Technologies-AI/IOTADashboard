import { getDocumentProxy } from 'unpdf';

/**
 * The text of a bank statement PDF, one printed line per line — what the
 * parsers read. Server-side only (the /api/banking/parse-statement route).
 *
 * pdf.js returns text in positioned pieces, not lines; they are grouped by
 * their vertical position, ordered left to right, and joined with a space
 * where there is a visible gap. This mirrors pdfplumber's extract_text(),
 * which the Python parser this replaced (IOTAPDFParser, hosted on Render
 * until that subscription ended) was written against.
 */

export class StatementReadError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Items closer than this (in PDF units) vertically are on the same line. */
const LINE_TOLERANCE = 2.5;

function pageLines(items) {
  const pieces = items
    .filter((it) => typeof it.str === 'string' && it.str.length > 0)
    .map((it) => ({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
      width: it.width || 0,
      size: Math.abs(it.transform[3]) || Math.abs(it.transform[0]) || 10,
    }))
    // Top of the page first, then left to right.
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const lines = [];
  for (const piece of pieces) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line.y - piece.y) <= LINE_TOLERANCE) line.pieces.push(piece);
    else lines.push({ y: piece.y, pieces: [piece] });
  }

  return lines.map(({ pieces: row }) => {
    row.sort((a, b) => a.x - b.x);
    let text = '';
    let end = null;
    for (const p of row) {
      // A gap wider than a fraction of the font size is a space.
      if (end !== null && p.x - end > p.size * 0.15 && !text.endsWith(' ')) text += ' ';
      text += p.str;
      end = p.x + p.width;
    }
    return text.replace(/\s+/g, ' ').trim();
  });
}

export async function extractStatementText(buffer, password = '') {
  let pdf;
  try {
    pdf = await getDocumentProxy(new Uint8Array(buffer), password ? { password } : {});
  } catch (err) {
    if (err?.name === 'PasswordException') {
      throw new StatementReadError(
        password
          ? 'The PDF password is not correct.'
          : 'This statement is password protected. Enter its PDF password.'
      );
    }
    throw new StatementReadError(`The file could not be read as a PDF (${err?.message || err}).`);
  }

  const lines = [];
  for (let n = 1; n <= pdf.numPages; n += 1) {
    const page = await pdf.getPage(n);

    const content = await page.getTextContent();
    lines.push(...pageLines(content.items).filter(Boolean));
  }
  await pdf.destroy?.();

  const text = lines.join('\n');
  if (text.replace(/\s/g, '').length < 50) {
    throw new StatementReadError(
      'No text could be read from this PDF. It may be a scanned image — download the statement from online banking as a PDF instead.'
    );
  }
  return text;
}
