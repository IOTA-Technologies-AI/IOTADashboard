'use client';

import useSWR from 'swr';
import { useRef, useState, useEffect, useCallback } from 'react';
import {
  pdf,
  Font,
  Page,
  Text,
  View,
  Document,
  Image as PdfImage,
  StyleSheet as PdfStyleSheet,
} from '@react-pdf/renderer';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Menu from '@mui/material/Menu';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemIcon from '@mui/material/ListItemIcon';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import InputAdornment from '@mui/material/InputAdornment';
import FormHelperText from '@mui/material/FormHelperText';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import {
  forwardRC,
  approveRC,
  uploadResume,
  getCustomers,
  listCandidates,
  listJobDescriptions,
  submitRCForApproval,
  getResourceCalculation,
  createResourceCalculation,
  updateResourceCalculation,
  getResourceCalculationTemplates,
} from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = ['draft', 'submitted', 'approved', 'rejected'];

const NATIONALITY_OPTIONS = [
  'Indian',
  'Pakistani',
  'Egyptian',
  'Saudi Arabian',
  'Filipino',
  'Sri Lankan',
  'Sudanese',
  'American',
  'British',
];

const IOTA_OFFICE_OPTIONS = [
  {
    value: 'KSA',
    label: 'IOTA Office - Saudi Arabia',
    countryCode: 'KSA',
    currency: 'SAR',
    taxRate: 0.15,
    taxLabel: 'VAT',
  },
  {
    value: 'India',
    label: 'IOTA Office - India',
    countryCode: 'India',
    currency: 'INR',
    taxRate: 0.18,
    taxLabel: 'GST',
  },
];

const STATUS_COLORS = {
  draft: 'default',
  submitted: 'info',
  approved: 'success',
  rejected: 'error',
};

const CATEGORY_LABELS = {
  salary: 'Salary',
  statutory: 'Statutory',
  insurance: 'Insurance',
  government: 'Government',
  service: 'Service',
  custom: 'Custom',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve {factor} and {dependents} placeholders in line item labels. */
function resolveLabel(label, insurancePremiumFactor, dependentsCount) {
  return label
    .replace(/\{factor\}/g, insurancePremiumFactor)
    .replace(/\{dependents\}/g, dependentsCount);
}

/**
 * Build the insurance line label with an explicit coverage breakdown.
 * Insurance covers: 1 candidate + N dependents + 1 wife (= dependents + 2 pax).
 * Strips the legacy "for {dependents}" tail from the stored template so the
 * coverage isn't duplicated.
 */
function insuranceLabel(rawLabel, insurancePremiumFactor, familyStatus, dependentsCount) {
  const base = resolveLabel(
    String(rawLabel || '').replace(/\s*for\s*\{dependents\}\s*$/i, '').trim(),
    insurancePremiumFactor,
    dependentsCount
  );
  if (!familyStatus) return `${base} — 1 candidate`;
  const deps = Number(dependentsCount) || 0;
  const depWord = deps === 1 ? 'dependent' : 'dependents';
  return `${base} — 1 candidate + ${deps} ${depWord} + 1 wife (${deps + 2} pax)`;
}

/** Evaluate simple formula expressions with baseSalary and dependentsCount context. */
function evalFormula(formula, context = {}) {
  if (!formula) return 0;
  try {
    const keys = Object.keys(context).sort((a, b) => b.length - a.length);
    const safe = keys.reduce((acc, key) => {
      const value = Number(context[key]) || 0;
      return acc.replace(new RegExp(`\\b${key}\\b`, 'g'), String(value));
    }, formula);
    if (!/^[\d\s+\-*/().]+$/.test(safe)) return 0;
     
    const result = Number(Function('"use strict"; return (' + safe + ')')());
    return isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}

/**
 * Recompute formula-based line items sequentially so each row's result
 * is immediately available to the next row's formula.
 * Non-computed items are seeded into context first so formulas can
 * reference them by code (e.g. basic, conveyance, hra…).
 */
function recompute(items, baseSalary, dependentsCount) {
  // Build initial context from all non-computed items so their values
  // are available to computed formulas that reference them.
  const context = {
    baseSalary: Number(baseSalary) || 0,
    dependentsCount: Number(dependentsCount) || 0,
  };

  items.forEach((item) => {
    const code = String(item?.code || '').trim();
    if (code && !item.isComputed) {
      context[code] = Number(item.monthly) || 0;
    }
  });

  // Compute items in declaration order so downstream formulas can
  // reference upstream computed values (e.g. gross references hra).
  return items.map((item) => {
    const code = String(item?.code || '').trim();

    if (item.isComputed && item.formula) {
      const billed = billable(evalFormula(item.formula, context));
      if (code) context[code] = billed.monthly;
      return { ...item, ...billed };
    }

    // Non-computed — monthly is authoritative, annual derives from it
    return { ...item, ...billable(item.monthly) };
  });
}

function fmtNumber(val) {
  return Math.round(Number(val || 0)).toLocaleString('en-SA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Every quotation row is billed as 12 equal monthly instalments, so the monthly
 * figure is authoritative: it is always a whole currency unit and the annual is
 * derived from it. Rows sourced from percentage formulas or from annual costs
 * (insurance, tickets) otherwise carry fractional monthlies — the printed
 * monthly rounds while the annual keeps the fraction, so monthly × 12 stops
 * matching the printed annual.
 */
function billable(monthly, roundFn = Math.round) {
  const m = roundFn(Number(String(monthly ?? '').replace(/,/g, '')) || 0);
  return { monthly: m, annual: m * 12 };
}

/**
 * Rows quoted as an annual cost (insurance, tickets) round the instalment *up*
 * so the 12 billings never recover less than the underlying cost.
 */
function billableFromAnnual(annualCost) {
  return billable((Number(annualCost) || 0) / 12, Math.ceil);
}

/** Renders the instalment/annual pair a per-pax annual cost actually bills at. */
function fmtBilling(annualCost) {
  const { monthly, annual } = billableFromAnnual(annualCost);
  return `SAR ${fmtNumber(monthly)}/mo × 12 = SAR ${fmtNumber(annual)}`;
}

/**
 * When familyStatus is enabled, override insurance and ticket line items with
 * family-based cost calculations (still editable by the user afterward).
 * Insurance: insuranceCostPerPax × (dependentsCount + 2 [candidate + wife]) — annual
 * Tickets:   ticketCostPerPax   × (dependentsCount + 2 [employee + wife]) — annual
 * Single:    ticketCostPerPax   × 1 (employee only)
 */
function applyFamilyDefaults(items, familyOn, deps, insPerPax, ticketPerPax) {
  const numDeps = Number(deps) || 0;
  const numIns = Number(insPerPax) || 3000;
  const numTicket = Number(ticketPerPax) || 2500;

  return items.map((item) => {
    // Insurance line — override when family is on
    if (item.category === 'insurance' && familyOn) {
      const familyPax = numDeps + 2; // candidate + wife + dependents
      return { ...item, ...billableFromAnnual(numIns * familyPax), isEditable: true };
    }
    // Ticket line — always recompute based on family status
    if (item.category === 'government' && item.label?.toLowerCase().includes('ticket')) {
      const totalPax = familyOn ? numDeps + 2 : 1; // employee + wife + kids OR just employee
      return {
        ...item,
        ...billableFromAnnual(numTicket * totalPax),
        isEditable: true,
        isComputed: false,
      };
    }
    return item;
  });
}

// ── PDF Font registration ─────────────────────────────────────────────────────

Font.register({
  family: 'Aptos',
  fonts: [{ src: '/fonts/Aptos-Regular.ttf' }, { src: '/fonts/Aptos-Bold.ttf', fontWeight: 700 }],
});

// Local copy of the white logo — avoids CORS block on Azure Blob URLs
const IOTA_LOGO_WHITE_LOCAL = '/logo/iotaLogoWhite.png';

// ── PDF Document styles ───────────────────────────────────────────────────────

const pdfStyles = PdfStyleSheet.create({
  page: { fontFamily: 'Aptos', padding: 40, fontSize: 10, color: '#111111' },
  header: {
    backgroundColor: '#0B5E41',
    paddingHorizontal: 24,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  headerLeft: { flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end' },
  headerTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: 700 },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 8.5, marginTop: 2 },
  headerLogo: { height: 28, objectFit: 'contain' },
  tableHeader: {
    backgroundColor: '#E8F3EF',
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottom: '1 solid #C5DDD4',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottom: '1 solid #E8ECEF',
  },
  colDesc: { flex: 3.2 },
  colQty: { flex: 0.5, textAlign: 'center' },
  colAmt: { flex: 1.2, textAlign: 'right' },
  unitNote: { fontSize: 8, color: '#777777', marginTop: 4, fontStyle: 'italic' },
  bullet: { fontSize: 9, color: '#555555', marginTop: 3 },
  bold: { fontWeight: 700 },
  totalsSection: { marginTop: 20, paddingHorizontal: 12 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  divider: { borderBottom: '1 solid #CCCCCC', marginVertical: 6 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 16,
    paddingTop: 12,
    borderTop: '1 solid #E0E0E0',
  },
  footerNote: { fontSize: 8.5, color: '#666666', maxWidth: 240, lineHeight: 1.6 },
  footerTag: { fontSize: 8, color: '#999999', textAlign: 'right' },

  // ── Title block: the proposal's own title, so a downloaded file states what
  // it is for rather than reading as a generic "Quotation Summary". ──────────
  titleBlock: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottom: '1 solid #E8ECEF',
  },
  docTitle: { fontSize: 14, fontWeight: 700, color: '#111111', lineHeight: 1.3 },
  docSubtitle: { fontSize: 9, color: '#555555', marginTop: 4 },

  // ── Meta grid: the facts the page shows beside the numbers. ───────────────
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F7FAF9',
    borderBottom: '1 solid #E2EBE7',
    paddingTop: 10,
    paddingBottom: 4,
    paddingHorizontal: 12,
  },
  metaCell: { width: '33.33%', paddingRight: 10, marginBottom: 8 },
  metaLabel: {
    fontSize: 7,
    color: '#7A8A85',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  metaValue: { fontSize: 9, color: '#111111' },

  sectionTitle: {
    fontSize: 8.5,
    fontWeight: 700,
    color: '#0B5E41',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginTop: 18,
    marginBottom: 6,
    paddingHorizontal: 12,
  },
  bodyText: { fontSize: 9, color: '#444444', lineHeight: 1.6, paddingHorizontal: 12 },
  termItem: { fontSize: 8.5, color: '#555555', lineHeight: 1.6, paddingHorizontal: 12, marginBottom: 2 },
  taxNote: { fontSize: 8.5, color: '#666666' },

  // ── Optional internal cost breakdown ─────────────────────────────────────
  breakdownHeader: {
    flexDirection: 'row',
    backgroundColor: '#E8F3EF',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderBottom: '1 solid #F0F3F5',
  },
  breakdownLabel: { flex: 3, fontSize: 8.5 },
  breakdownCat: { flex: 1.1, fontSize: 8.5, color: '#666666' },
  breakdownAmt: { flex: 1.2, fontSize: 8.5, textAlign: 'right' },
  breakdownGroup: {
    fontSize: 9,
    fontWeight: 700,
    color: '#0B5E41',
    paddingHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
  },

  pageFooter: {
    position: 'absolute',
    bottom: 22,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: '#AAAAAA',
  },
});

/** Quotations are held open for 30 days from the date of issue. */
const QUOTE_VALIDITY_DAYS = 30;

/** Dates on the quotation print unambiguously (05 Feb 2026, never 05/02). */
function fPdfDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Filename-safe slug, so the download is identifiable in a Downloads folder. */
function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

function getUserEmail() {
  if (typeof window === 'undefined') return '';
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return u.email || '';
  } catch {
    return '';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ResourceCalculationFormView({ id }) {
  const router = useRouter();
  const isEdit = Boolean(id);

  // ── Remote data ──────────────────────────────────────────────────────────
  const {
    data: rcData,
    isLoading: rcLoading,
    mutate: mutateRC,
  } = useSWR(isEdit ? `profile/resource-calculations/${id}` : null, () =>
    getResourceCalculation(id)
  );
  const [iotaOffice, setIotaOffice] = useState('KSA');
  const { data: tplData } = useSWR(['profile/rc-templates', iotaOffice], () =>
    getResourceCalculationTemplates(iotaOffice)
  );
  const { data: jdListData } = useSWR('profile/jd', listJobDescriptions);
  const { data: candidatesData } = useSWR('profile/candidates', listCandidates);
  const { data: customersData, error: customersError } = useSWR('customers', getCustomers);

  // ── Form state ────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [fullName, setFullName] = useState('');
  const [jdId, setJdId] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [customerId, setCustomerId] = useState('');
  // Whether the user actually operated the Customer control in this session.
  // Without this, a field that merely failed to populate is indistinguishable
  // from one the user deliberately cleared — and saving would wipe the stored
  // customer either way. See the positionCode handling in handleSubmit.
  const [customerTouched, setCustomerTouched] = useState(false);
  const [nationality, setNationality] = useState('');
  const [insurancePremiumFactor, setInsurancePremiumFactor] = useState(1.0);
  const [dependentsCount, setDependentsCount] = useState(0);
  const [familyStatus, setFamilyStatus] = useState(false);
  const [insuranceCostPerPax, setInsuranceCostPerPax] = useState(3000);
  const [ticketCostPerPax, setTicketCostPerPax] = useState(2500);
  const [baseSalary, setBaseSalary] = useState(0);
  const [currency, setCurrency] = useState('SAR');
  const [lineItems, setLineItems] = useState([]);
  const [status, setStatus] = useState('draft');
  const [resumeUrl, setResumeUrl] = useState('');
  const [notes, setNotes] = useState('');

  // ── Multi-resource proposal state ─────────────────────────────────────────
  // A proposal can quote several people under one id. The fields above remain
  // the EDITOR for whichever resource is selected; `resources` holds the rest.
  // Keeping one editor rather than rendering N copies of this form is what lets
  // the existing per-resource UI stay exactly as it is.
  const [resources, setResources] = useState([]);
  const [activeResourceIndex, setActiveResourceIndex] = useState(0);
  const [resourceQuantity, setResourceQuantity] = useState(1);
  const [officeChangedWarning, setOfficeChangedWarning] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);

  // ── Approval workflow state ───────────────────────────────────────────────
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [forwardEmail, setForwardEmail] = useState('');
  const [forwardNotes, setForwardNotes] = useState('');
  const [forwarding, setForwarding] = useState(false);
  const [submittingForApproval, setSubmittingForApproval] = useState(false);
  const [approvalActionLoading, setApprovalActionLoading] = useState('');

  // ── Resume upload state ───────────────────────────────────────────────────
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeUploadError, setResumeUploadError] = useState('');

  // ── PDF / Share state ─────────────────────────────────────────────────────
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [shareAnchor, setShareAnchor] = useState(null);

  // ── Refs so callbacks always see the latest baseSalary / dependentsCount ─
  const baseSalaryRef = useRef(baseSalary);
  const dependentsCountRef = useRef(dependentsCount);
  useEffect(() => {
    baseSalaryRef.current = baseSalary;
  }, [baseSalary]);
  useEffect(() => {
    dependentsCountRef.current = dependentsCount;
  }, [dependentsCount]);

  // ── Seed form from existing record ────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || initialized) return;

    const rc = rcData?.data;
    if (!rc) return;
    setTitle(rc.title);
    setFullName(rc.fullName || '');
    setJdId(rc.jdId || '');
    setCandidateId(rc.candidateId || '');
    setNationality(rc.nationality);
    setCustomerId(rc.positionCode || '');
    setInsurancePremiumFactor(rc.insurancePremiumFactor);
    setDependentsCount(rc.dependentsCount);
    setFamilyStatus(rc.familyStatus ?? false);
    setInsuranceCostPerPax(rc.insuranceCostPerPax ?? 3000);
    setTicketCostPerPax(rc.ticketCostPerPax ?? 2500);
    setBaseSalary(rc.baseSalary);
    setCurrency(rc.currency);
    setLineItems(rc.lineItems || []);
    setStatus(rc.status);
    setResumeUrl(rc.resumeUrl || '');
    setNotes(rc.notes || '');

    // A record saved before multi-resource proposals existed has no resources
    // array; its single resource lives in the flat fields just seeded above, so
    // it is rebuilt here as resource one and edits exactly as it always did.
    const stored = Array.isArray(rc.resources) ? rc.resources : [];
    if (stored.length) {
      setResources(stored);
      setActiveResourceIndex(0);
      const first = stored[0];
      setFullName(first.fullName || '');
      setJdId(first.jdId || '');
      setCandidateId(first.candidateId || '');
      setNationality(first.nationality || rc.nationality || '');
      setResourceQuantity(Math.max(1, Math.round(Number(first.quantity) || 1)));
      setInsurancePremiumFactor(first.insurancePremiumFactor ?? rc.insurancePremiumFactor);
      setDependentsCount(first.dependentsCount ?? rc.dependentsCount);
      setFamilyStatus(first.familyStatus ?? rc.familyStatus ?? false);
      setInsuranceCostPerPax(first.insuranceCostPerPax ?? rc.insuranceCostPerPax ?? 3000);
      setTicketCostPerPax(first.ticketCostPerPax ?? rc.ticketCostPerPax ?? 2500);
      setBaseSalary(first.baseSalary ?? rc.baseSalary);
      setResumeUrl(first.resumeUrl || rc.resumeUrl || '');
      setLineItems(first.lineItems || rc.lineItems || []);
    } else {
      setResources([
        {
          id: 'r1',
          fullName: rc.fullName || '',
          jdId: rc.jdId || '',
          candidateId: rc.candidateId || '',
          nationality: rc.nationality || '',
          quantity: 1,
          insurancePremiumFactor: rc.insurancePremiumFactor,
          dependentsCount: rc.dependentsCount,
          familyStatus: rc.familyStatus ?? false,
          insuranceCostPerPax: rc.insuranceCostPerPax ?? 3000,
          ticketCostPerPax: rc.ticketCostPerPax ?? 2500,
          baseSalary: rc.baseSalary,
          resumeUrl: rc.resumeUrl || '',
          lineItems: rc.lineItems || [],
        },
      ]);
      setActiveResourceIndex(0);
      setResourceQuantity(1);
    }
    const officeFromRecord = rc.iotaOffice || (rc.currency === 'INR' ? 'India' : 'KSA');
    setIotaOffice(officeFromRecord);
    setInitialized(true);
  }, [isEdit, rcData, initialized]);

  // ── Normalise a name-valued customerId back to a real id ──────────────────
  // `positionCode` stores the customer's NAME, and the effect above seeds
  // `customerId` straight from it. Everything else in this form — the Select's
  // MenuItem values, the quotation's customer lookup — keys on the id, so until
  // this runs a reopened quotation has a Customer dropdown that renders blank
  // (no MenuItem matches) and a "Prepared For" that resolves to nothing. Runs
  // once the customer list arrives and only when the held value is not already
  // an id.
  useEffect(() => {
    const list = Array.isArray(customersData) ? customersData : customersData?.customers || [];
    if (!list.length) return;

    const held = String(customerId ?? '').trim();
    if (!held) return;
    if (list.some((cu) => String(cu.id) === held)) return;

    const byName = list.find(
      (cu) =>
        String(cu.customerNameEn || cu.customerNameAr || '')
          .trim()
          .toLowerCase() === held.toLowerCase()
    );
    if (byName) setCustomerId(String(byName.id));
  }, [customersData, customerId]);

  // ── Seed/refresh create-mode templates when country changes ───────────────
  useEffect(() => {
    if (isEdit) return;
    const items = tplData?.items;
    if (!items) return;

    const countryMeta =
      IOTA_OFFICE_OPTIONS.find((c) => c.value === iotaOffice) || IOTA_OFFICE_OPTIONS[0];

    setCurrency(countryMeta.currency);
    setLineItems(
      recompute(items, Number(baseSalaryRef.current) || 0, Number(dependentsCountRef.current) || 0)
    );
    if (!initialized) setInitialized(true);
  }, [isEdit, tplData, iotaOffice, initialized]);

  // ── Auto-recompute formula items when baseSalary changes ─────────────────
  // On new forms, if templates are loaded but line items haven't been seeded yet with
  // a real salary, we seed them now so all computed rows populate immediately.
  const handleBaseSalaryChange = (val) => {
    const num = Number(String(val).replace(/,/g, '')) || 0;
    setBaseSalary(num);
    setLineItems((prev) => {
      const seeded = prev.map((item) => {
        if (item.code === 'basic') {
          return { ...item, ...billable(num) };
        }
        if (!item.code && item.category === 'salary') {
          return { ...item, ...billable(num) };
        }
        return item;
      });
      const recomputed = recompute(seeded, num, Number(dependentsCount) || 0);
      return familyStatus
        ? applyFamilyDefaults(
            recomputed,
            true,
            dependentsCount,
            insuranceCostPerPax,
            ticketCostPerPax
          )
        : recomputed;
    });
  };

  const handleDependentsCountChange = (val) => {
    const num = Number(val) || 0;
    setDependentsCount(num);
    setLineItems((prev) => {
      const recomputed = recompute(prev, baseSalary, num);
      return familyStatus
        ? applyFamilyDefaults(recomputed, true, num, insuranceCostPerPax, ticketCostPerPax)
        : recomputed;
    });
  };

  const handleFamilyStatusChange = (isFamily) => {
    setFamilyStatus(isFamily);
    setLineItems((prev) => {
      const recomputed = recompute(prev, baseSalary, dependentsCount);
      return applyFamilyDefaults(
        recomputed,
        isFamily,
        dependentsCount,
        insuranceCostPerPax,
        ticketCostPerPax
      );
    });
  };

  const handleInsuranceCostPerPaxChange = (val) => {
    const num = Number(val) || 3000;
    setInsuranceCostPerPax(num);
    if (familyStatus) {
      setLineItems((prev) =>
        applyFamilyDefaults(prev, true, dependentsCount, num, ticketCostPerPax)
      );
    }
  };

  const handleTicketCostPerPaxChange = (val) => {
    const num = Number(val) || 2500;
    setTicketCostPerPax(num);
    setLineItems((prev) =>
      applyFamilyDefaults(prev, familyStatus, dependentsCount, insuranceCostPerPax, num)
    );
  };

  const handleIotaOfficeChange = (nextOffice) => {
    setIotaOffice(nextOffice);
    const countryMeta = IOTA_OFFICE_OPTIONS.find((c) => c.value === nextOffice);
    if (countryMeta) {
      setCurrency(countryMeta.currency);
    }
    // The office is a PROPOSAL-level term: it decides the cost template, the
    // currency and the tax. The create-mode template effect only reseeds the
    // resource currently open in the editor, so on a multi-resource proposal
    // every other resource would keep the previous office's components and the
    // proposal would quote two countries' cost structures in one currency.
    // Flag them instead of silently mixing — their figures are the operator's
    // to re-enter, not ours to discard.
    if (resources.length > 1) {
      setOfficeChangedWarning(
        `Office changed to ${countryMeta?.label || nextOffice}. Review each resource — cost components are per office, and resources other than the one open were not reseeded.`
      );
    }
  };

  // ── Line-item helpers ─────────────────────────────────────────────────────
  const handleLineItemChange = useCallback(
    (idx, field, val) => {
      setLineItems((prev) => {
        const updated = prev.map((item, i) => {
          if (i !== idx) return item;
          const next = { ...item, [field]: val };
          if (field === 'monthly') {
            Object.assign(next, billable(val));
          }
          return next;
        });

        // Sync the 'Basic' salary top-level field when the basic-coded
        // row (India) or the sole KSA salary row is edited.
        if (field === 'monthly') {
          const editedItem = updated[idx];
          const isBasicRow =
            editedItem?.code === 'basic' ||
            (!editedItem?.code && editedItem?.category === 'salary');
          if (isBasicRow) {
            const num = Number(String(val).replace(/,/g, '')) || 0;
            setBaseSalary(num);
            return recompute(updated, num, dependentsCountRef.current);
          }
        }

        // Any manual edit to a non-basic row — recompute dependents
        return recompute(updated, baseSalaryRef.current, dependentsCountRef.current);
      });
    },
     
    []
  );

  const handleAddLineItem = () => {
    const now = Date.now();
    const newId = '4682572' + String(Math.floor(now / 1000) % 1000).padStart(3, '0');
    setLineItems((prev) => [
      ...prev,
      {
        id: newId,
        label: 'Custom Item',
        category: 'custom',
        monthly: 0,
        annual: 0,
        isComputed: false,
        formula: '',
        order: prev.length + 1,
        isActive: true,
        isEditable: true,
      },
    ]);
  };

  const handleRemoveLineItem = (idx) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Resume file upload ────────────────────────────────────────────────────
  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeUploading(true);
    setResumeUploadError('');
    try {
      const userEmail = getUserEmail();
      const result = await uploadResume(file, userEmail);
      if (result?.data?.fileUrl) {
        setResumeUrl(result.data.fileUrl);
        if (!candidateId && result.data.id) {
          setCandidateId(result.data.id);
        }
      }
    } catch (err) {
      setResumeUploadError(err.response?.data?.message || err.message || 'Resume upload failed');
    } finally {
      setResumeUploading(false);
    }
  };

  // ── Resource management ───────────────────────────────────────────────────
  /** The editor's current field values, as a resource record. */
  const snapshotEditor = () => ({
    fullName,
    jdId,
    candidateId,
    nationality,
    quantity: Math.max(1, Math.round(Number(resourceQuantity) || 1)),
    insurancePremiumFactor,
    dependentsCount,
    familyStatus,
    insuranceCostPerPax,
    ticketCostPerPax,
    baseSalary,
    resumeUrl,
    lineItems,
  });

  /** Push the editor's values into the resource it is currently editing. */
  const commitEditor = (list = resources, index = activeResourceIndex) => {
    const snapshot = snapshotEditor();
    if (!list.length) return [{ id: 'r1', ...snapshot }];
    return list.map((r, i) => (i === index ? { ...r, ...snapshot } : r));
  };

  /** Load a resource's values into the editor fields. */
  const loadIntoEditor = (resource) => {
    setFullName(resource.fullName || '');
    setJdId(resource.jdId || '');
    setCandidateId(resource.candidateId || '');
    setNationality(resource.nationality || '');
    setResourceQuantity(Math.max(1, Math.round(Number(resource.quantity) || 1)));
    setInsurancePremiumFactor(resource.insurancePremiumFactor ?? 1);
    setDependentsCount(resource.dependentsCount ?? 0);
    setFamilyStatus(resource.familyStatus ?? false);
    setInsuranceCostPerPax(resource.insuranceCostPerPax ?? 3000);
    setTicketCostPerPax(resource.ticketCostPerPax ?? 2500);
    setBaseSalary(resource.baseSalary ?? 0);
    setResumeUrl(resource.resumeUrl || '');
    setLineItems(resource.lineItems || []);
  };

  /** Switch which resource the editor is bound to, saving the current one. */
  const handleSelectResource = (index) => {
    if (index === activeResourceIndex) return;
    const committed = commitEditor();
    const target = committed[index];
    if (!target) return;
    setResources(committed);
    setActiveResourceIndex(index);
    loadIntoEditor(target);
  };

  /**
   * Add a resource. `seed` copies the current one — the common case, since a
   * second candidate for the same customer usually differs only in name and
   * salary — while a blank row starts from the office's template.
   */
  const handleAddResource = (seed = 'copy') => {
    const committed = commitEditor();
    const base =
      seed === 'copy'
        ? { ...snapshotEditor(), fullName: '', candidateId: '', resumeUrl: '' }
        : {
            fullName: '',
            jdId: '',
            candidateId: '',
            nationality: '',
            quantity: 1,
            insurancePremiumFactor: 1,
            dependentsCount: 0,
            familyStatus: false,
            insuranceCostPerPax: 3000,
            ticketCostPerPax: 2500,
            baseSalary: 0,
            resumeUrl: '',
            lineItems: recompute(tplData?.items || [], 0, 0),
          };
    const next = [...committed, { id: `r${Date.now()}`, ...base }];
    setResources(next);
    setActiveResourceIndex(next.length - 1);
    loadIntoEditor(next[next.length - 1]);
  };

  /** Remove a resource. A proposal must always quote at least one. */
  const handleRemoveResource = (index) => {
    const committed = commitEditor();
    if (committed.length <= 1) {
      setError('A proposal must quote at least one resource.');
      return;
    }
    const next = committed.filter((_, i) => i !== index);
    const nextIndex = Math.min(activeResourceIndex, next.length - 1);
    setResources(next);
    setActiveResourceIndex(nextIndex);
    loadIntoEditor(next[nextIndex]);
  };

  // ── Totals ────────────────────────────────────────────────────────────────
  const isIndiaOffice = iotaOffice === 'India';

  /** What one unit of a resource bills per month, under the current office. */
  const resourceMonthly = (resource) => {
    const items = resource?.lineItems || [];
    if (isIndiaOffice) {
      return billable(items.find((i) => i.code === 'invoice_amount')?.monthly).monthly;
    }
    return items
      .filter((i) => i.isActive)
      .reduce((sum, i) => sum + billable(i.monthly).monthly, 0);
  };

  /** Headcount a resource row represents; never less than one. */
  const resourceQty = (resource) => Math.max(1, Math.round(Number(resource?.quantity) || 1));

  // The resource currently open in the editor, as a plain record. The editor
  // binds to the flat state fields rather than to resources[activeResourceIndex]
  // directly, so this is how the live edits re-enter the proposal.
  const activeResourceDraft = {
    ...(resources[activeResourceIndex] || {}),
    id: resources[activeResourceIndex]?.id || 'r1',
    fullName,
    jdId,
    candidateId,
    nationality,
    quantity: resourceQuantity,
    insurancePremiumFactor,
    dependentsCount,
    familyStatus,
    insuranceCostPerPax,
    ticketCostPerPax,
    baseSalary,
    resumeUrl,
    lineItems,
  };

  // Every resource on the proposal, with the one being edited replaced by its
  // live draft — so the summary and the PDF reflect unsaved edits exactly the
  // way the single-resource form always did.
  const proposalResources = (resources.length ? resources : [activeResourceDraft]).map((r, i) =>
    i === activeResourceIndex ? activeResourceDraft : r
  );

  // Proposal totals roll up across resources: each row's instalment times its
  // headcount. A single-resource proposal reduces to exactly the old figure.
  const totalMonthly = proposalResources.reduce(
    (sum, r) => sum + resourceMonthly(r) * resourceQty(r),
    0
  );
  // Derived from the instalment rather than summed on its own, so the two
  // figures the quotation prints side by side always reconcile.
  const totalAnnual = totalMonthly * 12;
  const totalHeadcount = proposalResources.reduce((sum, r) => sum + resourceQty(r), 0);
  const isMultiResource = proposalResources.length > 1 || totalHeadcount > 1;

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('');
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!nationality.trim()) {
      setError('Nationality is required');
      return;
    }

    setSaving(true);
    try {
      // Resolve customer name from id for positionCode storage. Tolerant of a
      // name-valued customerId, which is what an unmigrated record still holds.
      //
      // The fallback chain matters as much as the lookup. `positionCode` is the
      // ONLY place the customer is stored, and the Customer control renders
      // blank whenever its value is not a loaded customer id — so if a blank
      // control were allowed to save a blank positionCode, every save would
      // erase the customer and the next load would render blank again. That is
      // self-reinforcing: one failed customer fetch permanently loses the
      // customer on the next save. So an empty value only overwrites a stored
      // one when the user actually cleared the control themselves.
      const selectedCustomer = resolveCustomer(customerId);
      const heldValue = String(customerId || '').trim();
      const storedCustomerName = String(rcData?.data?.positionCode || '').trim();
      const customerDisplayName =
        customerLabel(selectedCustomer) ||
        // Unresolvable. If the user did not touch the control, the record's own
        // stored name is more trustworthy than whatever this state happens to
        // hold — which may be a bare id the directory could not resolve, and an
        // id must never be written into a field the list screen prints as a name.
        (customerTouched ? heldValue : storedCustomerName || heldValue);
      // Commit the open editor before saving, or the resource being edited would
      // be sent in whatever state it was last switched away from.
      const resourcesToSave = commitEditor().map((r, i) => ({
        ...r,
        id: String(r.id || `r${i + 1}`),
        quantity: Math.max(1, Math.round(Number(r.quantity) || 1)),
      }));
      // The flat fields stay populated from the FIRST resource: the list screen,
      // its search and any report still read those columns, and they must not go
      // blank just because a proposal now carries more than one person.
      const lead = resourcesToSave[0] || {};

      const payload = {
        title: title.trim(),
        resources: resourcesToSave,
        fullName: String(lead.fullName || '').trim() || undefined,
        jdId: lead.jdId || undefined,
        candidateId: lead.candidateId || undefined,
        iotaOffice,
        nationality: String(lead.nationality || nationality).trim(),
        positionCode: String(customerDisplayName),
        insurancePremiumFactor: Number(lead.insurancePremiumFactor) || 1,
        dependentsCount: Number(lead.dependentsCount) || 0,
        familyStatus: Boolean(lead.familyStatus),
        insuranceCostPerPax: Number(lead.insuranceCostPerPax) || 3000,
        ticketCostPerPax: Number(lead.ticketCostPerPax) || 2500,
        baseSalary: Number(lead.baseSalary) || 0,
        currency,
        lineItems: lead.lineItems || [],
        status,
        resumeUrl: lead.resumeUrl || '',
        notes,
        createdBy: getUserEmail(),
      };

      if (isEdit) {
        await updateResourceCalculation(id, payload);
        mutateRC();
      } else {
        const result = await createResourceCalculation(payload);
        const newId = result?.data?.id;
        if (newId) {
          // Auto-submit for approval on create
          submitRCForApproval(newId).catch(console.error);
          router.push(paths.dashboard.profile.resourceCalculation.details(newId));
        } else {
          router.push(paths.dashboard.profile.resourceCalculation.root);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Approval workflow handlers ─────────────────────────────────────────────
  const handleSubmitForApproval = async () => {
    setSubmittingForApproval(true);
    try {
      await submitRCForApproval(id);
      await mutateRC();
      setStatus('submitted');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Submit failed');
    } finally {
      setSubmittingForApproval(false);
    }
  };

  const handleForward = async () => {
    if (!forwardEmail.trim()) return;
    setForwarding(true);
    try {
      await forwardRC(id, {
        toEmail: forwardEmail.trim(),
        fromEmail: getUserEmail(),
        notes: forwardNotes.trim() || undefined,
      });
      await mutateRC();
      setForwardDialogOpen(false);
      setForwardEmail('');
      setForwardNotes('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Forward failed');
    } finally {
      setForwarding(false);
    }
  };

  const handleApproveReject = async (decision) => {
    setApprovalActionLoading(decision);
    try {
      await approveRC(id, { approverEmail: getUserEmail(), decision });
      await mutateRC();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Action failed');
    } finally {
      setApprovalActionLoading('');
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isEdit && rcLoading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  const jdList = jdListData?.data || [];
  const candidateList = candidatesData?.data || [];
  const customerList = Array.isArray(customersData)
    ? customersData
    : customersData?.customers || [];

  /** The display name held on a customer record, whichever language it carries. */
  const customerLabel = (cu) => cu?.customerNameEn || cu?.customerNameAr || '';

  /**
   * Resolve the selected customer by id OR by name.
   *
   * `customerId` is not always an id. On save the customer's NAME is what gets
   * written to `positionCode` (see handleSubmit), and the seeding effect reads
   * `customerId` straight back out of `positionCode` — so on every existing
   * record this state holds a name, not an id. Matching on `cu.id` alone
   * therefore found nothing the moment a quotation was reopened, which is why
   * "Prepared For" printed as a dash on a saved record while a freshly created
   * one showed the customer correctly.
   */
  const resolveCustomer = (value) => {
    const needle = String(value ?? '').trim();
    if (!needle) return null;
    return (
      customerList.find((cu) => String(cu.id) === needle) ||
      customerList.find((cu) => customerLabel(cu).toLowerCase() === needle.toLowerCase()) ||
      null
    );
  };

  // ── PDF generation ────────────────────────────────────────────────────────
  /**
   * Every fact the quotation page shows, resolved once so the document body,
   * the PDF metadata, the filename and the share messages all quote the same
   * values instead of each re-deriving them.
   */
  const buildQuotationMeta = (countryMeta) => {
    const rc = rcData?.data;
    const customerObj = resolveCustomer(customerId);
    // Falls back to the stored string: a customer removed from the directory
    // must still print the name the quotation was raised against, never a dash.
    const customerName = customerLabel(customerObj) || String(customerId || '').trim();
    const jdTitle = jdList.find((jd) => String(jd.id) === String(jdId))?.title || '';
    const candidateObj = candidateList.find((c) => String(c.id) === String(candidateId));
    const issuedOn = rc?.createdAt ? new Date(rc.createdAt) : new Date();
    const validUntil = new Date(issuedOn.getTime() + QUOTE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
    const childWord = Number(dependentsCount) !== 1 ? 'children' : 'child';

    return {
      documentTitle: title.trim() || 'Resource Quotation',
      // A record only has an id once it has been saved; say so rather than
      // printing a blank reference a recipient might quote back at us.
      reference: id ? `RQ-${id}` : 'Draft — not yet saved',
      customerName,
      jdTitle,
      resourceName: fullName.trim() || candidateObj?.name || '',
      issuedOn,
      validUntil,
      preparedBy: rc?.createdBy || getUserEmail(),
      entityLabel: countryMeta.label,
      taxLabel: countryMeta.taxLabel,
      taxPercent: Math.round((Number(countryMeta.taxRate) || 0) * 100),
      statusLabel: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft',
      familyLabel: familyStatus ? `Family — ${dependentsCount} ${childWord} + wife` : 'Single',
    };
  };

  /**
   * The scope bullets under the Description column. Shared by the on-screen
   * summary and the PDF so the two cannot drift: the PDF used to run its own
   * copy of this logic, which silently dropped every non-ticket government line
   * and counted End of Service twice (once on its own, once inside "Standard
   * Employee Benefits").
   */
  const buildScopeBullets = (resource) => {
    const isEOS = (i) => i.category === 'statutory' && i.label.toLowerCase().includes('end of service');
    const isTicket = (i) => i.category === 'government' && i.label.toLowerCase().includes('ticket');

    const items = (resource?.lineItems || []).filter((i) => i.isActive);
    const deps = Number(resource?.dependentsCount) || 0;
    const family = Boolean(resource?.familyStatus);
    const factor = resource?.insurancePremiumFactor ?? 1;

    const bullets = [];
    const childWord = deps !== 1 ? 'children' : 'child';
    bullets.push(family ? `Family — ${deps} ${childWord} + wife` : 'Single');

    items
      .filter((i) => i.category === 'insurance')
      .forEach((i) => bullets.push(insuranceLabel(i.label, factor, family, deps)));

    if (items.some((i) => (i.category === 'statutory' && !isEOS(i)) || i.category === 'service')) {
      bullets.push('Standard Employee Benefits');
    }
    if (items.some(isEOS)) bullets.push('End of Service Benefits');
    if (items.some(isTicket)) bullets.push('Annual Travel Benefits');

    items
      .filter((i) => i.category === 'government' && !isTicket(i))
      .forEach((i) => bullets.push(resolveLabel(i.label, factor, deps)));

    return bullets;
  };

  /** The heading line for a resource row: name, then nationality and position. */
  const resourceHeading = (resource) => {
    const nat = String(resource?.nationality || '').trim();
    const jd = jdList.find((j) => String(j.id) === String(resource?.jdId))?.title || '';
    const role = nat ? `${nat} Employee` : 'Employee';
    return { name: String(resource?.fullName || '').trim(), role, jdTitle: jd };
  };

  /** The download/share filename — identifiable without opening the file. */
  const buildPDFFileName = (meta) =>
    [
      'IOTA-Resource-Quotation',
      slugify(meta.documentTitle),
      slugify(meta.customerName),
      id ? String(id) : new Date().toISOString().slice(0, 10),
    ]
      .filter(Boolean)
      .join('-') + '.pdf';

  const buildPDFDoc = (countryMeta, subtotal, vatAmount, grandTotal, options = {}) => {
    const { includeBreakdown = false } = options;
    const meta = buildQuotationMeta(countryMeta);
    const TAX_LABEL = meta.taxLabel;

    // Rendered as a grid so the quotation carries the same context the page
    // does — who it is for, which entity issues it, and how long it stands.
    // Terms shared by the whole proposal. The per-resource facts (nationality,
    // family status, insurance plan) only belong here while the proposal quotes
    // ONE person — on a multi-resource proposal they differ per row and are
    // printed against each resource instead, where they are actually true.
    const metaFields = [
      ['Quotation Ref', meta.reference],
      ['Date of Issue', fPdfDate(meta.issuedOn)],
      ['Valid Until', fPdfDate(meta.validUntil)],
      ['Prepared For', meta.customerName || '—'],
      ['Issuing Entity', meta.entityLabel],
      ['Currency', currency],
      ...(isMultiResource
        ? [
            ['Resources Quoted', `${proposalResources.length} roles`],
            ['Total Headcount', `${totalHeadcount} ${totalHeadcount === 1 ? 'person' : 'people'}`],
          ]
        : [
            ['Resource', meta.resourceName || '—'],
            ['Position / Job Description', meta.jdTitle || '—'],
            ['Nationality', nationality || '—'],
            ['Family Status', meta.familyLabel],
            ['Insurance Plan', `Bupa Premium ${insurancePremiumFactor}`],
          ]),
      ['Status', meta.statusLabel],
    ];

    return (
      <Document
        title={`${meta.documentTitle} — Resource Quotation (${meta.reference})`}
        author="IOTA Technologies"
        subject={
          meta.customerName
            ? `Resource quotation for ${meta.customerName}`
            : 'Resource quotation'
        }
        keywords={['resource quotation', meta.documentTitle, meta.customerName, nationality]
          .filter(Boolean)
          .join(', ')}
        creator="IOTA Dashboard"
      >
        <Page size="A4" style={pdfStyles.page}>
          {/* ── Header band ───
              Deliberately NOT `fixed`: a fixed header renders at the same
              offset on every page while the content still flows from the top,
              so on page 2 of a long quotation the band would sit on top of the
              rows. The running header/footer is the small fixed strip at the
              bottom of the page instead. */}
          <View style={pdfStyles.header}>
            {/* Logo — left */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <PdfImage src={IOTA_LOGO_WHITE_LOCAL} style={pdfStyles.headerLogo} />
              {/* Vertical separator */}
              <View
                style={{
                  width: 1,
                  height: 32,
                  backgroundColor: 'rgba(255,255,255,0.35)',
                  marginHorizontal: 16,
                }}
              />
              <Text
                style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 9,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                }}
              >
                Resource Quotation
              </Text>
            </View>
            {/* Reference — right */}
            <View style={pdfStyles.headerLeft}>
              <Text style={pdfStyles.headerTitle}>Quotation Summary</Text>
              <Text style={pdfStyles.headerSub}>{meta.reference}</Text>
            </View>
          </View>

          {/* ── Title block ───
              The proposal's own title, so the file states what it was built for
              instead of reading as an unattributed price list. */}
          <View style={pdfStyles.titleBlock}>
            <Text style={pdfStyles.docTitle}>{meta.documentTitle}</Text>
            <Text style={pdfStyles.docSubtitle}>
              {meta.customerName ? `Prepared for ${meta.customerName}` : 'Prepared by IOTA Technologies'}
              {` · Issued ${fPdfDate(meta.issuedOn)} · Valid until ${fPdfDate(meta.validUntil)}`}
            </Text>
          </View>

          {/* ── Quotation details grid ─── */}
          <View style={pdfStyles.metaGrid}>
            {metaFields.map(([label, value]) => (
              <View key={label} style={pdfStyles.metaCell}>
                <Text style={pdfStyles.metaLabel}>{label}</Text>
                <Text style={pdfStyles.metaValue}>{value}</Text>
              </View>
            ))}
          </View>

          {/* ── Table header ─── */}
          <View style={[pdfStyles.tableHeader, { marginTop: 18 }]}>
            <Text style={[pdfStyles.colDesc, pdfStyles.bold, { fontSize: 9 }]}>DESCRIPTION</Text>
            <Text style={[pdfStyles.colQty, pdfStyles.bold, { fontSize: 9 }]}>QTY</Text>
            <Text style={[pdfStyles.colAmt, pdfStyles.bold, { fontSize: 9 }]}>
              {'MONTHLY CHARGES\n'}(Excl. {TAX_LABEL})
            </Text>
            <Text style={[pdfStyles.colAmt, pdfStyles.bold, { fontSize: 9 }]}>
              {'ANNUAL CHARGES\n(12 Months)\n'}(Excl. {TAX_LABEL})
            </Text>
          </View>

          {/* ── One row per quoted resource ───
              A proposal covering several people prints each of them on its own
              line, priced on its own terms, rather than forcing a separate
              quotation per candidate. The amounts shown are the LINE totals
              (unit × quantity), so the column visibly adds up to the total. */}
          {proposalResources.map((resource, index) => {
            const heading = resourceHeading(resource);
            const qty = resourceQty(resource);
            const unitMonthly = resourceMonthly(resource);
            const lineMonthly = unitMonthly * qty;
            return (
              <View
                key={resource.id || index}
                style={pdfStyles.tableRow}
                wrap={false}
              >
                <View style={pdfStyles.colDesc}>
                  {heading.name ? <Text style={pdfStyles.bold}>{heading.name}</Text> : null}
                  <Text style={pdfStyles.bold}>
                    {heading.role}
                    {heading.jdTitle ? ` — ${heading.jdTitle}` : ''}
                  </Text>
                  {buildScopeBullets(resource).map((b, i) => (
                    <Text key={i} style={pdfStyles.bullet}>
                      • {b}
                    </Text>
                  ))}
                  {qty > 1 ? (
                    <Text style={pdfStyles.unitNote}>
                      {qty} × {currency} {fmtNumber(unitMonthly)} per month each
                    </Text>
                  ) : null}
                </View>
                <Text style={[pdfStyles.colQty, pdfStyles.bold, { fontSize: 11 }]}>{qty}</Text>
                <Text style={[pdfStyles.colAmt, pdfStyles.bold, { fontSize: 11 }]}>
                  {currency} {fmtNumber(lineMonthly)}
                </Text>
                <Text style={[pdfStyles.colAmt, pdfStyles.bold, { fontSize: 11 }]}>
                  {currency} {fmtNumber(lineMonthly * 12)}
                </Text>
              </View>
            );
          })}

          {/* ── Totals ─── */}
          <View style={pdfStyles.totalsSection}>
            <View style={pdfStyles.totalsRow}>
              <Text style={pdfStyles.bold}>SUBTOTAL:</Text>
              <Text style={pdfStyles.bold}>
                {currency} {fmtNumber(subtotal)}
              </Text>
            </View>
            {/* Tax is quoted as applicable and is deliberately NOT added into the
                total — spell that out rather than leaving the reader to infer it
                from a missing line. */}
            <View style={pdfStyles.totalsRow}>
              <Text style={pdfStyles.taxNote}>
                {TAX_LABEL} ({meta.taxPercent}%):
              </Text>
              <Text style={pdfStyles.taxNote}>As applicable — not included</Text>
            </View>
            <View style={pdfStyles.divider} />
            <View style={pdfStyles.totalsRow}>
              <Text style={[pdfStyles.bold, { fontSize: 12 }]}>TOTAL:</Text>
              <Text style={[pdfStyles.bold, { fontSize: 12, color: '#0B5E41' }]}>
                {currency} {fmtNumber(grandTotal)}
              </Text>
            </View>
            <View style={pdfStyles.totalsRow}>
              <Text style={pdfStyles.taxNote}>Billed as 12 equal monthly instalments of</Text>
              <Text style={pdfStyles.taxNote}>
                {currency} {fmtNumber(totalMonthly)}
              </Text>
            </View>
            {isMultiResource ? (
              <View style={pdfStyles.totalsRow}>
                <Text style={pdfStyles.taxNote}>Covering</Text>
                <Text style={pdfStyles.taxNote}>
                  {totalHeadcount} {totalHeadcount === 1 ? 'resource' : 'resources'} across{' '}
                  {proposalResources.length}{' '}
                  {proposalResources.length === 1 ? 'role' : 'roles'}
                </Text>
              </View>
            ) : null}
          </View>

          {/* ── Optional internal cost breakdown ───
              Off by default: a customer-facing quotation must not disclose the
              salary and statutory components behind the price. */}
          {includeBreakdown &&
            proposalResources.some((r) => (r.lineItems || []).some((i) => i.isActive)) && (
              <>
                <Text style={pdfStyles.sectionTitle}>Cost Breakdown (Internal)</Text>
                {/* Broken out per resource: on a multi-resource proposal a single
                    flat component list would not say which person each cost
                    belongs to, and the components differ per person. */}
                {proposalResources.map((resource, rIndex) => {
                  const items = (resource.lineItems || []).filter((i) => i.isActive);
                  if (!items.length) return null;
                  const heading = resourceHeading(resource);
                  const qty = resourceQty(resource);
                  return (
                    <View key={resource.id || rIndex} wrap={false}>
                      {isMultiResource ? (
                        <Text style={pdfStyles.breakdownGroup}>
                          {heading.name || heading.role}
                          {qty > 1 ? ` — ${qty} resources` : ''}
                        </Text>
                      ) : null}
                      <View style={pdfStyles.breakdownHeader}>
                        <Text style={[pdfStyles.breakdownLabel, pdfStyles.bold]}>Component</Text>
                        <Text style={[pdfStyles.breakdownCat, pdfStyles.bold]}>Category</Text>
                        <Text style={[pdfStyles.breakdownAmt, pdfStyles.bold]}>Monthly</Text>
                        <Text style={[pdfStyles.breakdownAmt, pdfStyles.bold]}>Annual</Text>
                      </View>
                      {items.map((item, i) => {
                        const billed = billable(item.monthly);
                        return (
                          <View
                            key={item.id || `${item.label}-${i}`}
                            style={pdfStyles.breakdownRow}
                            wrap={false}
                          >
                            <Text style={pdfStyles.breakdownLabel}>
                              {resolveLabel(
                                item.label,
                                resource.insurancePremiumFactor ?? 1,
                                resource.dependentsCount ?? 0
                              )}
                            </Text>
                            <Text style={pdfStyles.breakdownCat}>
                              {CATEGORY_LABELS[item.category] || item.category || '—'}
                            </Text>
                            <Text style={pdfStyles.breakdownAmt}>
                              {currency} {fmtNumber(billed.monthly)}
                            </Text>
                            <Text style={pdfStyles.breakdownAmt}>
                              {currency} {fmtNumber(billed.annual)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </>
            )}

          {/* ── Notes ─── */}
          {notes.trim() ? (
            <>
              <Text style={pdfStyles.sectionTitle}>Notes</Text>
              <Text style={pdfStyles.bodyText}>{notes.trim()}</Text>
            </>
          ) : null}

          {/* ── Terms ─── */}
          <Text style={pdfStyles.sectionTitle}>Terms &amp; Conditions</Text>
          <Text style={pdfStyles.termItem}>
            • This quotation is valid until {fPdfDate(meta.validUntil)} and is subject to written
            confirmation thereafter.
          </Text>
          <Text style={pdfStyles.termItem}>
            • All charges are quoted in {currency}, exclusive of {TAX_LABEL}. {TAX_LABEL} at{' '}
            {meta.taxPercent}% will be applied on invoice where applicable.
          </Text>
          <Text style={pdfStyles.termItem}>
            • Charges are billed as 12 equal monthly instalments and cover the scope listed above.
          </Text>
          <Text style={pdfStyles.termItem}>
            • Services are provided by {meta.entityLabel}. Mobilisation is subject to visa and
            government approvals.
          </Text>
          <Text style={pdfStyles.termItem}>
            • Any change to nationality, family status, insurance plan or scope requires a revised
            quotation.
          </Text>

          {/* ── Footer ─── */}
          <View style={pdfStyles.footer}>
            <Text style={pdfStyles.footerNote}>
              If you have any questions concerning this quotation,{'\n'}
              please contact us at accounts@iotatechnologies.ai{'\n'}
              {TAX_LABEL} as applicable
            </Text>
            <View>
              <Text style={pdfStyles.footerTag}>Generated by IOTA Technologies</Text>
              {meta.preparedBy ? (
                <Text style={pdfStyles.footerTag}>Prepared by {meta.preparedBy}</Text>
              ) : null}
            </View>
          </View>

          {/* Page furniture — repeated on every page once the breakdown or a long
              notes block pushes the document past one page. */}
          <View style={pdfStyles.pageFooter} fixed>
            <Text>
              {meta.reference} · {meta.documentTitle}
            </Text>
            <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          </View>
        </Page>
      </Document>
    );
  };

  const handleDownloadPDF = async (countryMeta, subtotal, vatAmount, grandTotal, options = {}) => {
    setPdfGenerating(true);
    try {
      const doc = buildPDFDoc(countryMeta, subtotal, vatAmount, grandTotal, options);
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildPDFFileName(buildQuotationMeta(countryMeta));
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed:', err);
      setError('Could not generate the quotation PDF. Please try again.');
    } finally {
      setPdfGenerating(false);
    }
  };

  const handlePrintPDF = async (countryMeta, subtotal, vatAmount, grandTotal, options = {}) => {
    setPdfGenerating(true);
    try {
      const doc = buildPDFDoc(countryMeta, subtotal, vatAmount, grandTotal, options);
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Print failed:', err);
      setError('Could not open the quotation PDF. Please try again.');
    } finally {
      setPdfGenerating(false);
    }
  };


  const handleShareEmail = (countryMeta, grandTotal) => {
    const meta = buildQuotationMeta(countryMeta);
    const subject = encodeURIComponent(
      `Resource Quotation — ${meta.documentTitle} (${meta.reference})`
    );
    const body = encodeURIComponent(
      `Dear ${meta.customerName || 'Team'},\n\nPlease find the resource quotation summary below.\n\n` +
        `Quotation: ${meta.documentTitle}\n` +
        `Reference: ${meta.reference}\n` +
        `Issued: ${fPdfDate(meta.issuedOn)}\n` +
        `Valid Until: ${fPdfDate(meta.validUntil)}\n` +
        `Issuing Entity: ${meta.entityLabel}\n` +
        (meta.resourceName ? `Resource: ${meta.resourceName}\n` : '') +
        (meta.jdTitle ? `Position: ${meta.jdTitle}\n` : '') +
        `Nationality: ${nationality}\n` +
        `Family Status: ${meta.familyLabel}\n` +
        `Insurance Plan: Bupa Premium ${insurancePremiumFactor}\n\n` +
        `Total Monthly: ${currency} ${fmtNumber(totalMonthly)}\n` +
        `Total Annual: ${currency} ${fmtNumber(totalAnnual)}\n` +
        `Grand Total: ${currency} ${fmtNumber(grandTotal)}\n` +
        `${meta.taxLabel} (${meta.taxPercent}%) as applicable — not included\n\n` +
        (notes.trim() ? `Notes: ${notes.trim()}\n\n` : '') +
        `Best regards,\nIOTA Technologies\naccounts@iotatechnologies.ai`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleShareWhatsApp = async (countryMeta, subtotal, vatAmount, grandTotal) => {
    const meta = buildQuotationMeta(countryMeta);
    const fileName = buildPDFFileName(meta);

    // ── Mobile: share the actual PDF file via Web Share API ──────────────
    if (typeof navigator !== 'undefined' && navigator.canShare) {
      setPdfGenerating(true);
      try {
        const doc = buildPDFDoc(countryMeta, subtotal, vatAmount, grandTotal);
        const blob = await pdf(doc).toBlob();
        const file = new File([blob], fileName, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Resource Quotation — ${meta.documentTitle}`,
            text: `${meta.documentTitle} (${meta.reference}) — resource quotation from IOTA Technologies.`,
            files: [file],
          });
          return;
        }
      } catch (err) {
        // AbortError = user dismissed the share sheet — not an error
        if (err?.name !== 'AbortError') console.error('WhatsApp share failed:', err);
        return;
      } finally {
        setPdfGenerating(false);
      }
    }

    // ── Desktop fallback: open WhatsApp with text summary ─────────────────
    const employeeLabel = nationality ? `${nationality} Employee` : 'Employee';
    const text = encodeURIComponent(
      `*Resource Quotation — ${meta.documentTitle}*\n` +
        `Ref: ${meta.reference} · Valid until ${fPdfDate(meta.validUntil)}\n\n` +
        (meta.customerName ? `🏢 Prepared for: ${meta.customerName}\n` : '') +
        `📋 Position: *${meta.jdTitle || employeeLabel}*\n` +
        (meta.resourceName ? `👤 Resource: ${meta.resourceName}\n` : '') +
        `👨‍👩‍👧 Family: ${meta.familyLabel}\n` +
        `🛡️ Insurance: Bupa Premium ${insurancePremiumFactor}\n` +
        `💰 Monthly: *${currency} ${fmtNumber(totalMonthly)}*\n` +
        `📅 Annual: *${currency} ${fmtNumber(totalAnnual)}*\n` +
        `✅ Grand Total: *${currency} ${fmtNumber(grandTotal)}*\n` +
        `🧾 ${meta.taxLabel} (${meta.taxPercent}%) as applicable — not included\n\n` +
        `_IOTA Technologies — accounts@iotatechnologies.ai_`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardContent>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton onClick={() => router.push(paths.dashboard.profile.resourceCalculation.root)}>
            <Iconify icon="eva:arrow-back-fill" />
          </IconButton>
          <Typography variant="h4">
            {isEdit ? 'Edit Resource Calculation' : 'New Resource Calculation'}
          </Typography>
        </Stack>
        {isEdit && (
          <Chip
            label={status}
            color={STATUS_COLORS[status] || 'default'}
            sx={{ textTransform: 'capitalize' }}
          />
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {officeChangedWarning && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setOfficeChangedWarning('')}>
          {officeChangedWarning}
        </Alert>
      )}

      {/* ── Resource tabs ───────────────────────────────────────────────────
          One tab per quoted resource. Everything below the tabs — the resource
          fields AND the cost breakdown — belongs to the selected resource
          alone, so each person on the proposal is costed on their own
          components. Only the proposal terms (customer, office, currency,
          notes, validity) are shared. */}
      <Card sx={{ mb: 3 }}>
        <Stack
          direction="row"
          alignItems="center"
          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Tabs
            value={activeResourceIndex}
            onChange={(_, index) => handleSelectResource(index)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ flexGrow: 1, minHeight: 64, px: 1 }}
          >
            {proposalResources.map((resource, index) => {
              const heading = resourceHeading(resource);
              const qty = resourceQty(resource);
              return (
                <Tab
                  key={resource.id || index}
                  sx={{ minHeight: 64, textTransform: 'none', alignItems: 'flex-start' }}
                  label={
                    <Stack spacing={0.25} alignItems="flex-start">
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Typography variant="body2" fontWeight={700}>
                          {heading.name || heading.role}
                        </Typography>
                        {qty > 1 && (
                          <Chip
                            label={`× ${qty}`}
                            size="small"
                            color="primary"
                            sx={{ height: 18, fontSize: 10 }}
                          />
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {currency} {fmtNumber(resourceMonthly(resource) * qty)}/mo
                      </Typography>
                    </Stack>
                  }
                />
              );
            })}
          </Tabs>

          <Stack direction="row" spacing={0.5} sx={{ px: 2, flexShrink: 0 }}>
            <Tooltip title="Add a resource, copying the current one's components">
              <Button
                size="small"
                variant="outlined"
                startIcon={<Iconify icon="solar:copy-bold" width={16} />}
                onClick={() => handleAddResource('copy')}
              >
                Duplicate
              </Button>
            </Tooltip>
            <Tooltip title="Add a resource with a fresh set of components">
              <Button
                size="small"
                variant="contained"
                startIcon={<Iconify icon="mingcute:add-line" width={16} />}
                onClick={() => handleAddResource('blank')}
              >
                Add Resource
              </Button>
            </Tooltip>
            {proposalResources.length > 1 && (
              <Tooltip title="Remove the selected resource">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleRemoveResource(activeResourceIndex)}
                >
                  <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>

        {isMultiResource && (
          <Box sx={{ px: 3, py: 1.5, backgroundColor: 'background.neutral' }}>
            <Typography variant="caption" color="text.secondary">
              Editing <strong>{resourceHeading(activeResourceDraft).name || `resource ${activeResourceIndex + 1}`}</strong>
              {' — '}its salary, benefits and every cost component below apply to this resource only.
              Proposal total across all {proposalResources.length} resources:{' '}
              <strong>
                {currency} {fmtNumber(totalMonthly)}/mo · {currency} {fmtNumber(totalAnnual)}/yr
              </strong>
            </Typography>
          </Box>
        )}
      </Card>

      <Grid container spacing={3}>
        {/* ── Left column: metadata ─────────────────────────────────────── */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
              Proposal Details
            </Typography>

            <Stack spacing={2.5}>
              <TextField
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Egyptian National – 2.1 Insurance – RB"
                fullWidth
                required
              />

              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  THIS RESOURCE ONLY
                </Typography>
              </Divider>

              <TextField
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Optional — candidate's full name (shown first on the quotation)"
                helperText="Optional. When filled, it appears first (bold) on the quotation; otherwise the nationality is used."
                fullWidth
              />

              <TextField
                label="Number of resources"
                type="number"
                value={resourceQuantity}
                onChange={(e) => setResourceQuantity(e.target.value)}
                onBlur={() =>
                  setResourceQuantity(Math.max(1, Math.round(Number(resourceQuantity) || 1)))
                }
                inputProps={{ min: 1, step: 1 }}
                helperText="How many people at these exact terms. The quotation prints this as the Qty column."
                fullWidth
              />

              <FormControl fullWidth required>
                <InputLabel>IOTA Office</InputLabel>
                <Select
                  value={iotaOffice}
                  label="IOTA Office"
                  onChange={(e) => handleIotaOfficeChange(e.target.value)}
                >
                  {IOTA_OFFICE_OPTIONS.map((c) => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>Nationality</InputLabel>
                <Select
                  value={nationality}
                  label="Nationality"
                  onChange={(e) => setNationality(e.target.value)}
                >
                  <MenuItem value="">— Select —</MenuItem>
                  {NATIONALITY_OPTIONS.map((n) => (
                    <MenuItem key={n} value={n}>
                      {n}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth error={Boolean(customersError)}>
                <InputLabel>Customer</InputLabel>
                <Select
                  value={customerId}
                  label="Customer"
                  onChange={(e) => {
                    setCustomerTouched(true);
                    setCustomerId(e.target.value);
                  }}
                >
                  <MenuItem value="">— None —</MenuItem>
                  {/* The stored customer, when it matches no record in the list
                      — the directory has not loaded yet, the request failed, or
                      the customer was deleted. Without this option MUI has no
                      entry for the current value, renders the control blank and
                      warns about an out-of-range value, which is what made a
                      saved quotation look as though it had no customer. */}
                  {customerId &&
                    !customerList.some((c) => String(c.id) === String(customerId)) && (
                      <MenuItem value={customerId}>
                        {customerLabel(resolveCustomer(customerId)) || customerId}
                      </MenuItem>
                    )}
                  {customerList.map((c) => (
                    <MenuItem key={c.id} value={String(c.id)}>
                      {c.customerNameEn || c.customerNameAr || String(c.id)}
                    </MenuItem>
                  ))}
                </Select>
                {/* An empty list and a failed request look identical in a Select.
                    Say which, so this reads as "the call failed" rather than
                    "there are no customers". */}
                {customersError && (
                  <FormHelperText>
                    Could not load customers — {customersError.message || 'request failed'}
                  </FormHelperText>
                )}
              </FormControl>

              <TextField
                label="Bupa Insurance Premium Factor"
                type="number"
                value={insurancePremiumFactor}
                onChange={(e) => setInsurancePremiumFactor(e.target.value)}
                inputProps={{ step: 0.1, min: 1 }}
                helperText="e.g. 2.1 — used in plan label only"
                fullWidth
              />

              {/* ── Family Status ──────────────────────────────────────── */}
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  p: 1.5,
                  backgroundColor: familyStatus ? 'success.lighter' : 'background.neutral',
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" fontWeight={700}>
                      Family Status
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {familyStatus
                        ? 'Resource has spouse & dependents'
                        : 'Single — no family dependents'}
                    </Typography>
                  </Box>
                  <Switch
                    checked={familyStatus}
                    onChange={(e) => handleFamilyStatusChange(e.target.checked)}
                    color="success"
                  />
                </Stack>

                {familyStatus && (
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <TextField
                      label="Number of Dependents (Children)"
                      type="number"
                      value={dependentsCount}
                      onChange={(e) => handleDependentsCountChange(e.target.value)}
                      inputProps={{ step: 1, min: 0 }}
                      helperText="Dependents only — candidate and wife are added automatically (+2)"
                      fullWidth
                      size="small"
                    />

                    <TextField
                      label="Insurance Cost Per Pax (Annual)"
                      type="number"
                      value={insuranceCostPerPax}
                      onChange={(e) => handleInsuranceCostPerPaxChange(e.target.value)}
                      inputProps={{ step: 500, min: 0 }}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">SAR</InputAdornment>,
                      }}
                      helperText={`Billed ${fmtBilling(insuranceCostPerPax * (dependentsCount + 2))} / yr  (1 candidate + ${dependentsCount} dependents + 1 wife = ${dependentsCount + 2} pax)`}
                      fullWidth
                      size="small"
                    />
                  </Stack>
                )}
              </Box>

              {/* Annual Ticket cost per pax — always visible */}
              {(() => {
                const ticketPax = familyStatus ? dependentsCount + 2 : 1;
                const ticketPaxLabel = familyStatus ? ` × ${dependentsCount + 2} pax` : ' × 1 pax';
                const ticketPaxDesc = familyStatus
                  ? `employee + wife + ${dependentsCount} children`
                  : 'employee only';
                return (
                  <TextField
                    label={`Annual Ticket Cost Per Pax${ticketPaxLabel}`}
                    type="number"
                    value={ticketCostPerPax}
                    onChange={(e) => handleTicketCostPerPaxChange(e.target.value)}
                    inputProps={{ step: 500, min: 0 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">SAR</InputAdornment>,
                    }}
                    helperText={`Billed ${fmtBilling(ticketCostPerPax * ticketPax)} / yr  (${ticketPaxDesc})`}
                    fullWidth
                  />
                );
              })()}

              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
                  {STATUS_OPTIONS.map((s) => (
                    <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Linked Job Description</InputLabel>
                <Select
                  value={jdId}
                  label="Linked Job Description"
                  onChange={(e) => setJdId(e.target.value)}
                >
                  <MenuItem value="">— None —</MenuItem>
                  {jdList.map((jd) => (
                    <MenuItem key={jd.id} value={jd.id}>
                      {jd.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Linked Candidate</InputLabel>
                <Select
                  value={candidateId}
                  label="Linked Candidate"
                  onChange={(e) => setCandidateId(e.target.value)}
                >
                  <MenuItem value="">— None —</MenuItem>
                  {candidateList.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name} {c.email ? `(${c.email})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Resume attachment */}
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ mb: 0.5 }}
                >
                  Attach Resume (optional — uploads to OneDrive)
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    variant="outlined"
                    size="small"
                    component="label"
                    startIcon={
                      resumeUploading ? (
                        <CircularProgress size={14} />
                      ) : (
                        <Iconify icon="solar:upload-bold" />
                      )
                    }
                    disabled={resumeUploading}
                  >
                    Upload Resume
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.docx,.doc"
                      onChange={handleResumeUpload}
                    />
                  </Button>
                  {resumeUrl && (
                    <Typography
                      component="a"
                      href={resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="caption"
                      color="primary"
                    >
                      View
                    </Typography>
                  )}
                </Stack>
                {resumeUploadError && (
                  <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
                    {resumeUploadError}
                  </Typography>
                )}
              </Box>

              <TextField
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                rows={3}
                fullWidth
              />

              {isEdit && (
                <TextField
                  label="Calculation ID"
                  value={id}
                  InputProps={{ readOnly: true }}
                  size="small"
                  fullWidth
                  sx={{ fontFamily: 'monospace' }}
                />
              )}
            </Stack>
          </Card>
        </Grid>

        {/* ── Right column: cost breakdown table ───────────────────────── */}
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            {/* Proposal preview header — mirrors the image */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 2 }}
            >
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  {isMultiResource
                    ? `Cost Components — ${resourceHeading(activeResourceDraft).name || resourceHeading(activeResourceDraft).role}`
                    : title || 'Resource Calculation'}
                </Typography>
                {(nationality || customerId) && (
                  <Typography variant="caption" color="text.secondary">
                    {[
                      nationality,
                      customerLabel(resolveCustomer(customerId)) || customerId || null,
                    ]
                      .filter(Boolean)
                      .join(' — ')}
                    {Number(insurancePremiumFactor) > 1 ? ` — Bupa ${insurancePremiumFactor}` : ''}
                    {Number(dependentsCount) > 0 ? ` — ${dependentsCount} dependents` : ''}
                  </Typography>
                )}
              </Box>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Iconify icon="mingcute:add-line" />}
                onClick={handleAddLineItem}
              >
                Add Line
              </Button>
            </Stack>

            {/* Base salary — top-level input */}
            <Box sx={{ mb: 2 }}>
              <TextField
                label="Base Monthly Salary"
                type="text"
                inputMode="numeric"
                value={Number(baseSalary || 0).toLocaleString('en-SA')}
                onChange={(e) => handleBaseSalaryChange(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{currency}</InputAdornment>,
                }}
                inputProps={{ style: { textAlign: 'right' } }}
                size="small"
                sx={{ width: 280 }}
              />
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.100' }}>
                    <TableCell sx={{ fontWeight: 700, width: '40%' }}>
                      Employee Calculation
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Monthly
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Annual
                    </TableCell>
                    <TableCell sx={{ width: 32 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lineItems.map((item, idx) => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <TextField
                            value={resolveLabel(
                              item.label,
                              insurancePremiumFactor,
                              dependentsCount
                            )}
                            onChange={(e) => handleLineItemChange(idx, 'label', e.target.value)}
                            size="small"
                            variant="standard"
                            InputProps={{
                              disableUnderline: !item.isEditable,
                              readOnly: !item.isEditable,
                            }}
                            sx={{ '& input': { fontSize: 13 } }}
                          />
                          <Chip
                            label={CATEGORY_LABELS[item.category] || item.category}
                            size="small"
                            variant="outlined"
                            sx={{ width: 'fit-content', height: 18, fontSize: 10 }}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        {item.isEditable ? (
                          <TextField
                            type="text"
                            inputMode="numeric"
                            value={Math.round(Number(item.monthly || 0)).toLocaleString('en-SA')}
                            onChange={(e) => {
                              const raw = Number(String(e.target.value).replace(/,/g, '')) || 0;
                              handleLineItemChange(idx, 'monthly', raw);
                            }}
                            size="small"
                            variant="standard"
                            inputProps={{ style: { textAlign: 'right' } }}
                            sx={{ width: 120 }}
                          />
                        ) : (
                          <Typography
                            variant="body2"
                            sx={{ textAlign: 'right', color: 'text.disabled', width: 120 }}
                          >
                            {Math.round(Number(item.monthly || 0)).toLocaleString('en-SA')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {fmtNumber(billable(item.monthly).annual)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0} alignItems="center">
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={item.isActive}
                                onChange={(e) =>
                                  handleLineItemChange(
                                    idx,
                                    'isActive',
                                    e.target.checked,
                                    item.category
                                  )
                                }
                              />
                            }
                            label=""
                            sx={{ m: 0 }}
                          />
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveLineItem(idx)}
                            disabled={item.category === 'salary'}
                          >
                            <Iconify icon="solar:trash-bin-minimalistic-bold" width={14} />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totals row */}
                  <TableRow sx={{ backgroundColor: 'grey.100' }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        12 Monthly Billing
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700}>
                        {fmtNumber(totalMonthly)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700}>
                        {fmtNumber(totalAnnual)}
                      </Typography>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ my: 2 }} />

            <Stack direction="row" spacing={2} justifyContent="flex-end" flexWrap="wrap">
              <Button
                variant="outlined"
                onClick={() => router.push(paths.dashboard.profile.resourceCalculation.root)}
                disabled={saving}
              >
                Cancel
              </Button>
              {isEdit && status === 'draft' && (
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={handleSubmitForApproval}
                  disabled={submittingForApproval}
                  startIcon={
                    submittingForApproval ? (
                      <CircularProgress size={16} />
                    ) : (
                      <Iconify icon="solar:send-bold" />
                    )
                  }
                >
                  Submit for Approval
                </Button>
              )}
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={saving}
                startIcon={
                  saving ? <CircularProgress size={16} /> : <Iconify icon="mingcute:save-line" />
                }
              >
                {isEdit ? 'Save Changes' : 'Create & Submit for Approval'}
              </Button>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* ── Quotation Summary Section ─────────────────────────────────────── */}
      {(() => {
        const countryMeta =
          IOTA_OFFICE_OPTIONS.find((c) => c.value === iotaOffice) || IOTA_OFFICE_OPTIONS[0];
        const TAX_LABEL = countryMeta.taxLabel;
        const subtotal = totalAnnual;
        // VAT is quoted as "applicable" and is NOT added into the quotation total.
        const vatAmount = 0;
        const grandTotal = subtotal;

        // Description bullets and the quotation's identifying facts both come
        // from the same helpers the PDF uses, so what is printed can never
        // differ from what was reviewed on screen.
        const quotationMeta = buildQuotationMeta(countryMeta);
        const customerName = quotationMeta.customerName;

        return (
          <Card sx={{ mt: 3, overflow: 'hidden' }}>
            {/* Card header */}
            <Box
              sx={{
                backgroundColor: '#0B5E41',
                px: 3,
                py: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ minWidth: 0, pr: 2 }}>
                <Typography
                  variant="caption"
                  color="rgba(255,255,255,0.7)"
                  sx={{ letterSpacing: 1.2, textTransform: 'uppercase', display: 'block' }}
                >
                  Resource Quotation · {quotationMeta.reference}
                </Typography>
                <Typography variant="subtitle1" color="white" fontWeight={700} letterSpacing={0.3}>
                  {quotationMeta.documentTitle}
                </Typography>
                {customerName && (
                  <Typography variant="caption" color="rgba(255,255,255,0.75)">
                    Prepared for {customerName}
                  </Typography>
                )}
              </Box>

              {/* Share / Export buttons */}
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Tooltip title="Download PDF">
                  <IconButton
                    size="small"
                    sx={{ color: 'white' }}
                    disabled={pdfGenerating}
                    onClick={() => handleDownloadPDF(countryMeta, subtotal, vatAmount, grandTotal)}
                  >
                    {pdfGenerating ? (
                      <CircularProgress size={16} sx={{ color: 'white' }} />
                    ) : (
                      <Iconify icon="solar:file-download-bold" width={18} />
                    )}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Print / Open PDF">
                  <IconButton
                    size="small"
                    sx={{ color: 'white' }}
                    onClick={() => handlePrintPDF(countryMeta, subtotal, vatAmount, grandTotal)}
                  >
                    <Iconify icon="solar:printer-bold" width={18} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Share">
                  <IconButton
                    size="small"
                    sx={{ color: 'white' }}
                    onClick={(e) => setShareAnchor(e.currentTarget)}
                  >
                    <Iconify icon="solar:share-bold" width={18} />
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={shareAnchor}
                  open={Boolean(shareAnchor)}
                  onClose={() => setShareAnchor(null)}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <MenuItem
                    onClick={() => {
                      setShareAnchor(null);
                      handleShareEmail(countryMeta, grandTotal);
                    }}
                  >
                    <ListItemIcon>
                      <Iconify icon="solar:letter-bold" width={18} />
                    </ListItemIcon>
                    Share via Email
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setShareAnchor(null);
                      handleShareWhatsApp(countryMeta, subtotal, vatAmount, grandTotal);
                    }}
                  >
                    <ListItemIcon>
                      <Iconify icon="logos:whatsapp-icon" width={18} />
                    </ListItemIcon>
                    Share via WhatsApp
                  </MenuItem>
                  <Divider sx={{ my: 0.5 }} />
                  {/* Separate export: the customer-facing quotation must not
                      disclose the salary and statutory components behind the
                      price, so the breakdown is opt-in and labelled internal. */}
                  <MenuItem
                    onClick={() => {
                      setShareAnchor(null);
                      handleDownloadPDF(countryMeta, subtotal, vatAmount, grandTotal, {
                        includeBreakdown: true,
                      });
                    }}
                  >
                    <ListItemIcon>
                      <Iconify icon="solar:document-text-bold" width={18} />
                    </ListItemIcon>
                    Download with cost breakdown (internal)
                  </MenuItem>
                </Menu>
              </Stack>
            </Box>

            {/* Quotation details — the same grid the PDF prints, so reviewing the
                page is equivalent to reviewing the downloaded document. */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                gap: 2,
                px: 3,
                py: 2,
                backgroundColor: '#F7FAF9',
                borderBottom: '1px solid #E2EBE7',
              }}
            >
              {[
                ['Quotation Ref', quotationMeta.reference],
                ['Date of Issue', fPdfDate(quotationMeta.issuedOn)],
                ['Valid Until', fPdfDate(quotationMeta.validUntil)],
                ['Status', quotationMeta.statusLabel],
                ['Prepared For', customerName || '—'],
                ['Issuing Entity', quotationMeta.entityLabel],
                ...(isMultiResource
                  ? [
                      ['Resources Quoted', `${proposalResources.length} roles`],
                      [
                        'Total Headcount',
                        `${totalHeadcount} ${totalHeadcount === 1 ? 'person' : 'people'}`,
                      ],
                    ]
                  : [
                      ['Resource', quotationMeta.resourceName || '—'],
                      ['Position / Job Description', quotationMeta.jdTitle || '—'],
                      ['Nationality', nationality || '—'],
                      ['Family Status', quotationMeta.familyLabel],
                      ['Insurance Plan', `Bupa Premium ${insurancePremiumFactor}`],
                    ]),
                ['Currency', currency],
              ].map(([label, value]) => (
                <Box key={label} sx={{ minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', textTransform: 'uppercase', letterSpacing: 0.6 }}
                  >
                    {label}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {value}
                  </Typography>
                </Box>
              ))}
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#E8F3EF' }}>
                    <TableCell
                      sx={{
                        color: '#111111',
                        fontWeight: 700,
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                        width: '48%',
                        borderBottom: 'none',
                        py: 1.5,
                      }}
                    >
                      Description
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        color: '#111111',
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        width: '8%',
                        borderBottom: 'none',
                        py: 1.5,
                      }}
                    >
                      Qty
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: '#111111',
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        width: '22%',
                        borderBottom: 'none',
                        lineHeight: 1.4,
                        py: 1.5,
                      }}
                    >
                      Monthly Charges
                      <br />
                      (Excl. {TAX_LABEL})
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: '#111111',
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        width: '24%',
                        borderBottom: 'none',
                        lineHeight: 1.4,
                        py: 1.5,
                      }}
                    >
                      Annual Charges
                      <br />
                      (12 Months)
                      <br />
                      (Excl. {TAX_LABEL})
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* One row per quoted resource, matching the PDF exactly. */}
                  {proposalResources.map((resource, index) => {
                    const heading = resourceHeading(resource);
                    const qty = resourceQty(resource);
                    const unitMonthly = resourceMonthly(resource);
                    const lineMonthly = unitMonthly * qty;
                    const isOpen = index === activeResourceIndex;
                    return (
                      <TableRow
                        key={resource.id || index}
                        sx={isOpen && isMultiResource ? { backgroundColor: 'action.hover' } : null}
                      >
                        <TableCell sx={{ verticalAlign: 'top', py: 2.5, borderBottom: 'none' }}>
                          {heading.name && (
                            <Typography variant="body2" fontWeight={600}>
                              {heading.name}
                            </Typography>
                          )}
                          <Typography variant="body2" fontWeight={600} gutterBottom>
                            {heading.role}
                            {heading.jdTitle ? ` — ${heading.jdTitle}` : ''}
                          </Typography>
                          <Box component="ul" sx={{ pl: 2.5, mt: 0.5, mb: 0 }}>
                            {buildScopeBullets(resource).map((bullet, i) => (
                              <Typography key={i} component="li" variant="body2" sx={{ mb: 0.3 }}>
                                {bullet}
                              </Typography>
                            ))}
                          </Box>
                          {qty > 1 && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}
                            >
                              {qty} × {currency} {fmtNumber(unitMonthly)} per month each
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{ verticalAlign: 'middle', py: 2.5, borderBottom: 'none' }}
                        >
                          <Typography variant="body1" fontWeight={600}>
                            {qty}
                          </Typography>
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ verticalAlign: 'middle', py: 2.5, borderBottom: 'none' }}
                        >
                          <Typography variant="body1" fontWeight={600}>
                            {currency} {fmtNumber(lineMonthly)}
                          </Typography>
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ verticalAlign: 'middle', py: 2.5, borderBottom: 'none' }}
                        >
                          <Typography variant="body1" fontWeight={600}>
                            {currency} {fmtNumber(lineMonthly * 12)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider />

            {/* Footer: contact note + subtotal/VAT/total */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                flexWrap: 'wrap',
                gap: 2,
                px: 3,
                py: 2.5,
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ maxWidth: 340, lineHeight: 1.6 }}
              >
                If you have any questions concerning this quotation,
                <br />
                please contact us at{' '}
                <Box component="strong" sx={{ color: 'text.primary' }}>
                  accounts@iotatechnologies.ai
                </Box>
                .
                <br />
                VAT as applicable
              </Typography>

              <Stack spacing={0.75} sx={{ minWidth: 300 }}>
                <Stack direction="row" justifyContent="space-between" spacing={4}>
                  <Typography variant="body2" fontWeight={700} sx={{ letterSpacing: 0.3 }}>
                    SUBTOTAL:
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {currency} {fmtNumber(subtotal)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" spacing={4}>
                  <Typography variant="body2" color="text.secondary">
                    {TAX_LABEL} ({quotationMeta.taxPercent}%):
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    As applicable — not included
                  </Typography>
                </Stack>
                <Divider sx={{ my: 0.5 }} />
                <Stack direction="row" justifyContent="space-between" spacing={4}>
                  <Typography variant="body1" fontWeight={800} sx={{ letterSpacing: 0.3 }}>
                    TOTAL:
                  </Typography>
                  <Typography variant="body1" fontWeight={800} color="success.dark">
                    {currency} {fmtNumber(grandTotal)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" spacing={4}>
                  <Typography variant="body2" color="text.secondary">
                    Billed as 12 equal monthly instalments of
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currency} {fmtNumber(totalMonthly)}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          </Card>
        );
      })()}

      {/* ── Approval Workflow Section ─────────────────────────────────────── */}
      {isEdit &&
        (() => {
          const approvals = rcData?.data?.approvals || [];
          const currentUserEmail = getUserEmail();
          const myPending = approvals.find(
            (a) => a.approverEmail === currentUserEmail && a.decision === 'pending'
          );
          return (
            <Card sx={{ p: 3, mt: 3 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle1" fontWeight={700}>
                  Approval Workflow
                </Typography>
                <Stack direction="row" spacing={1}>
                  {myPending && (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        disabled={approvalActionLoading === 'approved'}
                        onClick={() => handleApproveReject('approved')}
                        startIcon={
                          approvalActionLoading === 'approved' ? (
                            <CircularProgress size={14} />
                          ) : (
                            <Iconify icon="solar:check-circle-bold" />
                          )
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        disabled={approvalActionLoading === 'rejected'}
                        onClick={() => handleApproveReject('rejected')}
                        startIcon={
                          approvalActionLoading === 'rejected' ? (
                            <CircularProgress size={14} />
                          ) : (
                            <Iconify icon="solar:close-circle-bold" />
                          )
                        }
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {(status === 'submitted' || status === 'approved') && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Iconify icon="solar:forward-bold" />}
                      onClick={() => setForwardDialogOpen(true)}
                    >
                      Forward to User
                    </Button>
                  )}
                </Stack>
              </Stack>

              {approvals.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No approval activity yet.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {approvals.map((a, i) => (
                    <Box
                      key={a.id || i}
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        backgroundColor:
                          a.decision === 'approved'
                            ? 'success.lighter'
                            : a.decision === 'rejected'
                              ? 'error.lighter'
                              : 'background.neutral',
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                        <Chip
                          label={
                            a.type === 'submit'
                              ? 'Submitted'
                              : a.type === 'forward'
                                ? 'Forwarded'
                                : 'Decision'
                          }
                          size="small"
                          color={
                            a.type === 'submit'
                              ? 'info'
                              : a.type === 'forward'
                                ? 'warning'
                                : 'default'
                          }
                          variant="outlined"
                        />
                        <Typography variant="body2" fontWeight={600}>
                          {a.approverEmail}
                        </Typography>
                        <Chip
                          label={a.decision.charAt(0).toUpperCase() + a.decision.slice(1)}
                          size="small"
                          color={
                            a.decision === 'approved'
                              ? 'success'
                              : a.decision === 'rejected'
                                ? 'error'
                                : 'default'
                          }
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                          {new Date(a.decidedAt || a.createdAt).toLocaleString('en-GB')}
                        </Typography>
                      </Stack>
                      {a.notes && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          sx={{ mt: 0.5, ml: 0.5 }}
                        >
                          {a.notes}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Card>
          );
        })()}

      {/* ── Forward to User Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={forwardDialogOpen}
        onClose={() => setForwardDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Forward for Approval</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Recipient Email"
              type="email"
              value={forwardEmail}
              onChange={(e) => setForwardEmail(e.target.value)}
              placeholder="colleague@iotatechnologies.ai"
              fullWidth
              required
              autoFocus
            />
            <TextField
              label="Message (optional)"
              value={forwardNotes}
              onChange={(e) => setForwardNotes(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForwardDialogOpen(false)} disabled={forwarding}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleForward}
            disabled={forwarding || !forwardEmail.trim()}
            startIcon={
              forwarding ? <CircularProgress size={16} /> : <Iconify icon="solar:send-bold" />
            }
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
