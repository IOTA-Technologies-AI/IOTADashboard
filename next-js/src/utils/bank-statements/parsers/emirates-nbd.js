import { collapse, toNumber, amountsIn, stripArabic, directionFromBalance } from './common';

/**
 * Emirates NBD statements. Ported from IOTAPDFParser parsers/emirates_nbd.py.
 *
 * Layout: "17JUL25 <description> <amount> <balance>", descriptions continuing
 * on following lines, "BROUGHT FORWARD" / "CARRIED FORWARD" for the opening
 * and closing balances.
 */

const CURRENCY = 'AED';
const ROW_START = /^(\d{2})([A-Z]{3})(\d{2})\s+(.+)/i;
const MONTHS = {
  JAN: '01',
  FEB: '02',
  MAR: '03',
  APR: '04',
  MAY: '05',
  JUN: '06',
  JUL: '07',
  AUG: '08',
  SEP: '09',
  OCT: '10',
  NOV: '11',
  DEC: '12',
};
const FOOTERS = [
  /Confirmation of the correctness.*$/i,
  /Emirates NBD Bank.*$/i,
  /Head Office:.*$/i,
  /Tel \+971.*$/i,
  /Registered Details:.*$/i,
  /Paid Up Capital.*$/i,
  /Commercial Registration.*$/i,
  /Tax Registration Number.*$/i,
  /Page \d+ of \d+.*$/i,
  /Need help\?.*$/i,
  /emiratesnbd\.com.*$/i,
  /Phone Banking:.*$/i,
  /Keep your banking.*$/i,
];

const ddmmyyyy = (s) => {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
};

function category(description) {
  const d = description.toLowerCase();
  if (['salary', 'payroll'].some((w) => d.includes(w))) return 'Salary';
  if (['rent', 'lease'].some((w) => d.includes(w))) return 'Rent';
  if (['transfer', 'neft', 'rtgs'].some((w) => d.includes(w))) return 'Transfer';
  if (['fee', 'charge'].some((w) => d.includes(w))) return 'Bank Charges';
  if (['tax', 'vat'].some((w) => d.includes(w))) return 'Tax';
  return 'Other';
}

function cleanDescription(raw) {
  let desc = collapse(raw.replace(/\d[\d,]*\.\d{2}/g, ' '));
  for (const re of FOOTERS) desc = desc.replace(re, '');
  desc = stripArabic(desc);
  if (desc.length > 200) {
    for (const sep of [' Cr ', ' Dr ', ' VALUE DATE:', ' Confirmation']) {
      if (desc.includes(sep)) {
        desc = `${desc.split(sep)[0].trim()} Cr`;
        break;
      }
    }
    if (desc.length > 200) desc = `${desc.slice(0, 197)}...`;
  }
  return desc;
}

export function parseEmiratesNbd(text) {
  const lines = text.split('\n').map(collapse).filter(Boolean);

  const brought = text.match(/BROUGHT FORWARD\s+(\d[\d,]*\.\d{2})/i);
  const carried = text.match(/CARRIED FORWARD\s+(\d[\d,]*\.\d{2})/i);
  const opening = brought ? toNumber(brought[1]) : null;

  const rows = [];
  for (const line of lines) {
    if (/BROUGHT FORWARD|CARRIED FORWARD/i.test(line)) continue;
    const start = line.match(ROW_START);
    if (start && MONTHS[start[2].toUpperCase()]) {
      rows.push({
        date: `20${start[3]}-${MONTHS[start[2].toUpperCase()]}-${start[1]}`,
        lines: [start[4]],
      });
    } else if (rows.length) {
      rows[rows.length - 1].lines.push(line);
    }
  }

  const transactions = [];
  let previous = opening;
  for (const row of rows) {
    const joined = row.lines.join(' ');
    const amounts = amountsIn(joined);
    const hasBalance = amounts.length >= 2;
    const balance = hasBalance ? amounts[amounts.length - 1] : null;
    const tx = {
      transactionDate: row.date,
      description: cleanDescription(joined),
      debit: 0,
      credit: 0,
      balance: balance ?? 0,
      currency: CURRENCY,
    };
    Object.assign(
      tx,
      directionFromBalance(tx, hasBalance ? previous : null, amounts[amounts.length - 2])
    );
    tx.rawDescription = tx.description;
    tx.category = category(tx.description);
    if (balance !== null) previous = balance;
    if (tx.amount > 0) transactions.push(tx);
  }

  const period = text.match(/From\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
  const account = text.match(/(\d{10,16})\s*Account No\./i);
  const name = text.match(/M\/S\.\s*([A-Z][A-Z\s]+?)(?:\n|OF\d)/);
  const iban = text.match(/IBAN\s*(AE[\dX\s]+)/i);
  const branch = text.match(/Branch\s+([A-Z][A-Z\s,]+?)(?:\n|TRN)/i);

  return {
    bankName: 'Emirates NBD',
    bankId: 'emirates_nbd',
    accountInfo: {
      accountNumber: account ? account[1] : '',
      accountName: name ? name[1].trim() : '',
      iban: iban ? iban[1].replace(/\s/g, '') : '',
      branchName: branch ? branch[1].trim() : '',
      accountType: 'current',
      currency: CURRENCY,
    },
    statementInfo: {
      periodStart: period ? ddmmyyyy(period[1]) : null,
      periodEnd: period ? ddmmyyyy(period[2]) : null,
      openingBalance: opening ?? 0,
      closingBalance: carried ? toNumber(carried[1]) : (previous ?? 0),
      currency: CURRENCY,
    },
    transactions,
  };
}
