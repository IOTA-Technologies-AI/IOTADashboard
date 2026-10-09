import { it, expect, describe } from 'vitest';

import { computeDocumentTotals } from './vat-calculator';

describe('computeDocumentTotals', () => {
  it('charges VAT on the items when there is no discount or shipping', () => {
    expect(computeDocumentTotals({ subtotal: 1000, ratePercent: 15 })).toMatchObject({
      taxableAmount: 1000,
      vatAmount: 150,
      total: 1150,
    });
  });

  it('charges VAT after the discount, not before it', () => {
    // Regression: invoices used to charge 15% on 1000 (150) and then take 100 off.
    const t = computeDocumentTotals({ subtotal: 1000, discount: 100, ratePercent: 15 });
    expect(t.taxableAmount).toBe(900);
    expect(t.vatAmount).toBe(135);
    expect(t.total).toBe(1035);
  });

  it('treats shipping as part of the taxable supply', () => {
    const t = computeDocumentTotals({ subtotal: 1000, discount: 100, shipping: 50, ratePercent: 15 });
    expect(t.taxableAmount).toBe(950);
    expect(t.vatAmount).toBe(142.5);
    expect(t.total).toBe(1092.5);
  });

  it('ignores the sign of the discount', () => {
    const a = computeDocumentTotals({ subtotal: 500, discount: 50, ratePercent: 5 });
    const b = computeDocumentTotals({ subtotal: 500, discount: -50, ratePercent: 5 });
    expect(a).toEqual(b);
  });

  it('rounds each figure to 2 dp and keeps total = taxable + VAT', () => {
    const t = computeDocumentTotals({ subtotal: 333.335, discount: 0.01, ratePercent: 15 });
    expect(t.subtotal).toBe(333.34);
    expect(t.taxableAmount).toBe(333.33);
    expect(t.vatAmount).toBe(50);
    expect(t.total).toBe(383.33);
    expect(Math.round((t.taxableAmount + t.vatAmount) * 100) / 100).toBe(t.total);
  });

  it('never produces negative VAT when the discount exceeds the bill', () => {
    const t = computeDocumentTotals({ subtotal: 100, discount: 250, ratePercent: 15 });
    expect(t.taxableAmount).toBe(0);
    expect(t.vatAmount).toBe(0);
    expect(t.total).toBe(0);
  });

  it('adds nothing for a zero-rated office', () => {
    const t = computeDocumentTotals({ subtotal: 1200, discount: 200, ratePercent: 0 });
    expect(t.vatAmount).toBe(0);
    expect(t.total).toBe(1000);
  });

  it('handles missing values', () => {
    expect(computeDocumentTotals({ subtotal: undefined })).toMatchObject({
      taxableAmount: 0,
      vatAmount: 0,
      total: 0,
    });
  });
});
