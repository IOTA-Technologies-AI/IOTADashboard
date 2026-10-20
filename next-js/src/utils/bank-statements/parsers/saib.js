import { collapse, toNumber, amountsIn, stripArabic, directionFromBalance } from './common';

/**
 * Saudi Investment Bank (SAIB) statements. Ported from IOTAPDFParser
 * parsers/saib.py, with these corrections:
 *  - any year, not only 2025 (the Python matched "2025/" literally, so 2026
 *    statements found no transactions and no opening balance);
 *  - a transaction line is recognised by its date before header words are
 *    filtered, so a description containing "Account", "Balance" or "Credit"
 *    is no longer dropped;
 *  - the closing balance label is matched in either Arabic character order
 *    (pdf.js and pdfplumber order Arabic differently), and falls back to the
 *    last running balance;
 *  - rows that move no money (the opening balance row) are not imported.
 *
 * Layout: "YYYY/MM/ <description> YYYY/MM/DD <debit|credit> <balance> د",
 * descriptions continuing on following lines.
 */

const CURRENCY = 'SAR';
/** A transaction starts with a posting date printed without its day: "2026/08/ ". */
const ROW_START = /^(\d{4})\/(\d{2})\/\s+(.+)/;
const FULL_DATE = /\b(\d{4})\/(\d{2})\/(\d{2})\b/;
/**
 * Amount followed by the riyal mark — the running balance. The statement
 * prints it as the letter "د" (U+062F, or its presentation forms U+FEA9/FEAA);
 * U+20C1 is the new Saudi riyal sign.
 */
const BALANCE_MARKED = /(\d[\d,]*\.\d{2})\s*[\u062F\uFEA9\uFEAA\u20C1]/;
const CLOSING_LABELS = [
  /يئاهنلا\s*ديصرلا\s*(\d[\d,]*\.\d{2})/, // pdfplumber (visual order)
  /الرصيد\s*النهائي\s*(\d[\d,]*\.\d{2})/, // logical order
  /(\d[\d,]*\.\d{2})\s*\S*\s*الرصيد\s*النهائي/,
  /Closing\s+Balance\s*:?\s*(\d[\d,]*\.\d{2})/i,
];
const HEADER_WORDS = [
  'Statement of Account',
  'Statement no.',
  'Account',
  'Number',
  'Currency',
  'Branch',
  'IBAN',
  'Page',
  'Posted',
  'Description',
  'Value Date',
  'Debit',
  'Credit',
  'Balance',
  'Please advise',
];

const isoDate = (y, m, d) => `${y}-${m}-${d}`;

function lineBalance(line) {
  const marked = line.match(BALANCE_MARKED);
  if (marked) return toNumber(marked[1]);
  const amounts = amountsIn(line);
  return amounts.length ? amounts[amounts.length - 1] : null;
}

function accountInfo(text) {
  const info = {
    accountNumber: '',
    accountName: '',
    iban: '',
    branchName: '',
    accountType: 'current',
    currency: CURRENCY,
  };
  const number = text.match(/Number\s+([\d-]{6,})/i);
  if (number) info.accountNumber = number[1].trim();
  const name = text.match(/Account\s+([A-Z][A-Z\s&\-,.()]+?)\s+Number/i);
  if (name) info.accountName = stripArabic(name[1]);
  const iban = text.match(/IBAN\s+(SA[\dX\s]+)/i);
  if (iban) info.iban = iban[1].replace(/\s/g, '');
  const branch = text.match(/Branch\s+([A-Z][A-Z\s]+)/i);
  if (branch) info.branchName = stripArabic(branch[1]);
  return info;
}

function category(description) {
  const d = description.toLowerCase();
  if (['salary', 'payroll', 'wps', 'batch'].some((w) => d.includes(w))) return 'Salary';
  if (['vat', 'tax'].some((w) => d.includes(w))) return 'Tax';
  if (['charge', 'fee', 'sarie'].some((w) => d.includes(w))) return 'Bank Charges';
  if (['transfer', 'payout', 'local transfer'].some((w) => d.includes(w))) return 'Transfer';
  if (['payment', 'sadad'].some((w) => d.includes(w))) return 'Payment';
  if (d.includes('amex')) return 'Income';
  return 'Other';
}

function cleanDescription(raw) {
  return stripArabic(
    raw
      .replace(/\d[\d,]*\.\d{2}/g, ' ')
      .replace(/\d{4}\/\d{2}\/\d{2}/g, ' ')
      .replace(/\d{4}\/\d{2}\//g, ' ')
  );
}

export function parseSaib(text) {
  const lines = text.split('\n').map(collapse).filter(Boolean);

  // Rows, with their continuation lines.
  const rows = [];
  for (const line of lines) {
    const start = line.match(ROW_START);
    if (start) {
      rows.push({ year: start[1], month: start[2], lines: [start[3]] });
    } else if (rows.length && !HEADER_WORDS.some((w) => line.includes(w))) {
      if (CLOSING_LABELS.some((re) => re.test(line))) continue;
      rows[rows.length - 1].lines.push(line);
    }
  }

  // The first row carries the opening balance (as in the Python parser).
  const opening = rows.length ? lineBalance(rows[0].lines.join(' ')) : null;

  const transactions = [];
  let previous = opening;
  for (const row of rows) {
    const joined = row.lines.join(' ');
    const balance = lineBalance(joined);
    const value = joined.match(FULL_DATE);
    const valueDate = value ? isoDate(value[1], value[2], value[3]) : null;
    const amounts = amountsIn(joined);
    const tx = {
      transactionDate: valueDate || isoDate(row.year, row.month, '01'),
      valueDate,
      description: cleanDescription(joined),
      debit: 0,
      credit: 0,
      balance: balance ?? 0,
      currency: CURRENCY,
    };
    Object.assign(
      tx,
      directionFromBalance(tx, balance === null ? null : previous, amounts[amounts.length - 2])
    );
    tx.rawDescription = tx.description;
    tx.category = category(tx.description);
    if (balance !== null) previous = balance;
    if (tx.amount > 0) transactions.push(tx);
  }

  const statementDate = text.match(/Date\s+(\d{4})\/(\d{2})\/(\d{2})/i);
  let closing = null;
  for (const re of CLOSING_LABELS) {
    const m = text.replace(/\n/g, ' ').match(re);
    if (m) {
      closing = toNumber(m[1]);
      break;
    }
  }
  if (closing === null) closing = previous ?? 0;

  return {
    bankName: 'Saudi Investment Bank',
    bankId: 'saib',
    accountInfo: accountInfo(text),
    statementInfo: {
      periodStart: rows.length ? isoDate(rows[0].year, rows[0].month, '01') : null,
      periodEnd: statementDate
        ? isoDate(statementDate[1], statementDate[2], statementDate[3])
        : null,
      openingBalance: opening ?? 0,
      closingBalance: closing,
      currency: CURRENCY,
    },
    transactions,
  };
}
