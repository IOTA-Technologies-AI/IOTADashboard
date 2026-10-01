#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Checks the resource-calculation request the dashboard builds against the
 * fields the API declares — without deploying anything.
 *
 * The API rejects the whole request on the first missing or mistyped field,
 * and each failed attempt used to cost a deployment to find the next one. This
 * reads the backend's own interface declarations, feeds the worst form state
 * through the same normaliser the form uses, and reports every mismatch at once.
 *
 *   node scripts/check-resource-calculation-payload.js
 *
 * Needs ../IOTAApiServer/iotaapiserver checked out alongside this repo.
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const apiFile = path.resolve(
  __dirname,
  '../../../IOTAApiServer/iotaapiserver/profile/profileInterfaces.ts'
);
const utilFile = path.resolve(__dirname, '../src/sections/profile/resource-calculation-payload.js');

const src = fs.readFileSync(apiFile, 'utf8');

/** Field -> { type, optional } as declared in one backend interface. */
function declared(name) {
  const block = src.match(new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`));
  if (!block) throw new Error(`Interface ${name} not found in ${apiFile}`);
  const out = {};
  block[1].split('\n').forEach((line) => {
    const f = line.match(/^\s*(\w+)(\?)?:\s*([^;]+);/);
    if (f) out[f[1]] = { type: f[3].replace(/\/\/.*$/, '').trim(), optional: !!f[2] };
  });
  return out;
}

const RESOURCE = declared('ResourceCalculationResource');
const LINE = declared('ResourceCalculationLineItem');
const REQUEST = declared('CreateResourceCalculationRequest');

const util = fs.readFileSync(utilFile, 'utf8');
const mod = { exports: {} };
new Function('module', 'exports', ts.transpile(util, { module: ts.ModuleKind.CommonJS }))(
  mod,
  mod.exports
);
const { normalizeResource } = mod.exports;

// The worst state the editor can hold: typed numbers, thousands separators,
// nulls, missing totals, a line without an id or annual figure.
const uglyResource = {
  id: null,
  fullName: ' Ahmed ',
  jdId: null,
  candidateId: undefined,
  nationality: 'Egyptian',
  quantity: '2',
  insurancePremiumFactor: '2.1',
  dependentsCount: '3',
  familyStatus: 'yes',
  insuranceCostPerPax: '3,000',
  ticketCostPerPax: '',
  baseSalary: '12,500',
  resumeUrl: undefined,
  lineItems: [
    {
      id: '4682572001',
      label: 'Salary',
      category: 'salary',
      monthly: '12,500',
      isComputed: false,
      formula: '',
      order: '1',
      isActive: true,
      isEditable: true,
      code: 'basic',
    },
    {
      label: 'Gosi 2%',
      category: 'statutory',
      monthly: 250,
      annual: 3000,
      isComputed: true,
      formula: 'baseSalary * 0.02',
      isActive: true,
    },
  ],
};

const jsTypeOf = (declaredType) => {
  if (declaredType.endsWith('[]')) return 'array';
  if (declaredType === 'number' || declaredType === 'boolean') return declaredType;
  return 'string';
};

const problems = [];
function check(obj, spec, where) {
  Object.entries(spec).forEach(([key, { type, optional }]) => {
    const value = obj[key];
    if (value === undefined || value === null) {
      if (!optional) problems.push(`${where}.${key} is missing (API needs ${type})`);
      return;
    }
    const got = Array.isArray(value) ? 'array' : typeof value;
    if (got !== jsTypeOf(type)) {
      problems.push(`${where}.${key} is ${got} ${JSON.stringify(value)}; API needs ${type}`);
    }
  });
}

const resource = normalizeResource(uglyResource, 0);
check(resource, RESOURCE, 'resources[0]');
resource.lineItems.forEach((li, i) => check(li, LINE, `resources[0].lineItems[${i}]`));

// Top-level request, built the way the form builds it from the lead resource.
const lead = resource;
const request = {
  title: 'Check',
  resources: [resource],
  fullName: lead.fullName || undefined,
  jdId: lead.jdId || undefined,
  candidateId: lead.candidateId || undefined,
  iotaOffice: 'KSA',
  nationality: lead.nationality,
  positionCode: 'Customer',
  insurancePremiumFactor: Number(lead.insurancePremiumFactor) || 1,
  dependentsCount: Number(lead.dependentsCount) || 0,
  familyStatus: Boolean(lead.familyStatus),
  insuranceCostPerPax: Number(lead.insuranceCostPerPax) || 3000,
  ticketCostPerPax: Number(lead.ticketCostPerPax) || 2500,
  baseSalary: Number(lead.baseSalary) || 0,
  currency: 'SAR',
  lineItems: lead.lineItems || [],
  status: 'draft',
  resumeUrl: lead.resumeUrl || '',
  notes: '',
  createdBy: 'check@iotatechnologies.io',
};
check(request, REQUEST, 'request');

console.log(
  `API declares ${Object.keys(RESOURCE).length} fields per resource, ${Object.keys(LINE).length} per line, ${Object.keys(REQUEST).length} on the request.`
);
if (problems.length) {
  console.error('Mismatches:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('OK — every required field is present with the declared type.');
