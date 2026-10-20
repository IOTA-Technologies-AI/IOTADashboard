import { parseSaib } from './parsers/saib';
import { reconcile } from './parsers/common';
import { parseEmiratesNbd } from './parsers/emirates-nbd';
import { StatementReadError, extractStatementText } from './extract-text';

/**
 * Reading bank statement PDFs, in the dashboard itself. This replaced the
 * IOTAPDFParser Python service on Render (ISS-0011): same output shape —
 * { bankName, bankId, accountInfo, statementInfo, transactions } — plus
 * `reconciliation`, so an import that doesn't add up says so.
 *
 * Server-side only: used by /api/banking/parse-statement.
 */

const PARSERS = {
  saib: parseSaib,
  emirates_nbd: parseEmiratesNbd,
};

export const SUPPORTED_STATEMENT_BANKS = Object.keys(PARSERS);

export { StatementReadError };

export async function parseBankStatement(buffer, bankId, password = '') {
  const parse = PARSERS[bankId];
  if (!parse) {
    throw new StatementReadError(
      'Statements from this bank cannot be read yet. Supported: Saudi Investment Bank and Emirates NBD.'
    );
  }

  const text = await extractStatementText(buffer, password);
  const result = parse(text);

  if (!result.transactions.length) {
    throw new StatementReadError(
      `No transactions were found. Check that this is a ${result.bankName} statement and the right bank account is selected.`
    );
  }
  return { ...result, reconciliation: reconcile(result.statementInfo, result.transactions) };
}
