// ─────────────────────────────────────────────────────────────────────────────
// Invoice line items, as stored in `invoices.description` (a JSON array).
//
// Every invoice line is printed in English and Arabic. This is the dashboard's
// copy of the rule; the API enforces the same one when an invoice is submitted
// for approval and when it is approved — see `shared/invoice-lines.ts` in
// IOTAApiServer. Keep the two in step.
// ─────────────────────────────────────────────────────────────────────────────

const ARABIC_LETTER = /[؀-ۿݐ-ݿ]/;
const LATIN_LETTER = /[A-Za-z]/;

export const hasArabicText = (value) => ARABIC_LETTER.test(String(value || ''));
export const hasEnglishText = (value) => LATIN_LETTER.test(String(value || ''));

const text = (value) => (typeof value === 'string' ? value.trim() : '');

/** The stored lines, or an empty list when the column holds no line array. */
export function parseInvoiceLines(description) {
  if (typeof description !== 'string' || !description.trim()) return [];
  let parsed;
  try {
    parsed = JSON.parse(description);
  } catch {
    // plain text on invoices older than the line editor
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item) => ({
    title: text(item?.title),
    titleAr: text(item?.titleAr),
    description: text(item?.description),
    descriptionAr: text(item?.descriptionAr),
    quantity: Number(item?.quantity ?? 1) || 1,
    price: Number(item?.price) || 0,
  }));
}

/** What stops one line from being bilingual; empty when it is complete. */
export function bilingualLineProblems(line) {
  const title = text(line?.title);
  const titleAr = text(line?.titleAr);
  const description = text(line?.description);
  const descriptionAr = text(line?.descriptionAr);

  const problems = [];
  if (!title) problems.push('English title is missing');
  else if (!hasEnglishText(title)) problems.push('English title is not in English');
  if (!titleAr) problems.push('Arabic title is missing');
  else if (!hasArabicText(titleAr)) problems.push('Arabic title is not in Arabic');

  // A description is optional, but never in one language only.
  if (description && !descriptionAr) problems.push('Arabic description is missing');
  if (descriptionAr && !description) problems.push('English description is missing');
  if (description && !hasEnglishText(description))
    problems.push('English description is not in English');
  if (descriptionAr && !hasArabicText(descriptionAr))
    problems.push('Arabic description is not in Arabic');
  return problems;
}

/**
 * One entry per incomplete line — `{ line, problems }`, `line` counted from 1.
 * Empty when every line is in both languages. An invoice with no lines at all
 * is reported as a single entry for line 0.
 */
export function bilingualLineFaults(lines) {
  if (!lines?.length) return [{ line: 0, problems: ['The invoice has no line items'] }];
  return lines
    .map((line, index) => ({ line: index + 1, problems: bilingualLineProblems(line) }))
    .filter((fault) => fault.problems.length);
}
