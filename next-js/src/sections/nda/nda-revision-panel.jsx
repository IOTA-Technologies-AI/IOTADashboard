'use client';

import { useRef, useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { createNdaUploadSession, fetchNdaDocumentContent } from 'src/utils/apiHelper';

import { receiveNdaRevision, compareNdaRevision } from 'src/actions/nda-review';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const RAISED_STATUS = {
  resolved: { label: 'Resolved', color: 'success' },
  partially_resolved: { label: 'Partly resolved', color: 'warning' },
  not_resolved: { label: 'Not resolved', color: 'error' },
};

const RISK = {
  high: { label: 'High risk', color: 'error' },
  medium: { label: 'Medium risk', color: 'warning' },
  low: { label: 'Low risk', color: 'info' },
  none: { label: 'No risk', color: 'default' },
};

const CHANGE_TYPE = { added: 'Added', modified: 'Changed', removed: 'Removed' };

const message = (err, fallback) => err?.response?.data?.message || err?.message || fallback;
const fmt = (v) =>
  v
    ? new Date(v).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

function Quote({ text, tone }) {
  if (!text) return null;
  return (
    <Box
      sx={(theme) => ({
        mt: 0.75,
        px: 1.5,
        py: 1,
        borderRadius: 1,
        typography: 'body2',
        whiteSpace: 'pre-wrap',
        borderLeft: `3px solid ${theme.vars.palette[tone].main}`,
        bgcolor: varAlpha(theme.vars.palette[tone].mainChannel, 0.08),
        ...(tone === 'error' ? { textDecoration: 'line-through', color: 'text.secondary' } : {}),
      })}
    >
      {text}
    </Box>
  );
}

function Stat({ label, value, tone }) {
  return (
    <Box
      sx={(theme) => ({
        flex: '1 1 120px',
        px: 2,
        py: 1.5,
        borderRadius: 1.5,
        border: `1px solid ${theme.vars.palette.divider}`,
        bgcolor: value ? varAlpha(theme.vars.palette[tone].mainChannel, 0.06) : 'transparent',
      })}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" sx={{ color: value ? `${tone}.main` : 'text.disabled' }}>
        {value}
      </Typography>
    </Box>
  );
}

function downloadBase64({ base64, fileName, contentType }) {
  const a = document.createElement('a');
  a.href = `data:${contentType || 'application/octet-stream'};base64,${base64}`;
  a.download = fileName;
  a.click();
}

// ----------------------------------------------------------------------

/**
 * A partner's revised NDA as the next version of this one (ndas/ndaRevisions.ts
 * in the API): the upload dialog, the comparison with the previous version —
 * which raised risks were dealt with, and every clause the partner added,
 * removed or reworded — and the version history.
 *
 * Props:
 *  - nda
 *  - dialogOpen, onDialogClose : the "revised version" upload dialog
 *  - onUpdated(nda)            : the NDA after a revision / comparison
 */
export function NdaRevisionPanel({ nda, dialogOpen, onDialogClose, onUpdated }) {
  const versions = Array.isArray(nda?.documentVersions) ? nda.documentVersions : [];
  const latest = versions[versions.length - 1];
  const comparison = latest?.comparison || null;
  const currentVersion = versions.length + 1;

  const [tab, setTab] = useState('raised');
  const [riskyOnly, setRiskyOnly] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const handleCompare = async () => {
    setComparing(true);
    try {
      const res = await compareNdaRevision(nda.id);
      onUpdated(res.nda);
      toast.success('Comparison updated.');
    } catch (err) {
      toast.error(message(err, 'The comparison could not run.'));
    } finally {
      setComparing(false);
    }
  };

  const handleDownload = async (version) => {
    setDownloading(version ?? 'current');
    try {
      downloadBase64(await fetchNdaDocumentContent(nda.id, version));
    } catch (err) {
      toast.error(message(err, 'The document could not be downloaded.'));
    } finally {
      setDownloading(null);
    }
  };

  const changes = (comparison?.changes || []).filter(
    (c) => !riskyOnly || c.risk === 'high' || c.risk === 'medium'
  );
  const raisedByIndex = new Map((comparison?.raised || []).map((r) => [r.index, r]));

  return (
    <>
      {latest ? (
        <Card sx={{ p: 3, mb: 3 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography variant="h6">
                Partner revision — version {currentVersion} against version {latest.version}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {latest.fileName} → {nda.uploadedDocumentName}
                {comparison ? ` · compared ${fmt(comparison.comparedAt)}` : ''}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <LoadingButton
                size="small"
                variant="outlined"
                color="inherit"
                loading={comparing}
                onClick={handleCompare}
                startIcon={<Iconify icon="solar:restart-bold" />}
              >
                Compare again
              </LoadingButton>
            </Stack>
          </Stack>

          {comparing && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary">
                Reading both versions and checking each raised risk — this takes a minute or two.
              </Typography>
            </Box>
          )}

          {!comparison ? (
            <Alert severity="warning">
              The revised document is saved, but it has not been compared with version{' '}
              {latest.version} yet. Use &ldquo;Compare again&rdquo;.
            </Alert>
          ) : (
            <>
              {comparison.summary && (
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {comparison.summary}
                </Typography>
              )}
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.5} sx={{ mb: 2 }}>
                <Stat
                  label="Raised risks resolved"
                  value={comparison.counts.resolved}
                  tone="success"
                />
                <Stat
                  label="Partly resolved"
                  value={comparison.counts.partiallyResolved}
                  tone="warning"
                />
                <Stat label="Not resolved" value={comparison.counts.notResolved} tone="error" />
                <Stat
                  label="New risks from changes"
                  value={comparison.counts.newRisks}
                  tone="error"
                />
              </Stack>
              {comparison.truncated && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  One of the documents is very long; only the first part of each was compared.
                </Alert>
              )}

              <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
                <Tab value="raised" label={`Risks IOTA raised (${comparison.raised.length})`} />
                <Tab
                  value="changes"
                  label={
                    comparison.previousWasTemplate
                      ? 'Changes'
                      : `Changes in this version (${comparison.changes.length})`
                  }
                />
                <Tab value="versions" label={`Versions (${currentVersion})`} />
              </Tabs>

              {tab === 'raised' && (
                <Stack spacing={2}>
                  {comparison.raised.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      The previous version had no risks raised against it.
                    </Typography>
                  )}
                  {comparison.raised.map((r) => {
                    const st = RAISED_STATUS[r.status] || RAISED_STATUS.not_resolved;
                    return (
                      <Box
                        key={r.index}
                        sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1.5 }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Chip size="small" variant="soft" color={st.color} label={st.label} />
                          <Chip
                            size="small"
                            variant="outlined"
                            color={RISK[r.severity]?.color}
                            label={RISK[r.severity]?.label}
                          />
                          <Typography variant="subtitle2">{r.clause}</Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {r.issue}
                        </Typography>
                        {r.recommendation && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            IOTA asked for: {r.recommendation}
                          </Typography>
                        )}
                        {r.revisedExcerpt ? (
                          <>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                              sx={{ mt: 1 }}
                            >
                              Revised version — {r.revisedClause}
                            </Typography>
                            <Quote text={r.revisedExcerpt} tone={st.color} />
                          </>
                        ) : null}
                        {r.note && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {r.note}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              )}

              {tab === 'changes' && (
                <Stack spacing={2}>
                  {comparison.previousWasTemplate ? (
                    <Typography variant="body2" color="text.secondary">
                      The previous version was IOTA&apos;s own template, so the partner&apos;s
                      document is checked in full by the review above rather than clause by clause
                      here.
                    </Typography>
                  ) : (
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={riskyOnly}
                          onChange={(e) => setRiskyOnly(e.target.checked)}
                        />
                      }
                      label={
                        <Typography variant="body2">Only changes that put IOTA at risk</Typography>
                      }
                    />
                  )}
                  {!comparison.previousWasTemplate && changes.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      {riskyOnly ? 'No risky changes.' : 'No material changes found.'}
                    </Typography>
                  )}
                  {changes.map((c, i) => {
                    const related =
                      c.relatedRaisedIndex !== null
                        ? raisedByIndex.get(c.relatedRaisedIndex)
                        : null;
                    const unrequested = !related && (c.risk === 'high' || c.risk === 'medium');
                    return (
                      <Box
                        key={i}
                        sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1.5 }}
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          flexWrap="wrap"
                          useFlexGap
                        >
                          <Chip
                            size="small"
                            variant="outlined"
                            label={CHANGE_TYPE[c.type] || 'Changed'}
                          />
                          <Chip
                            size="small"
                            variant="soft"
                            color={RISK[c.risk]?.color}
                            label={RISK[c.risk]?.label}
                          />
                          {related ? (
                            <Chip
                              size="small"
                              variant="soft"
                              color="info"
                              label={`Answers: ${related.clause}`}
                            />
                          ) : null}
                          {unrequested ? (
                            <Chip
                              size="small"
                              variant="soft"
                              color="error"
                              label="Not requested by IOTA"
                            />
                          ) : null}
                          <Typography variant="subtitle2">{c.clause}</Typography>
                        </Stack>
                        <Quote text={c.previousExcerpt} tone="error" />
                        <Quote text={c.revisedExcerpt} tone="success" />
                        {c.issue && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {c.issue}
                          </Typography>
                        )}
                        {c.recommendation && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Ask for: {c.recommendation}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </>
          )}

          {(tab === 'versions' || !comparison) && (
            <Stack spacing={1} sx={{ mt: comparison ? 0 : 2 }}>
              {[...versions].reverse().map((v) => (
                <Stack
                  key={v.version}
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1.5 }}
                >
                  <Chip size="small" label={`v${v.version}`} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {v.fileName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Replaced {fmt(v.supersededAt)} by {v.supersededBy}
                      {v.reviewResult
                        ? ` · reviewed: ${v.reviewResult.riskLevel} risk, ${v.reviewResult.findings?.length || 0} finding(s)`
                        : ''}
                    </Typography>
                  </Box>
                  {v.documentSource === 'external_upload' && (
                    <LoadingButton
                      size="small"
                      color="inherit"
                      loading={downloading === v.version}
                      onClick={() => handleDownload(v.version)}
                      startIcon={<Iconify icon="solar:download-bold" />}
                    >
                      Download
                    </LoadingButton>
                  )}
                </Stack>
              ))}
              {tab === 'versions' && (
                <Typography variant="caption" color="text.secondary">
                  Version {currentVersion} ({nda.uploadedDocumentName}) is the current document.
                </Typography>
              )}
            </Stack>
          )}
        </Card>
      ) : null}

      <RevisionDialog
        nda={nda}
        open={!!dialogOpen}
        onClose={onDialogClose}
        nextVersion={currentVersion + 1}
        onDone={onUpdated}
      />
    </>
  );
}

// ----------------------------------------------------------------------

function RevisionDialog({ nda, open, onClose, nextVersion, onDone }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [stage, setStage] = useState('');

  const raised = (nda?.reviewResult?.findings || []).filter((f) => f.severity !== 'low').length;
  const busy = !!stage;

  const close = () => {
    if (busy) return;
    setFile(null);
    onClose?.();
  };

  const pick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx'].includes(ext)) {
      toast.error('Upload the revised NDA as a PDF or Word (.docx) file so it can be compared.');
      return;
    }
    setFile(f);
  };

  const submit = async () => {
    try {
      setStage('Uploading the revised document…');
      const ext = file.name.split('.').pop()?.toLowerCase();
      const contentType =
        file.type || (ext === 'pdf' ? 'application/pdf' : 'application/octet-stream');
      const { uploadUrl } = await createNdaUploadSession(
        nda.id,
        file.name,
        contentType,
        nextVersion
      );
      const put = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'Content-Range': `bytes 0-${file.size - 1}/${file.size}`,
          'Content-Length': String(file.size),
        },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status}).`);
      const uploaded = await put.json();

      setStage('Comparing with the previous version and checking each raised risk…');
      const res = await receiveNdaRevision(nda.id, {
        fileName: file.name,
        onedriveFileId: uploaded.id,
        onedriveWebUrl: uploaded.webUrl,
      });
      onDone?.(res.nda);
      if (res.comparisonError) {
        toast.warning(
          `Saved as version ${nextVersion}, but the comparison did not run (${res.comparisonError}). Use "Compare again".`
        );
      } else {
        const c = res.comparison.counts;
        toast.success(
          `Version ${nextVersion}: ${c.resolved} risk(s) resolved, ${c.notResolved} not resolved, ${c.newRisks} new.`
        );
      }
      setFile(null);
      setStage('');
      onClose?.();
    } catch (err) {
      setStage('');
      toast.error(message(err, 'The revised document could not be added.'));
    }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle>Partner sent a revised NDA</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            The revised document becomes version {nextVersion} of {nda?.ndaNumber}. The current
            version and its review are kept. IOTA&apos;s AI then compares the two:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5, typography: 'body2', color: 'text.secondary' }}>
            <li>
              whether each of the {raised} risk{raised === 1 ? '' : 's'} IOTA raised is resolved;
            </li>
            <li>every clause the partner added, removed or reworded, and its risk to IOTA;</li>
            <li>and reviews the revised document against the IOTA standard.</li>
          </Box>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            style={{ display: 'none' }}
            onChange={pick}
          />
          {file ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Iconify
                icon="solar:file-check-bold-duotone"
                width={22}
                sx={{ color: 'success.main' }}
              />
              <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                {file.name}
              </Typography>
              {!busy && (
                <Button size="small" color="inherit" onClick={() => setFile(null)}>
                  Change
                </Button>
              )}
            </Stack>
          ) : (
            <Button
              variant="outlined"
              onClick={() => inputRef.current?.click()}
              startIcon={<Iconify icon="solar:file-text-bold" />}
            >
              Choose the revised document (PDF or Word)
            </Button>
          )}

          {busy && (
            <Box>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary">
                {stage} This can take a minute or two.
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={close} disabled={busy}>
          Cancel
        </Button>
        <LoadingButton variant="contained" loading={busy} disabled={!file} onClick={submit}>
          Add as version {nextVersion} &amp; compare
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
