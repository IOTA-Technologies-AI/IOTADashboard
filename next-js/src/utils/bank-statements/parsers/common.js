/** Helpers shared by the bank statement parsers. */

export const ARABIC = /[\u0600-\u06FF\uFE70-\uFEFF]+/g;
export const AMOUNT = /\d[\d,]*\.\d{2}/g;

export const toNumber = (s) => parseFloat(String(s).replace(/,/g, ''));
export const amountsIn = (text) => (String(text).match(AMOUNT) || []).map(toNumber);
export const collapse = (text) => String(text).replace(/\s+/g, ' ').trim();
export const stripArabic = (text) => collapse(String(text).replace(ARABIC, ' '));
export const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Debit or credit from the running balance — a statement prints the amount
 * in a Debit or a Credit column, which plain text can't tell apart, but the
 * balance moving up or down can.
 */
export function directionFromBalance(tx, previousBalance, fallbackAmount) {
  if (previousBalance !== null && previousBalance !== undefined && Number.isFinite(tx.balance)) {
    const change = round2(tx.balance - previousBalance);
    const amount = Math.abs(change);
    return change > 0
      ? { credit: amount, debit: 0, transactionType: 'credit', amount }
      : { debit: amount, credit: 0, transactionType: 'debit', amount };
  }
  // No balance to compare with: the amount, assumed to be money out.
  const amount = Number.isFinite(fallbackAmount) ? fallbackAmount : 0;
  return { debit: amount, credit: 0, transactionType: 'debit', amount };
}

/**
 * Opening + credits − debits should equal the closing balance. A mismatch
 * means a transaction was missed or misread, so the import says so.
 */
export function reconcile(statementInfo, transactions) {
  const net = transactions.reduce((sum, t) => sum + (t.credit || 0) - (t.debit || 0), 0);
  const expected = round2((statementInfo.openingBalance || 0) + net);
  const difference = round2((statementInfo.closingBalance || 0) - expected);
  return { expectedClosingBalance: expected, difference, balanced: Math.abs(difference) < 0.01 };
}
