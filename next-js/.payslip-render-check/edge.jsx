import React from 'react';
import { renderToFile } from '@react-pdf/renderer';
import { PayslipDocument } from './payslip-document.jsx';

const out = process.argv[2];

// A newly-joined employee: mid-month start, unpaid leave, an advance
// repayment, no GOSI on file yet, and no YTD (first run of the year).
const lineItem = {
  id: 2,
  employeeDbId: 77,
  employeeId: '9',                       // no EMP- prefix
  employeeName: 'Maryam Abdulrahman Al-Qahtani',
  designation: 'Lead Data Platform Engineer',
  department: 'Technology & Operations',
  currencyCode: 'SAR',
  basicSalary: 8064.52,
  housingAllowance: 2016.13,
  transportAllowance: 672.04,
  otherAllowances: 450,
  grossSalary: 11202.69,
  gosiNumber: null,
  gosiDeduction: 0,
  lopDays: 3,
  lopAmount: 1084.13,
  manualDeductionAmount: 1500,
  manualDeductionRemarks: 'Salary advance repayment — instalment 2 of 6',
  deductions: 2584.13,
  netSalary: 8618.56,
  joiningDate: null,
  daysInMonth: 31,
  daysPaid: 28,
  iban: 'SA44',                          // too short to mask
  wpsReference: null,
};

const payroll = { id: 3, periodMonth: 1, periodYear: 2026, status: 'approved' };

renderToFile(<PayslipDocument lineItem={lineItem} payroll={payroll} />, out)
  .then(() => console.log('rendered edge case'))
  .catch((e) => { console.error(e); process.exit(1); });
