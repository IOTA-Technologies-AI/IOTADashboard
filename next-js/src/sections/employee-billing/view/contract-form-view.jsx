'use client';

import { z } from 'zod';
import useSWR from 'swr';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { getCustomers, uploadDocument, listResourceCalculations } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  getContract,
  createContract,
  updateContract,
  getRateCardTemplate,
} from 'src/actions/employee-billing';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { CONTACT_ROLES, PORTAL_SYSTEMS, SUBMISSION_CHANNELS } from '../utils/stages';

// ----------------------------------------------------------------------

const OFFICES = [
  { value: 'KSA', label: 'IOTA Saudi Arabia (SAR, VAT 15%)', currency: 'SAR' },
  { value: 'UAE', label: 'IOTA UAE (AED, VAT 5%)', currency: 'AED' },
  { value: 'India', label: 'IOTA India (INR, GST 18%)', currency: 'INR' },
  { value: 'UK', label: 'IOTA UK (GBP, VAT 20%)', currency: 'GBP' },
];

const ContractSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  contractType: z.enum(['single', 'managed_services']),
  customer: z.custom((v) => !!v?.id, { message: 'Customer is required' }),
  // Customer-side contacts. Optional: a customer that takes invoices only
  // through its own portal may have none.
  customerContacts: z
    .array(
      z
        .object({
          id: z.string(),
          name: z.string().optional(),
          email: z.string().email('Invalid email').optional().or(z.literal('')),
          title: z.string().optional(),
          role: z.enum(['approver', 'delegate', 'finance', 'cc']),
          // 'email' = send invoices to this person, 'dnd' = Do Not Disturb
          notify: z.enum(['email', 'dnd']),
          delegateFor: z.string().optional(),
          delegateUntil: z.string().optional(),
        })
        .refine((c) => !!(c.name?.trim() || c.email?.trim()), {
          message: 'Enter a name or an email',
          path: ['name'],
        })
        .refine((c) => c.notify === 'dnd' || c.role === 'finance' || !!c.email?.trim(), {
          message: 'An email is needed to send invoices to this person',
          path: ['email'],
        })
    )
    .optional(),
  submissionChannel: z.enum(['email', 'portal', 'manual']),
  portalSystem: z.string().optional(),
  portalUrl: z.string().optional(),
  portalAccountRef: z.string().optional(),
  iotaOffice: z.string().min(1),
  vatRate: z.coerce.number().min(0).max(100),
  poNumber: z.string().optional(),
  proposal: z.custom().nullable().optional(),
  sowNumber: z.string().optional(),
  requisitionNumber: z.string().optional(),
  sowReceivedDate: z.string().optional(),
  sowSignedDate: z.string().optional(),
  sowDocumentUrl: z.string().optional(),
  sowDocumentName: z.string().optional(),
  termMonths: z.coerce.number().int().min(1).max(60),
  renewalDate: z.string().optional(),
  paymentTermsDays: z.coerce.number().int().min(0).max(365),
  billingDay: z.coerce.number().int().min(1).max(28),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  status: z.enum([
    'draft',
    'proposal_sent',
    'customer_approved',
    'sow_received',
    'signed',
    'active',
    'renewal_due',
    'suspended',
    'ended',
  ]),
  notes: z.string().optional(),
});

const newContact = (role = 'approver') => ({
  id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  name: '',
  email: '',
  title: '',
  role,
  notify: 'email',
  delegateFor: '',
  delegateUntil: '',
});

/** Contacts as the form holds them; contracts saved before the list existed are read from the single fields. */
function contactsFromContract(c) {
  const toForm = (k) => ({
    id: String(k.id || newContact().id),
    name: k.name || '',
    email: k.email || '',
    title: k.title || '',
    role: k.role || 'approver',
    notify: k.notify === false ? 'dnd' : 'email',
    delegateFor: k.delegateFor || '',
    delegateUntil: k.delegateUntil ? String(k.delegateUntil).slice(0, 10) : '',
  });
  if (Array.isArray(c.customerContacts) && c.customerContacts.length) {
    return c.customerContacts.map(toForm);
  }
  const legacy = [];
  if (c.customerContactName || c.customerContactEmail) {
    legacy.push(
      toForm({
        id: 'c1',
        name: c.customerContactName,
        email: c.customerContactEmail,
        role: 'approver',
      })
    );
  }
  if (c.financeContactName || c.financeContactEmail) {
    legacy.push(
      toForm({
        id: 'f1',
        name: c.financeContactName,
        email: c.financeContactEmail,
        role: 'finance',
      })
    );
  }
  String(c.customerContactCc || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
    .forEach((email, i) => legacy.push(toForm({ id: `cc${i + 1}`, email, role: 'cc' })));
  return legacy;
}

const customerLabel = (c) =>
  c?.customerNameEn || c?.customernameen || c?.name || (c?.id ? `Customer ${c.id}` : '');

// ----------------------------------------------------------------------

export function ContractFormView({ id }) {
  const router = useRouter();
  const isEdit = !!id;

  const { data: existing, isLoading: loadingContract } = useSWR(
    id ? `employee-billing/contracts/${id}` : null,
    () => getContract(id)
  );
  const { data: customers = [] } = useSWR('customers/all', () => getCustomers(), {
    revalidateOnFocus: false,
  });

  const customerOptions = useMemo(
    () => (customers || []).map((c) => ({ id: c.id, name: customerLabel(c), raw: c })),
    [customers]
  );

  // Approved proposals (resource calculations) this contract can be won from
  const { data: proposals } = useSWR(
    'resource-calculations/all',
    () => listResourceCalculations(),
    {
      revalidateOnFocus: false,
    }
  );
  const proposalOptions = useMemo(() => {
    const list =
      proposals?.data || proposals?.calculations || (Array.isArray(proposals) ? proposals : []);
    return list
      .filter((rc) => rc?.id)
      .map((rc) => ({
        id: rc.id,
        label: `${rc.id} · ${rc.title || rc.fullName || 'Untitled'}${rc.status ? ` (${rc.status})` : ''}`,
        status: rc.status,
        totalMonthly: rc.totalMonthly,
      }));
  }, [proposals]);

  const [uploadingSow, setUploadingSow] = useState(false);

  const defaultValues = useMemo(
    () => ({
      title: '',
      contractType: 'single',
      customer: null,
      customerContacts: [],
      submissionChannel: 'email',
      portalSystem: '',
      portalUrl: '',
      portalAccountRef: '',
      iotaOffice: 'KSA',
      vatRate: 15,
      poNumber: '',
      proposal: null,
      sowNumber: '',
      requisitionNumber: '',
      sowReceivedDate: '',
      sowSignedDate: '',
      sowDocumentUrl: '',
      sowDocumentName: '',
      termMonths: 12,
      renewalDate: '',
      paymentTermsDays: 30,
      billingDay: 1,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      status: 'draft',
      notes: '',
    }),
    []
  );

  const methods = useForm({ resolver: zodResolver(ContractSchema), defaultValues });
  const {
    reset,
    watch,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const contactFields = useFieldArray({ control: methods.control, name: 'customerContacts' });
  const watchedContacts = watch('customerContacts') || [];
  const submissionChannel = watch('submissionChannel');
  const approverOptions = watchedContacts.filter((c) => c.role === 'approver');

  useEffect(() => {
    const c = existing?.contract;
    if (!c) return;
    reset({
      title: c.title || '',
      contractType: c.contractType || 'single',
      customer: customerOptions.find((o) => String(o.id) === String(c.customerId)) || {
        id: c.customerId,
        name: c.customerName,
      },
      customerContacts: contactsFromContract(c),
      submissionChannel: c.submissionChannel || 'email',
      portalSystem: c.portalSystem || '',
      portalUrl: c.portalUrl || '',
      portalAccountRef: c.portalAccountRef || '',
      iotaOffice: c.iotaOffice || 'KSA',
      vatRate: Number(c.vatRate ?? 15),
      poNumber: c.poNumber || '',
      proposal:
        proposalOptions.find((o) => String(o.id) === String(c.resourceCalculationId)) || null,
      sowNumber: c.sowNumber || '',
      requisitionNumber: c.requisitionNumber || '',
      sowReceivedDate: c.sowReceivedDate ? String(c.sowReceivedDate).slice(0, 10) : '',
      sowSignedDate: c.sowSignedDate ? String(c.sowSignedDate).slice(0, 10) : '',
      sowDocumentUrl: c.sowDocumentUrl || '',
      sowDocumentName: c.sowDocumentName || '',
      termMonths: Number(c.termMonths ?? 12),
      renewalDate: c.renewalDate ? String(c.renewalDate).slice(0, 10) : '',
      paymentTermsDays: Number(c.paymentTermsDays ?? 30),
      billingDay: Number(c.billingDay ?? 1),
      startDate: c.startDate ? String(c.startDate).slice(0, 10) : '',
      endDate: c.endDate ? String(c.endDate).slice(0, 10) : '',
      status: c.status || 'draft',
      notes: c.notes || '',
    });
  }, [existing, customerOptions, proposalOptions, reset]);

  const iotaOffice = watch('iotaOffice');
  useEffect(() => {
    // Pull the live VAT rate for the office; the seeded fallback is applied by the backend.
    if (!iotaOffice) return;
    getRateCardTemplate(iotaOffice)
      .then((t) => {
        if (t?.vatRate != null && !isEdit) setValue('vatRate', Number(t.vatRate));
      })
      .catch(() => {});
  }, [iotaOffice, isEdit, setValue]);

  const sowDocumentUrl = watch('sowDocumentUrl');
  const sowDocumentName = watch('sowDocumentName');

  const handleSowUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadingSow(true);
    try {
      const fileBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await uploadDocument({
        fileBase64,
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        folder: 'sow',
      });
      setValue('sowDocumentUrl', res.url, { shouldDirty: true });
      setValue('sowDocumentName', file.name, { shouldDirty: true });
      toast.success('Signed SOW uploaded — save the contract to keep it');
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Upload failed');
    } finally {
      setUploadingSow(false);
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    const office = OFFICES.find((o) => o.value === data.iotaOffice) || OFFICES[0];
    const contacts = (data.customerContacts || []).map((c) => ({
      id: c.id,
      name: (c.name || '').trim(),
      email: (c.email || '').trim().toLowerCase() || undefined,
      title: (c.title || '').trim() || undefined,
      role: c.role,
      notify: c.notify !== 'dnd',
      ...(c.role === 'delegate' && c.delegateFor ? { delegateFor: c.delegateFor } : {}),
      ...(c.role === 'delegate' && c.delegateUntil ? { delegateUntil: c.delegateUntil } : {}),
    }));
    const approvers = contacts.filter((c) => c.role === 'approver' || c.role === 'delegate');
    const primary = approvers.find((c) => c.notify && c.email) || approvers[0];
    const finance = contacts.find((c) => c.role === 'finance');
    const payload = {
      title: data.title,
      contractType: data.contractType,
      customerId: String(data.customer.id),
      customerName: data.customer.name,
      customerContacts: contacts,
      // The single-contact fields older screens read: first approver who can
      // be emailed, first finance contact, and the cc list.
      customerContactName: primary?.name || undefined,
      customerContactEmail: primary?.email || undefined,
      customerContactCc:
        contacts
          .filter((c) => c.role === 'cc' && c.notify && c.email)
          .map((c) => c.email)
          .join(', ') || undefined,
      financeContactName: finance?.name || undefined,
      financeContactEmail: finance?.email || undefined,
      submissionChannel: data.submissionChannel,
      portalSystem: data.submissionChannel === 'portal' ? data.portalSystem || 'other' : undefined,
      portalUrl: data.submissionChannel === 'portal' ? data.portalUrl || undefined : undefined,
      portalAccountRef:
        data.submissionChannel === 'portal' ? data.portalAccountRef || undefined : undefined,
      iotaOffice: data.iotaOffice,
      currencyCode: office.currency,
      vatRate: data.vatRate,
      poNumber: data.poNumber || undefined,
      resourceCalculationId: data.proposal?.id ? String(data.proposal.id) : undefined,
      sowNumber: data.sowNumber || undefined,
      requisitionNumber: data.requisitionNumber || undefined,
      sowReceivedDate: data.sowReceivedDate || undefined,
      sowSignedDate: data.sowSignedDate || undefined,
      sowDocumentUrl: data.sowDocumentUrl || undefined,
      sowDocumentName: data.sowDocumentName || undefined,
      termMonths: data.termMonths,
      renewalDate: data.renewalDate || undefined,
      paymentTermsDays: data.paymentTermsDays,
      billingDay: data.billingDay,
      startDate: data.startDate,
      endDate: data.endDate || undefined,
      status: data.status,
      notes: data.notes || undefined,
    };
    try {
      const saved = isEdit ? await updateContract(id, payload) : await createContract(payload);
      toast.success(
        isEdit ? 'Contract updated' : `Contract ${saved.contractNumber} created — now add employees`
      );
      router.push(paths.dashboard.hr.employeeBilling.contracts.details(saved.id));
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Save failed');
    }
  });

  if (isEdit && loadingContract) {
    return (
      <DashboardContent>
        <Stack alignItems="center" sx={{ py: 8 }}>
          <CircularProgress />
        </Stack>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={
          isEdit
            ? `Edit ${existing?.contract?.contractNumber || 'contract'}`
            : 'New Billing Contract'
        }
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Employee Billing', href: paths.dashboard.hr.employeeBilling.root },
          { name: 'Contracts', href: paths.dashboard.hr.employeeBilling.contracts.root },
          { name: isEdit ? 'Edit' : 'New' },
        ]}
        sx={{ mb: 3 }}
      />

      <Form methods={methods} onSubmit={onSubmit}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" mb={2}>
                Contract
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <Field.Text
                    name="title"
                    label="Title *"
                    placeholder="e.g. Riyad Bank — Core Banking team"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Field.Select name="contractType" label="Contract type *">
                    <MenuItem value="single">Single employee contract</MenuItem>
                    <MenuItem value="managed_services">
                      Managed services (several employees, one invoice)
                    </MenuItem>
                  </Field.Select>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Field.Select name="status" label="Status *">
                    <MenuItem value="draft">Draft — being prepared</MenuItem>
                    <MenuItem value="proposal_sent">Proposal sent to customer</MenuItem>
                    <MenuItem value="customer_approved">Customer approved the proposal</MenuItem>
                    <MenuItem value="sow_received">SOW received (requisition number)</MenuItem>
                    <MenuItem value="signed">SOW signed and returned — onboarding</MenuItem>
                    <MenuItem value="active">Active — billed monthly</MenuItem>
                    <MenuItem value="renewal_due">Renewal due — still billed</MenuItem>
                    <MenuItem value="suspended">Suspended</MenuItem>
                    <MenuItem value="ended">Ended</MenuItem>
                  </Field.Select>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Field.Autocomplete
                    name="customer"
                    label="Customer (bank / organisation) *"
                    options={customerOptions}
                    getOptionLabel={(o) => o?.name || ''}
                    isOptionEqualToValue={(a, b) => String(a?.id) === String(b?.id)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Field.Text
                    name="startDate"
                    label="Start date *"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Field.Text
                    name="endDate"
                    label="End date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Field.Text name="notes" label="Notes" multiline rows={2} />
                </Grid>
              </Grid>
            </Card>

            <Card sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" mb={0.5}>
                Proposal, SOW & renewal
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Proposal sent → customer approves → SOW with requisition number → IOTA signs and
                returns it → onboarding → billing. The requisition number prints on every invoice.
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <Field.Autocomplete
                    name="proposal"
                    label="Approved proposal (resource calculation)"
                    options={proposalOptions}
                    getOptionLabel={(o) => o?.label || ''}
                    isOptionEqualToValue={(a, b) => String(a?.id) === String(b?.id)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Field.Text name="sowNumber" label="SOW number" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Field.Text name="requisitionNumber" label="Requisition / PO number from SOW" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Field.Text
                    name="sowReceivedDate"
                    label="SOW received on"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Field.Text
                    name="sowSignedDate"
                    label="Signed & returned on"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Field.Select name="termMonths" label="Contract term">
                    <MenuItem value={6}>6 months</MenuItem>
                    <MenuItem value={12}>12 months</MenuItem>
                    <MenuItem value={24}>24 months</MenuItem>
                  </Field.Select>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Field.Text
                    name="renewalDate"
                    label="Renewal due on"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                    <LoadingButton component="label" variant="outlined" loading={uploadingSow}>
                      {sowDocumentUrl ? 'Replace signed SOW' : 'Upload signed SOW'}
                      <input
                        type="file"
                        hidden
                        accept=".pdf,.doc,.docx"
                        onChange={handleSowUpload}
                      />
                    </LoadingButton>
                    {sowDocumentUrl ? (
                      <Typography variant="body2">
                        <a href={sowDocumentUrl} target="_blank" rel="noreferrer">
                          {sowDocumentName || 'Signed SOW'}
                        </a>
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No signed SOW attached yet.
                      </Typography>
                    )}
                  </Stack>
                </Grid>
              </Grid>
            </Card>

            <Card sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" mb={0.5}>
                Invoice submission & customer contacts
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                How each invoice reaches the customer, and who on their side approves it. Contacts
                are optional when the customer takes invoices only through its own system.
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12, sm: submissionChannel === 'portal' ? 6 : 12 }}>
                  <Field.Select name="submissionChannel" label="Submission channel *">
                    {Object.entries(SUBMISSION_CHANNELS).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </Field.Select>
                </Grid>
                {submissionChannel === 'portal' && (
                  <>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Field.Select name="portalSystem" label="Customer system">
                        {Object.entries(PORTAL_SYSTEMS).map(([value, label]) => (
                          <MenuItem key={value} value={value}>
                            {label}
                          </MenuItem>
                        ))}
                      </Field.Select>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Field.Text name="portalUrl" label="Portal address" placeholder="https://" />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Field.Text
                        name="portalAccountRef"
                        label="IOTA supplier / vendor number there"
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Alert severity="info">
                        Invoices on this contract are not emailed. After internal approval you
                        download the PDF, submit it on the customer&apos;s system and record the
                        reference it returns.
                      </Alert>
                    </Grid>
                  </>
                )}
              </Grid>

              <Stack spacing={2}>
                {contactFields.fields.map((item, index) => {
                  const contact = watchedContacts[index] || {};
                  const isDelegate = contact.role === 'delegate';
                  return (
                    <Card key={item.id} variant="outlined" sx={{ p: 2 }}>
                      <Grid container spacing={2} alignItems="flex-start">
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <Field.Text name={`customerContacts.${index}.name`} label="Name" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <Field.Text
                            name={`customerContacts.${index}.email`}
                            label="Email"
                            type="email"
                          />
                        </Grid>
                        <Grid size={{ xs: 10, sm: 3 }}>
                          <Field.Text
                            name={`customerContacts.${index}.title`}
                            label="Title / department"
                          />
                        </Grid>
                        <Grid size={{ xs: 2, sm: 1 }} sx={{ textAlign: 'right' }}>
                          <IconButton color="error" onClick={() => contactFields.remove(index)}>
                            <Iconify icon="eva:trash-2-outline" />
                          </IconButton>
                        </Grid>
                        <Grid size={{ xs: 12, sm: isDelegate ? 4 : 6 }}>
                          <Field.Select name={`customerContacts.${index}.role`} label="Role">
                            {Object.entries(CONTACT_ROLES).map(([value, label]) => (
                              <MenuItem key={value} value={value}>
                                {label}
                              </MenuItem>
                            ))}
                          </Field.Select>
                        </Grid>
                        <Grid size={{ xs: 12, sm: isDelegate ? 3 : 6 }}>
                          <Field.Select
                            name={`customerContacts.${index}.notify`}
                            label="Invoice emails"
                          >
                            <MenuItem value="email">Send email</MenuItem>
                            <MenuItem value="dnd">Do not disturb</MenuItem>
                          </Field.Select>
                        </Grid>
                        {isDelegate && (
                          <>
                            <Grid size={{ xs: 12, sm: 3 }}>
                              <Field.Select
                                name={`customerContacts.${index}.delegateFor`}
                                label="Acts for"
                              >
                                <MenuItem value="">
                                  <em>Any approver</em>
                                </MenuItem>
                                {approverOptions.map((a) => (
                                  <MenuItem key={a.id} value={a.id}>
                                    {a.name || a.email || 'Unnamed approver'}
                                  </MenuItem>
                                ))}
                              </Field.Select>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 2 }}>
                              <Field.Text
                                name={`customerContacts.${index}.delegateUntil`}
                                label="Until"
                                type="date"
                                InputLabelProps={{ shrink: true }}
                              />
                            </Grid>
                          </>
                        )}
                      </Grid>
                    </Card>
                  );
                })}

                {contactFields.fields.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No contacts yet.
                    {submissionChannel === 'email' &&
                      ' Add at least one approver, or each invoice will need a recipient typed in when it is sent.'}
                  </Typography>
                )}

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button
                    size="small"
                    startIcon={<Iconify icon="eva:plus-fill" />}
                    onClick={() => contactFields.append(newContact('approver'))}
                  >
                    Add approver
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Iconify icon="eva:plus-fill" />}
                    onClick={() => contactFields.append(newContact('delegate'))}
                  >
                    Add delegate
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Iconify icon="eva:plus-fill" />}
                    onClick={() => contactFields.append(newContact('finance'))}
                  >
                    Add finance contact
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Iconify icon="eva:plus-fill" />}
                    onClick={() => contactFields.append(newContact('cc'))}
                  >
                    Add cc
                  </Button>
                </Stack>
              </Stack>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" mb={2}>
                Billing terms
              </Typography>
              <Stack spacing={2}>
                <Field.Select name="iotaOffice" label="Issuing IOTA office *">
                  {OFFICES.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Field.Select>
                <Field.Text name="vatRate" label="VAT / GST rate %" type="number" />
                <Field.Text name="poNumber" label="Customer PO number" />
                <Field.Text name="paymentTermsDays" label="Payment terms (days)" type="number" />
                <Field.Text
                  name="billingDay"
                  label="Invoice day of month"
                  type="number"
                  helperText="1–28. Invoices are dated this day of the billed month."
                />
              </Stack>
            </Card>

            {!isEdit && (
              <Alert severity="info" sx={{ mb: 3 }}>
                After saving you will add the employee(s) and their rate cards on the contract page.
                Set the status to <strong>Active</strong> once the lines are ready to be billed.
              </Alert>
            )}

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => router.back()}>
                Cancel
              </Button>
              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                {isEdit ? 'Save changes' : 'Create contract'}
              </LoadingButton>
            </Stack>
          </Grid>
        </Grid>
      </Form>
    </DashboardContent>
  );
}
