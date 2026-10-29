// Pay arithmetic for a payroll being prepared, shared by the Generate screen
// and its review panel. It mirrors what the API saves for the run.

export const num = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const sar = (value) =>
  `SAR ${num(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The row's pay after HR edits the allowances or the extra deduction. */
export const recalculateRow = (row) => {
  const transportAllowance = num(row.transportAllowance);
  const otherAllowances = num(row.otherAllowances);
  const manualDeductionAmount = num(row.manualDeductionAmount);
  const grossSalary =
    num(row.basicSalary) + num(row.housingAllowance) + transportAllowance + otherAllowances;
  const deductions = num(row.gosiDeduction) + manualDeductionAmount;
  return {
    ...row,
    transportAllowance,
    otherAllowances,
    manualDeductionAmount,
    manualDeductionRemarks: row.manualDeductionRemarks || '',
    earningsAdjustmentReason: row.earningsAdjustmentReason || '',
    grossSalary,
    deductions,
    netSalary: grossSalary - deductions,
  };
};

/** The difference between the allowances paid and the employee record's. */
export const adjustmentOf = (row) =>
  num(row.transportAllowance) -
  num(row.standardTransportAllowance) +
  num(row.otherAllowances) -
  num(row.standardOtherAllowances);

export const isAdjusted = (row) =>
  num(row.transportAllowance) !== num(row.standardTransportAllowance) ||
  num(row.otherAllowances) !== num(row.standardOtherAllowances);

/** What still has to be filled in before the row can go for approval. */
export const problemsOf = (row) => {
  const problems = [];
  if (isAdjusted(row) && !String(row.earningsAdjustmentReason || '').trim()) {
    problems.push('Justify the adjusted allowance');
  }
  if (num(row.manualDeductionAmount) > 0 && !String(row.manualDeductionRemarks || '').trim()) {
    problems.push('Give the deduction a reason');
  }
  if (num(row.netSalary) < 0) problems.push('Deductions are more than the pay');
  return problems;
};
