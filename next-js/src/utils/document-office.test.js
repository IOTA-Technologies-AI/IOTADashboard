import { it, expect, describe } from 'vitest';

import { resolveDocumentOffice } from './document-office';

const offices = [
  { id: 'iota-saudi', name: 'IOTA Saudi Arabia', currency: 'SAR' },
  { id: 'iota-uae', name: 'IOTA UAE', currency: 'AED' },
];

describe('resolveDocumentOffice', () => {
  it('returns the office billing in the document currency', () => {
    expect(resolveDocumentOffice('AED', offices).id).toBe('iota-uae');
    expect(resolveDocumentOffice('sar', offices).id).toBe('iota-saudi');
  });

  it('refuses an unknown currency instead of falling back to the Saudi entity', () => {
    // Regression: print pages used `|| list[0]`, printing USD invoices as IOTA Saudi.
    expect(() => resolveDocumentOffice('USD', offices)).toThrow(/No IOTA office bills in USD/);
  });

  it('refuses when two offices share a currency', () => {
    const dup = [...offices, { id: 'iota-ksa-2', name: 'Second KSA', currency: 'SAR' }];
    expect(() => resolveDocumentOffice('SAR', dup)).toThrow(/More than one IOTA office/);
  });

  it('refuses a document with no currency', () => {
    expect(() => resolveDocumentOffice('', offices)).toThrow(/no currency/);
    expect(() => resolveDocumentOffice('SAR', [])).toThrow(/No IOTA office/);
  });
});
