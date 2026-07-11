'use client';

import {
  pdf,
  Font,
  Image as PdfImage,
  Document,
  Page,
  Text,
  View,
  StyleSheet as PdfStyleSheet,
} from '@react-pdf/renderer';
import useSWR from 'swr';
import { useState, useEffect, useCallback, useRef } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
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
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import Switch from '@mui/material/Switch';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import ListItemIcon from '@mui/material/ListItemIcon';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import {
  getResourceCalculation,
  getResourceCalculationTemplates,
  createResourceCalculation,
  updateResourceCalculation,
  listCandidates,
  listJobDescriptions,
  uploadResume,
  getCustomers,
  submitRCForApproval,
  forwardRC,
  approveRC,
} from 'src/utils/apiHelper';

import { Iconify } from 'src/components/iconify';
import { DashboardContent } from 'src/layouts/dashboard';

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
    // eslint-disable-next-line no-new-func
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
      const monthly = evalFormula(item.formula, context);
      if (code) context[code] = Number(monthly) || 0;
      return { ...item, monthly, annual: monthly * 12 };
    }

    // Non-computed — keep value, update annual
    const annual = item.annual || (Number(item.monthly) || 0) * 12;
    return { ...item, annual };
  });
}

function fmtNumber(val) {
  return Math.round(Number(val || 0)).toLocaleString('en-SA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * When familyStatus is enabled, override insurance and ticket line items with
 * family-based cost calculations (still editable by the user afterward).
 * Insurance: insuranceCostPerPax × (dependentsCount + 1 wife) — annual
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
      const familyPax = numDeps + 1; // kids + wife
      const annual = Math.round(numIns * familyPax);
      return { ...item, monthly: annual / 12, annual, isEditable: true };
    }
    // Ticket line — always recompute based on family status
    if (item.category === 'government' && item.label?.toLowerCase().includes('ticket')) {
      const totalPax = familyOn ? numDeps + 2 : 1; // employee + wife + kids OR just employee
      const annual = Math.round(numTicket * totalPax);
      return { ...item, monthly: annual / 12, annual, isEditable: true, isComputed: false };
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
  colAmt: { flex: 1.2, textAlign: 'right' },
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
  footerNote: { fontSize: 8.5, color: '#666666', maxWidth: 220, lineHeight: 1.6 },
  footerTag: { fontSize: 8, color: '#999999', textAlign: 'right' },
});

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
  const { data: customersData } = useSWR('customers', getCustomers);

  // ── Form state ────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [jdId, setJdId] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [customerId, setCustomerId] = useState('');
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
    const officeFromRecord = rc.iotaOffice || (rc.currency === 'INR' ? 'India' : 'KSA');
    setIotaOffice(officeFromRecord);
    setInitialized(true);
  }, [isEdit, rcData, initialized]);

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
          return { ...item, monthly: num, annual: num * 12 };
        }
        if (!item.code && item.category === 'salary') {
          return { ...item, monthly: num, annual: num * 12 };
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
  };

  // ── Line-item helpers ─────────────────────────────────────────────────────
  const handleLineItemChange = useCallback(
    (idx, field, val) => {
      setLineItems((prev) => {
        const updated = prev.map((item, i) => {
          if (i !== idx) return item;
          const next = { ...item, [field]: val };
          if (field === 'monthly') {
            next.annual = (Number(String(val).replace(/,/g, '')) || 0) * 12;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ── Totals ────────────────────────────────────────────────────────────────
  const activeItems = lineItems.filter((i) => i.isActive);
  const invoiceAmountItem = lineItems.find((i) => i.code === 'invoice_amount');
  const isIndiaOffice = iotaOffice === 'India';
  const totalMonthly = isIndiaOffice
    ? Number(invoiceAmountItem?.monthly || 0)
    : activeItems.reduce((s, i) => s + (Number(i.monthly) || 0), 0);
  const totalAnnual = isIndiaOffice
    ? Number(invoiceAmountItem?.annual || totalMonthly * 12 || 0)
    : activeItems.reduce((s, i) => s + (Number(i.annual) || i.monthly * 12 || 0), 0);

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
      // Resolve customer name from id for positionCode storage
      const selectedCustomer = customerList.find((c) => String(c.id) === String(customerId));
      const customerDisplayName =
        selectedCustomer?.customerNameEn || selectedCustomer?.customerNameAr || customerId || '';
      const payload = {
        title: title.trim(),
        jdId: jdId || undefined,
        candidateId: candidateId || undefined,
        iotaOffice,
        nationality: nationality.trim(),
        positionCode: String(customerDisplayName),
        insurancePremiumFactor: Number(insurancePremiumFactor) || 1,
        dependentsCount: Number(dependentsCount) || 0,
        familyStatus,
        insuranceCostPerPax: Number(insuranceCostPerPax) || 3000,
        ticketCostPerPax: Number(ticketCostPerPax) || 2500,
        baseSalary: Number(baseSalary) || 0,
        currency,
        lineItems,
        status,
        resumeUrl,
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

  // ── PDF generation ────────────────────────────────────────────────────────
  const buildPDFDoc = (countryMeta, subtotal, vatAmount, grandTotal) => {
    const TAX_LABEL = countryMeta.taxLabel;
    const VAT_RATE = countryMeta.taxRate;
    const customerObj = customerList.find((cu) => String(cu.id) === String(customerId));
    const customerName = customerObj?.customerNameEn || customerObj?.customerNameAr || '';
    const dependentsWord = dependentsCount !== 1 ? 'dependents' : 'dependent';
    const familyLine = familyStatus
      ? `Family with ${dependentsCount} ${dependentsWord} + wife`
      : 'Single';

    return (
      <Document>
        <Page size="A4" style={pdfStyles.page}>
          {/* ── Header band ─── */}
          <View style={pdfStyles.header}>
            {/* Logo — left */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <PdfImage src={IOTA_LOGO_WHITE_LOCAL} style={pdfStyles.headerLogo} />
              {/* Vertical separator */}
              <View style={{ width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.35)', marginHorizontal: 16 }} />
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                Resource Quotation
              </Text>
            </View>
            {/* Title + customer — right */}
            <View style={pdfStyles.headerLeft}>
              <Text style={pdfStyles.headerTitle}>Quotation Summary</Text>
              {customerName ? <Text style={pdfStyles.headerSub}>{customerName}</Text> : null}
            </View>
          </View>

          {/* ── Table header ─── */}
          <View style={pdfStyles.tableHeader}>
            <Text style={[pdfStyles.colDesc, pdfStyles.bold, { fontSize: 9 }]}>DESCRIPTION</Text>
            <Text style={[pdfStyles.colAmt, pdfStyles.bold, { fontSize: 9 }]}>
              {'MONTHLY CHARGES\n'}(Excl. {TAX_LABEL})
            </Text>
            <Text style={[pdfStyles.colAmt, pdfStyles.bold, { fontSize: 9 }]}>
              {'ANNUAL CHARGES\n(12 Months)\n'}(Excl. {TAX_LABEL})
            </Text>
          </View>

          {/* ── Main data row ─── */}
          <View style={pdfStyles.tableRow}>
            <View style={pdfStyles.colDesc}>
              <Text style={pdfStyles.bold}>
                {nationality ? `${nationality} Employee` : 'Employee'}
              </Text>
              <Text style={pdfStyles.bullet}>• {familyLine}</Text>
              {activeItems
                .filter((i) => i.category === 'insurance')
                .map((item) => (
                  <Text key={item.id || item.label} style={pdfStyles.bullet}>
                    • {resolveLabel(item.label, insurancePremiumFactor, dependentsCount)}
                  </Text>
                ))}
              {activeItems.some(
                (i) => i.category === 'government' && i.label.toLowerCase().includes('ticket')
              ) && <Text style={pdfStyles.bullet}>• Annual Travel Benefits</Text>}
              {activeItems.some((i) => i.category === 'statutory' || i.category === 'service') && (
                <Text style={pdfStyles.bullet}>• Standard Employee Benefits</Text>
              )}
              {activeItems.some(
                (i) =>
                  i.category === 'statutory' && i.label.toLowerCase().includes('end of service')
              ) && <Text style={pdfStyles.bullet}>• End of Service Benefits</Text>}
            </View>
            <Text style={[pdfStyles.colAmt, pdfStyles.bold, { fontSize: 11 }]}>
              {currency} {fmtNumber(totalMonthly)}
            </Text>
            <Text style={[pdfStyles.colAmt, pdfStyles.bold, { fontSize: 11 }]}>
              {currency} {fmtNumber(totalAnnual)}
            </Text>
          </View>

          {/* ── Totals ─── */}
          <View style={pdfStyles.totalsSection}>
            {[
              { label: 'SUBTOTAL:', value: subtotal },
              { label: `${TAX_LABEL} (${(VAT_RATE * 100).toFixed(0)}%):`, value: vatAmount },
              { label: 'OTHERS:', value: 0 },
            ].map(({ label, value }) => (
              <View key={label} style={pdfStyles.totalsRow}>
                <Text style={pdfStyles.bold}>{label}</Text>
                <Text style={pdfStyles.bold}>
                  {currency} {fmtNumber(value)}
                </Text>
              </View>
            ))}
            <View style={pdfStyles.divider} />
            <View style={pdfStyles.totalsRow}>
              <Text style={[pdfStyles.bold, { fontSize: 12 }]}>TOTAL:</Text>
              <Text style={[pdfStyles.bold, { fontSize: 12, color: '#0B5E41' }]}>
                {currency} {fmtNumber(grandTotal)}
              </Text>
            </View>
          </View>

          {/* ── Footer ─── */}
          <View style={pdfStyles.footer}>
            <Text style={pdfStyles.footerNote}>
              If you have any questions concerning this quotation,{'\n'}
              please contact us at accounts@iotatechnologies.ai
            </Text>
            <Text style={pdfStyles.footerTag}>Generated by IOTA Technologies</Text>
          </View>
        </Page>
      </Document>
    );
  };

  const handleDownloadPDF = async (countryMeta, subtotal, vatAmount, grandTotal) => {
    setPdfGenerating(true);
    try {
      const doc = buildPDFDoc(countryMeta, subtotal, vatAmount, grandTotal);
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quotation-${(title || 'summary').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setPdfGenerating(false);
    }
  };

  const handlePrintPDF = async (countryMeta, subtotal, vatAmount, grandTotal) => {
    setPdfGenerating(true);
    try {
      const doc = buildPDFDoc(countryMeta, subtotal, vatAmount, grandTotal);
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Print failed:', err);
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleShareEmail = (countryMeta, grandTotal) => {
    const customerObj = customerList.find((cu) => String(cu.id) === String(customerId));
    const customerName = customerObj?.customerNameEn || customerObj?.customerNameAr || '';
    const familyStatusText = familyStatus ? `Yes (${dependentsCount} children + wife)` : 'Single';
    const subject = encodeURIComponent(`Resource Quotation — ${title || 'Proposal'}`);
    const body = encodeURIComponent(
      `Dear ${customerName || 'Team'},\n\nPlease find the resource quotation summary below.\n\n` +
        `Position: ${title}\n` +
        `Nationality: ${nationality}\n` +
        `Family Status: ${familyStatusText}\n` +
        `Total Monthly: ${currency} ${fmtNumber(totalMonthly)}\n` +
        `Total Annual: ${currency} ${fmtNumber(totalAnnual)}\n` +
        `Grand Total (incl. ${countryMeta.taxLabel}): ${currency} ${fmtNumber(grandTotal)}\n\n` +
        `Best regards,\nIOTA Technologies\naccounts@iotatechnologies.ai`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleShareWhatsApp = async (countryMeta, subtotal, vatAmount, grandTotal) => {
    const fileName = `quotation-${(title || 'summary').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`;

    // ── Mobile: share the actual PDF file via Web Share API ──────────────
    if (typeof navigator !== 'undefined' && navigator.canShare) {
      setPdfGenerating(true);
      try {
        const doc = buildPDFDoc(countryMeta, subtotal, vatAmount, grandTotal);
        const blob = await pdf(doc).toBlob();
        const file = new File([blob], fileName, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Resource Quotation — ${title || 'Proposal'}`,
            text: 'Please find the attached resource quotation from IOTA Technologies.',
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
    const familyStatusText = familyStatus ? `Yes (${dependentsCount} children + wife)` : 'Single';
    const text = encodeURIComponent(
      `*Resource Quotation — ${title || 'Proposal'}*\n\n` +
        `📋 Position: *${employeeLabel}*\n` +
        `👨‍👩‍👧 Family: ${familyStatusText}\n` +
        `💰 Monthly: *${currency} ${fmtNumber(totalMonthly)}*\n` +
        `📅 Annual: *${currency} ${fmtNumber(totalAnnual)}*\n` +
        `✅ Grand Total (incl. ${countryMeta.taxLabel}): *${currency} ${fmtNumber(grandTotal)}*\n\n` +
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

              <FormControl fullWidth>
                <InputLabel>Customer</InputLabel>
                <Select
                  value={customerId}
                  label="Customer"
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <MenuItem value="">— None —</MenuItem>
                  {customerList.map((c) => (
                    <MenuItem key={c.id} value={String(c.id)}>
                      {c.customerNameEn || c.customerNameAr || String(c.id)}
                    </MenuItem>
                  ))}
                </Select>
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
                      helperText="Children only — wife is always +1"
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
                      helperText={`Total = SAR ${fmtNumber(insuranceCostPerPax * (dependentsCount + 1))} / yr  (${dependentsCount} children + 1 wife)`}
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
                    helperText={`Total = SAR ${fmtNumber(ticketCostPerPax * ticketPax)} / yr  (${ticketPaxDesc})`}
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
                  {title || 'Resource Calculation'}
                </Typography>
                {(nationality || customerId) && (
                  <Typography variant="caption" color="text.secondary">
                    {[
                      nationality,
                      (() => {
                        const c = customerList.find((cu) => String(cu.id) === String(customerId));
                        return c?.customerNameEn || c?.customerNameAr || customerId || null;
                      })(),
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
                          {fmtNumber(item.annual || item.monthly * 12)}
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
        const VAT_RATE = countryMeta.taxRate;
        const TAX_LABEL = countryMeta.taxLabel;
        const subtotal = totalAnnual;
        const vatAmount = subtotal * VAT_RATE;
        const grandTotal = subtotal + vatAmount;

        // Build description bullets from active line items
        const insuranceItems = activeItems.filter((i) => i.category === 'insurance');
        const hasEOS = activeItems.some(
          (i) => i.category === 'statutory' && i.label.toLowerCase().includes('end of service')
        );
        const hasStandardBenefits = activeItems.some(
          (i) =>
            (i.category === 'statutory' && !i.label.toLowerCase().includes('end of service')) ||
            i.category === 'service'
        );
        const hasTravel = activeItems.some(
          (i) => i.category === 'government' && i.label.toLowerCase().includes('ticket')
        );
        const otherGovtItems = activeItems.filter(
          (i) => i.category === 'government' && !i.label.toLowerCase().includes('ticket')
        );

        const customerObj = customerList.find((cu) => String(cu.id) === String(customerId));
        const customerName = customerObj?.customerNameEn || customerObj?.customerNameAr || '';

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
              <Box>
                <Typography variant="subtitle1" color="white" fontWeight={700} letterSpacing={0.5}>
                  Quotation Summary
                </Typography>
                {customerName && (
                  <Typography variant="caption" color="rgba(255,255,255,0.75)">
                    {customerName}
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
                </Menu>
              </Stack>
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
                        width: '52%',
                        borderBottom: 'none',
                        py: 1.5,
                      }}
                    >
                      Description
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
                  <TableRow>
                    <TableCell sx={{ verticalAlign: 'top', py: 2.5, borderBottom: 'none' }}>
                      <Typography variant="body2" fontWeight={600} gutterBottom>
                        {nationality ? `${nationality} Employee` : 'Employee'}
                      </Typography>
                      <Box component="ul" sx={{ pl: 2.5, mt: 0.5, mb: 0 }}>
                        {/* Family status bullet */}
                        {(() => {
                          const childLabel = dependentsCount !== 1 ? 'children' : 'child';
                          const familyDesc = familyStatus
                            ? `Family — ${dependentsCount} ${childLabel} + wife`
                            : 'Single';
                          return (
                            <Typography component="li" variant="body2" sx={{ mb: 0.3 }}>
                              {familyDesc}
                            </Typography>
                          );
                        })()}
                        {insuranceItems.map((item, i) => (
                          <Typography key={i} component="li" variant="body2" sx={{ mb: 0.3 }}>
                            {resolveLabel(item.label, insurancePremiumFactor, dependentsCount)}
                          </Typography>
                        ))}
                        {hasStandardBenefits && (
                          <Typography component="li" variant="body2" sx={{ mb: 0.3 }}>
                            Standard Employee Benefits
                          </Typography>
                        )}
                        {hasEOS && (
                          <Typography component="li" variant="body2" sx={{ mb: 0.3 }}>
                            End of Service Benefits
                          </Typography>
                        )}
                        {hasTravel && (
                          <Typography component="li" variant="body2" sx={{ mb: 0.3 }}>
                            Annual Travel Benefits
                          </Typography>
                        )}
                        {otherGovtItems.map((item, i) => (
                          <Typography key={i} component="li" variant="body2" sx={{ mb: 0.3 }}>
                            {resolveLabel(item.label, insurancePremiumFactor, dependentsCount)}
                          </Typography>
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ verticalAlign: 'middle', py: 2.5, borderBottom: 'none' }}
                    >
                      <Typography variant="body1" fontWeight={600}>
                        {currency} {fmtNumber(totalMonthly)}
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ verticalAlign: 'middle', py: 2.5, borderBottom: 'none' }}
                    >
                      <Typography variant="body1" fontWeight={600}>
                        {currency} {fmtNumber(totalAnnual)}
                      </Typography>
                    </TableCell>
                  </TableRow>
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
              </Typography>

              <Stack spacing={0.75} sx={{ minWidth: 300 }}>
                {[
                  { label: 'SUBTOTAL:', value: subtotal },
                  { label: `${TAX_LABEL} (${(VAT_RATE * 100).toFixed(0)}%):`, value: vatAmount },
                  { label: 'OTHERS:', value: 0 },
                ].map(({ label, value }) => (
                  <Stack key={label} direction="row" justifyContent="space-between" spacing={4}>
                    <Typography variant="body2" fontWeight={700} sx={{ letterSpacing: 0.3 }}>
                      {label}
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {currency} {fmtNumber(value)}
                    </Typography>
                  </Stack>
                ))}
                <Divider sx={{ my: 0.5 }} />
                <Stack direction="row" justifyContent="space-between" spacing={4}>
                  <Typography variant="body1" fontWeight={800} sx={{ letterSpacing: 0.3 }}>
                    TOTAL:
                  </Typography>
                  <Typography variant="body1" fontWeight={800} color="success.dark">
                    {currency} {fmtNumber(grandTotal)}
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
