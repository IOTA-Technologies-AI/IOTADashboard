/**
 * Bank Statement Parser Service
 * Extensible parser for different bank statement formats (UAE & KSA)
 */

import { detectCategory } from 'src/utils/constants/banking';

// ----------------------------------------------------------------------
// EMIRATES NBD PARSER (UAE)
// ----------------------------------------------------------------------

class EmiratesNBDParser {
  constructor() {
    this.bankId = 'emirates_nbd';
    this.region = 'UAE';
  }

  parse(text) {
    const accountInfo = this.extractAccountInfo(text);
    const transactions = this.extractTransactions(text);
    const statementInfo = this.extractStatementInfo(text);

    return {
      bankId: this.bankId,
      bankName: 'Emirates NBD',
      region: this.region,
      currency: 'AED',
      accountInfo,
      statementInfo,
      transactions,
    };
  }

  extractAccountInfo(text) {
    const accountInfo = {
      accountNumber: '',
      accountName: '',
      iban: '',
      accountType: 'current',
      branchName: '',
    };

    // Account number appears BEFORE "Account No." on its own line
    const accountMatch = text.match(/(\d{10,16})\s*Account No\./i);
    if (accountMatch) accountInfo.accountNumber = accountMatch[1];

    // Also try: number right after "Account No."
    if (!accountInfo.accountNumber) {
      const altAccountMatch = text.match(/Account No\.\s*(\d+)/i);
      if (altAccountMatch) accountInfo.accountNumber = altAccountMatch[1];
    }

    // IBAN with masked characters (XXXX pattern)
    const ibanMatch = text.match(/IBAN\s*(AE[\dX\s]+)/i);
    if (ibanMatch) accountInfo.iban = ibanMatch[1].replace(/\s/g, '');

    // Company name after M/S.
    const nameMatch = text.match(/M\/S\.\s*([A-Z][A-Z\s]+)/i);
    if (nameMatch) accountInfo.accountName = nameMatch[1].trim();

    // Branch name - appears AFTER "Branch" keyword
    const branchMatch = text.match(/Branch\s+([A-Z][A-Z\s,]+?)(?:\n|TRN|Date)/i);
    if (branchMatch) accountInfo.branchName = branchMatch[1].trim();

    return accountInfo;
  }

  extractStatementInfo(text) {
    const statementInfo = {
      statementDate: null,
      periodStart: null,
      periodEnd: null,
      openingBalance: 0,
      closingBalance: 0,
    };

    const periodMatch = text.match(
      /From\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*to\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
    );
    if (periodMatch) {
      statementInfo.periodStart = this.parseDateDDMMYYYY(periodMatch[1]);
      statementInfo.periodEnd = this.parseDateDDMMYYYY(periodMatch[2]);
    }

    const openingMatch = text.match(/BROUGHT FORWARD\s*([\d,]+\.\d{2})/i);
    if (openingMatch) statementInfo.openingBalance = this.parseAmount(openingMatch[1]);

    const closingMatch = text.match(/CARRIED FORWARD\s*([\d,]+\.\d{2})/i);
    if (closingMatch) statementInfo.closingBalance = this.parseAmount(closingMatch[1]);

    return statementInfo;
  }

  extractTransactions(text) {
    const transactions = [];
    const lines = text.split('\n');
    const datePattern = /^(\d{2}[A-Z]{3}\d{2})\s+(.+)/i;

    let currentTransaction = null;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (
        trimmedLine.includes('BROUGHT FORWARD') ||
        trimmedLine.includes('CARRIED FORWARD') ||
        !trimmedLine
      ) {
        continue;
      }

      const dateMatch = trimmedLine.match(datePattern);

      if (dateMatch) {
        if (currentTransaction && currentTransaction.description) {
          transactions.push(this.finalizeTransaction(currentTransaction));
        }

        currentTransaction = {
          transactionDate: this.parseDateDDMMMYY(dateMatch[1]),
          description: dateMatch[2],
          debit: 0,
          credit: 0,
          balance: 0,
          rawLine: trimmedLine,
        };

        this.parseAmounts(currentTransaction, dateMatch[2]);
      } else if (currentTransaction) {
        currentTransaction.description += ' ' + trimmedLine;
        this.parseAmounts(currentTransaction, trimmedLine);
      }
    }

    if (currentTransaction && currentTransaction.description) {
      transactions.push(this.finalizeTransaction(currentTransaction));
    }

    return transactions;
  }

  parseAmounts(transaction, line) {
    const amountPattern = /([\d,]+\.\d{2})\s+([\d,]+\.\d{2})(?:Cr|Dr)?$/;
    const match = line.match(amountPattern);

    if (match) {
      const amount1 = this.parseAmount(match[1]);
      const amount2 = this.parseAmount(match[2]);

      if (amount2 > amount1) {
        transaction.balance = amount2;
        if (line.toLowerCase().includes('fee') || line.toLowerCase().includes('tax')) {
          transaction.debit = amount1;
        } else {
          transaction.credit = amount1;
        }
      }
    }
  }

  finalizeTransaction(transaction) {
    let desc = transaction.description
      .replace(/VALUE DATE:\d{2}-\d{2}-\d{4}/gi, '')
      .replace(/([\d,]+\.\d{2})/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const transactionType = transaction.credit > 0 ? 'credit' : 'debit';
    const category = detectCategory(desc);

    let counterparty = '';
    const cpMatch = desc.match(/([A-Z][A-Za-z\s]+(?:LLC|LTD|INC|CO)?)/i);
    if (cpMatch) counterparty = cpMatch[1].trim();

    return {
      transactionDate: transaction.transactionDate,
      description: desc,
      debit: transaction.debit,
      credit: transaction.credit,
      balance: transaction.balance,
      transactionType,
      category,
      counterparty,
      amount: transaction.credit > 0 ? transaction.credit : transaction.debit,
    };
  }

  parseAmount(amountStr) {
    if (!amountStr) return 0;
    return parseFloat(amountStr.replace(/,/g, '')) || 0;
  }

  parseDateDDMMMYY(dateStr) {
    const months = {
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
    const match = dateStr.match(/(\d{2})([A-Z]{3})(\d{2})/i);
    if (match) {
      return `20${match[3]}-${months[match[2].toUpperCase()]}-${match[1]}`;
    }
    return null;
  }

  parseDateDDMMYYYY(dateStr) {
    const match = dateStr.replace(/\s/g, '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    }
    return null;
  }
}

// ----------------------------------------------------------------------
// AL RAJHI PARSER (KSA) - Placeholder
// ----------------------------------------------------------------------

class AlRajhiParser {
  constructor() {
    this.bankId = 'al_rajhi';
    this.region = 'KSA';
  }

  parse(text) {
    // TODO: Implement when KSA statement is provided
    return {
      bankId: this.bankId,
      bankName: 'Al Rajhi Bank',
      region: this.region,
      currency: 'SAR',
      accountInfo: {},
      statementInfo: {},
      transactions: [],
    };
  }
}

// ----------------------------------------------------------------------
// PARSER FACTORY
// ----------------------------------------------------------------------

const PARSERS = {
  emirates_nbd: EmiratesNBDParser,
  al_rajhi: AlRajhiParser,
};

export function getParser(bankId) {
  const ParserClass = PARSERS[bankId];
  if (!ParserClass) {
    throw new Error(`No parser available for bank: ${bankId}`);
  }
  return new ParserClass();
}

export function detectBank(text) {
  const textLower = text.toLowerCase();

  if (textLower.includes('emirates nbd') || textLower.includes('emiratesnbd')) {
    return 'emirates_nbd';
  }
  if (textLower.includes('al rajhi') || textLower.includes('alrajhi')) {
    return 'al_rajhi';
  }
  if (textLower.includes('snb') || textLower.includes('saudi national')) {
    return 'snb';
  }

  return null;
}

export function parseStatement(text, bankId = null) {
  const detectedBankId = bankId || detectBank(text);

  if (!detectedBankId) {
    throw new Error('Unable to detect bank. Please select manually.');
  }

  const parser = getParser(detectedBankId);
  return parser.parse(text);
}
