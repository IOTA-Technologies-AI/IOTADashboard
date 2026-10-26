'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import ToggleButton from '@mui/material/ToggleButton';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { listCustomers } from 'src/actions/documents';
import {
  isAcceptedFile,
  DOCUMENT_ACCEPT,
  correctionsNote,
  typesForPractice,
  useDocumentCatalog,
  createManagedDocument,
} from 'src/actions/document-management';

import { Label } from 'src/components/label';
import { Upload } from 'src/components/upload';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { DocumentCheckPanel } from './document-check-panel';
import { CLASSIFICATION, CLASSIFICATION_ORDER } from './document-labels';

// ----------------------------------------------------------------------

const INTERNAL = { id: null, name: 'Internal (IOTA office)' };
const UNCHECKED = { ready: true, corrections: [], checking: false };

const titleFromFileName = (name) =>
  String(name || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Add a document prepared outside the dashboard: it is given an IOTA document
 * ID and the file is kept in OneDrive as version 1.
 */
export function DocumentNewDialog({ open, onClose }) {
  const router = useRouter();
  const {
    practices,
    types: allTypes,
    error: catalogError,
    loading: catalogLoading,
  } = useDocumentCatalog(open);
  const { data: customers = [] } = useSWR(
    open ? 'document-management/customers' : null,
    listCustomers,
    {
      revalidateOnFocus: false,
    }
  );

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [practice, setPractice] = useState(5);
  const [docType, setDocType] = useState('GEN');
  const [classification, setClassification] = useState('confidential');
  const [client, setClient] = useState(INTERNAL);
  const [subjectName, setSubjectName] = useState('');
  const [office, setOffice] = useState('KSA');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState(UNCHECKED);

  const reset = () => {
    setFile(null);
    setTitle('');
    setPractice(5);
    setDocType('GEN');
    setClassification('confidential');
    setClient(INTERNAL);
    setSubjectName('');
    setOffice('KSA');
    setNotes('');
    setError('');
    setCheck(UNCHECKED);
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const types = typesForPractice(allTypes, practice);

  const handleDrop = (accepted) => {
    const picked = accepted[0];
    if (!picked) return;
    if (!isAcceptedFile(picked)) {
      setError('Upload a PDF, Word, Excel, PowerPoint or image file.');
      return;
    }
    setError('');
    setFile(picked);
    if (!title.trim()) setTitle(titleFromFileName(picked.name));
  };

  const handleSubmit = async () => {
    if (!file || !title.trim()) return;
    setBusy(true);
    setError('');
    let rewritten = null;
    try {
      const document = await createManagedDocument(
        {
          title: title.trim(),
          practice,
          docType,
          classification,
          customerId: client?.id ?? null,
          subjectName: subjectName.trim() || undefined,
          iotaOffice: office,
          notes: notes.trim() || undefined,
        },
        file,
        ['Uploaded to Document Management', correctionsNote(check.corrections)]
          .filter(Boolean)
          .join('. '),
        {
          corrections: check.corrections,
          onRewritten: (result) => {
            rewritten = result;
          },
        }
      );
      toast.success(`Filed as ${document.display} — version 1 is in OneDrive.`);
      if (rewritten?.missed?.length) {
        toast.warning(
          `${rewritten.missed.length} correction(s) could not be placed in the file; check the document.`
        );
      }
      reset();
      onClose();
      router.push(paths.dashboard.general.documentManagement.details(document.documentId));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'The document could not be added.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Add document</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            For a document prepared outside the dashboard. It is given an IOTA document ID and kept
            in OneDrive as version 1; later revisions are uploaded as new versions.
          </Typography>

          <Upload
            value={file}
            onDrop={handleDrop}
            onDelete={() => setFile(null)}
            accept={DOCUMENT_ACCEPT}
            disabled={busy}
          />

          <AnimatePresence initial={false}>
            {file && (
              <m.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.43, 0.13, 0.23, 0.96] }}
                style={{ overflow: 'hidden' }}
              >
                <Stack spacing={2.5} sx={{ pt: 0.5 }}>
                  <TextField
                    label="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    disabled={busy}
                  />

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      select
                      fullWidth
                      label="Practice"
                      value={practices.length ? practice : ''}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        setPractice(next);
                        // Types belong to a practice: keep the choice only if the new one has it.
                        const nextTypes = typesForPractice(allTypes, next);
                        if (!nextTypes.some((t) => t.code === docType)) {
                          setDocType(nextTypes[0]?.code ?? '');
                        }
                      }}
                      disabled={busy}
                    >
                      {practices.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.id}. {p.name}
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      select
                      fullWidth
                      label="Document type"
                      value={types.some((t) => t.code === docType) ? docType : ''}
                      onChange={(e) => setDocType(e.target.value)}
                      disabled={busy || catalogLoading}
                      helperText={
                        catalogLoading
                          ? 'Loading…'
                          : !catalogError && !types.length
                            ? 'No active document types for this practice.'
                            : undefined
                      }
                    >
                      {types.map((t) => (
                        <MenuItem key={t.code} value={t.code}>
                          {t.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Autocomplete
                      fullWidth
                      value={client}
                      options={[INTERNAL, ...customers]}
                      getOptionLabel={(o) => o?.name ?? ''}
                      isOptionEqualToValue={(a, b) => a.id === b.id}
                      onChange={(e, value) => setClient(value ?? INTERNAL)}
                      disabled={busy}
                      renderInput={(params) => <TextField {...params} label="Client" />}
                    />

                    <TextField
                      select
                      fullWidth
                      label="Classification"
                      value={classification}
                      onChange={(e) => setClassification(e.target.value)}
                      disabled={busy}
                      SelectProps={{
                        renderValue: (value) => (
                          <Label
                            variant="soft"
                            color={CLASSIFICATION[value].color}
                            startIcon={<Iconify icon={CLASSIFICATION[value].icon} />}
                          >
                            {CLASSIFICATION[value].label}
                          </Label>
                        ),
                      }}
                    >
                      {CLASSIFICATION_ORDER.map((value) => (
                        <MenuItem key={value} value={value}>
                          <Stack>
                            <Typography variant="subtitle2">
                              {CLASSIFICATION[value].label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {CLASSIFICATION[value].help}
                            </Typography>
                          </Stack>
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>

                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems={{ sm: 'center' }}
                  >
                    <TextField
                      fullWidth
                      label="Person (optional)"
                      placeholder="The resource or employee it concerns"
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      disabled={busy}
                    />
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      value={office}
                      onChange={(e, value) => value && setOffice(value)}
                      disabled={busy}
                      sx={{ flexShrink: 0 }}
                    >
                      <ToggleButton value="KSA">KSA</ToggleButton>
                      <ToggleButton value="India">India</ToggleButton>
                    </ToggleButtonGroup>
                  </Stack>

                  <DocumentCheckPanel
                    file={file}
                    customerId={client?.id ?? null}
                    office={office}
                    disabled={busy}
                    onChange={setCheck}
                  />

                  <TextField
                    label="Notes"
                    placeholder="Who prepared it, where it came from, next steps…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    multiline
                    minRows={2}
                    disabled={busy}
                  />
                </Stack>
              </m.div>
            )}
          </AnimatePresence>

          {catalogError && (
            <Alert severity="error">
              Could not load the practices and document types:{' '}
              {catalogError.response?.data?.message || catalogError.message}
            </Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={busy}>
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          onClick={handleSubmit}
          loading={busy}
          disabled={!file || !title.trim() || !docType || !check.ready}
        >
          {check.checking ? 'Checking…' : 'Add document'}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
