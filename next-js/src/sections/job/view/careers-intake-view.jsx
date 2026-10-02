'use client';

import useSWR from 'swr';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { IOTA_API_HOST } from 'src/lib/iota-api';
import { DashboardContent } from 'src/layouts/dashboard';
import { getCareersIntake, updateCareersIntake, registerCareersWebhook } from 'src/actions/jobs';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

function StatusTile({ label, ok, text }) {
  return (
    <Card variant="outlined" sx={{ p: 2, flex: '1 1 200px' }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
        <Label variant="soft" color={ok ? 'success' : 'warning'}>
          {ok ? 'Ready' : 'Not set'}
        </Label>
        <Typography variant="subtitle2">{label}</Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {text}
      </Typography>
    </Card>
  );
}

function Snippet({ children }) {
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 2,
        borderRadius: 1,
        bgcolor: 'background.neutral',
        fontSize: 12,
        overflowX: 'auto',
        whiteSpace: 'pre',
      }}
    >
      {children}
    </Box>
  );
}

// ----------------------------------------------------------------------

export function CareersIntakeView() {
  const { data: status, isLoading, mutate } = useSWR('careers/intake', getCareersIntake);

  const [publicApiUrl, setPublicApiUrl] = useState(IOTA_API_HOST);
  const [formName, setFormName] = useState('');
  const [signingSecret, setSigningSecret] = useState('');
  const [turnstile, setTurnstile] = useState({ siteKey: '', secretKey: '' });
  const [scanner, setScanner] = useState({ provider: 'none', endpoint: '', apiKey: '' });
  const [limits, setLimits] = useState({ maxResumeMb: 8, perIpPerHour: 10, perEmailPerDay: 3 });
  const [saving, setSaving] = useState('');

  useEffect(() => {
    if (!status) return;
    setFormName(status.webhook?.formName || '');
    setTurnstile((prev) => ({ ...prev, siteKey: status.turnstile?.siteKey || '' }));
    setScanner((prev) => ({
      ...prev,
      provider: status.scanner?.provider || 'none',
      endpoint: status.scanner?.endpoint || '',
    }));
    if (status.limits) {
      setLimits({
        maxResumeMb: Math.round((status.limits.maxResumeBytes || 8 * 1024 * 1024) / 1024 / 1024),
        perIpPerHour: status.limits.perIpPerHour ?? 10,
        perEmailPerDay: status.limits.perEmailPerDay ?? 3,
      });
    }
  }, [status]);

  const run = async (key, fn, okMessage) => {
    setSaving(key);
    try {
      await fn();
      toast.success(okMessage);
      mutate();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed');
    } finally {
      setSaving('');
    }
  };

  if (isLoading || !status) {
    return (
      <DashboardContent>
        <Stack alignItems="center" sx={{ py: 8 }}>
          <CircularProgress />
        </Stack>
      </DashboardContent>
    );
  }

  const webhookUrl = status.webhook?.targetUrl;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Careers Intake"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Job', href: paths.dashboard.job.root },
          { name: 'Careers Intake' },
        ]}
        sx={{ mb: 3 }}
      />

      <Stack direction="row" flexWrap="wrap" sx={{ gap: 2, mb: 3 }}>
        <StatusTile
          label="Webflow form webhook"
          ok={status.webhook?.registered}
          text={
            status.webhook?.registered
              ? `Registered ${status.webhook.registeredAt ? new Date(status.webhook.registeredAt).toLocaleDateString('en-GB') : ''}${status.webhook.formName ? ` for form “${status.webhook.formName}”` : ''}`
              : 'Applications from the careers page are not flowing in yet.'
          }
        />
        <StatusTile
          label="Webhook signature"
          ok={status.webhook?.hasSigningSecret}
          text={
            status.webhook?.hasSigningSecret
              ? 'Every call is checked against Webflow’s signature and a 5-minute window.'
              : 'Protected by the secret URL only. Paste Webflow’s signing secret below when you have it.'
          }
        />
        <StatusTile
          label="Bot protection"
          ok={status.turnstile?.configured}
          text={
            status.turnstile?.configured
              ? 'Cloudflare Turnstile is verified on direct API submissions.'
              : 'Direct API submissions rely on throttling and the honeypot only.'
          }
        />
        <StatusTile
          label="Résumé virus scan"
          ok={status.scanner?.configured}
          text={
            status.scanner?.configured
              ? `Files are scanned with ${status.scanner.provider}.`
              : 'Files pass the built-in checks only and are marked “not virus-scanned”.'
          }
        />
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" mb={0.5}>
              1. Webflow form webhook
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Creates a form-submission webhook on the Webflow site, using the access token already
              saved under Integrations. The address contains a long random secret that only Webflow
              knows; registering again replaces the previous one.
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Public address of this API"
                value={publicApiUrl}
                onChange={(e) => setPublicApiUrl(e.target.value)}
                helperText="Webflow must be able to reach it. https only."
              />
              <TextField
                label="Form name (optional)"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                helperText="Only submissions of this Webflow form become applications. Leave blank to accept any form on the site."
              />
              <LoadingButton
                variant="contained"
                loading={saving === 'register'}
                onClick={() =>
                  run(
                    'register',
                    () => registerCareersWebhook({ publicApiUrl, formName: formName || undefined }),
                    'Webhook registered on the Webflow site'
                  )
                }
              >
                {status.webhook?.registered ? 'Re-register webhook' : 'Register webhook'}
              </LoadingButton>
              {webhookUrl && (
                <Alert severity="success" icon={false}>
                  <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                    Webflow posts to: {webhookUrl.replace(/\/[^/]+$/, '/…')}
                  </Typography>
                </Alert>
              )}
              <TextField
                label="Webflow signing secret (optional)"
                type="password"
                value={signingSecret}
                onChange={(e) => setSigningSecret(e.target.value)}
                helperText="If Webflow shows a signing secret for this webhook, paste it here and every call is HMAC-verified as well."
              />
              <LoadingButton
                variant="outlined"
                loading={saving === 'secret'}
                disabled={!signingSecret}
                onClick={() =>
                  run(
                    'secret',
                    () => updateCareersIntake({ webhookSigningSecret: signingSecret }),
                    'Signing secret saved'
                  ).then(() => setSigningSecret(''))
                }
              >
                Save signing secret
              </LoadingButton>
            </Stack>
          </Card>

          <Card sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" mb={0.5}>
              2. Bot protection for the careers API
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Only needed if the website posts to the API directly (a custom form) instead of
              through the Webflow webhook. Create a Cloudflare Turnstile widget for
              iotatechnologies.ai and enter its keys.
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Turnstile site key"
                value={turnstile.siteKey}
                onChange={(e) => setTurnstile({ ...turnstile, siteKey: e.target.value })}
              />
              <TextField
                label="Turnstile secret key"
                type="password"
                value={turnstile.secretKey}
                onChange={(e) => setTurnstile({ ...turnstile, secretKey: e.target.value })}
                helperText={
                  status.turnstile?.configured
                    ? 'A secret is saved. Enter a new one to replace it.'
                    : ''
                }
              />
              <LoadingButton
                variant="outlined"
                loading={saving === 'turnstile'}
                onClick={() =>
                  run(
                    'turnstile',
                    () =>
                      updateCareersIntake({
                        turnstile: {
                          siteKey: turnstile.siteKey || undefined,
                          secretKey: turnstile.secretKey || undefined,
                        },
                      }),
                    'Turnstile keys saved'
                  ).then(() => setTurnstile((t) => ({ ...t, secretKey: '' })))
                }
              >
                Save Turnstile keys
              </LoadingButton>
            </Stack>
          </Card>

          <Card sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" mb={0.5}>
              3. Résumé virus scanning
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Every résumé is already checked for type, size, macros, embedded objects, remote
              templates and PDF scripting, and refused if any is found. An antivirus engine is what
              lets a file be called clean. ClamAV is a service you run yourself (the candidate’s
              file stays with IOTA); VirusTotal sends the file to a third party.
            </Typography>
            <Stack spacing={2}>
              <TextField
                select
                label="Engine"
                value={scanner.provider}
                onChange={(e) => setScanner({ ...scanner, provider: e.target.value })}
              >
                <MenuItem value="none">None — built-in checks only</MenuItem>
                <MenuItem value="clamav">ClamAV REST service (self-hosted)</MenuItem>
                <MenuItem value="virustotal">VirusTotal API</MenuItem>
              </TextField>
              {scanner.provider === 'clamav' && (
                <TextField
                  label="ClamAV scan endpoint"
                  placeholder="https://clamav.internal.iotatechnologies.io/scan"
                  value={scanner.endpoint}
                  onChange={(e) => setScanner({ ...scanner, endpoint: e.target.value })}
                />
              )}
              {scanner.provider === 'virustotal' && (
                <TextField
                  label="VirusTotal API key"
                  type="password"
                  value={scanner.apiKey}
                  onChange={(e) => setScanner({ ...scanner, apiKey: e.target.value })}
                />
              )}
              <LoadingButton
                variant="outlined"
                loading={saving === 'scanner'}
                onClick={() =>
                  run(
                    'scanner',
                    () =>
                      updateCareersIntake({
                        scanner: {
                          provider: scanner.provider,
                          endpoint: scanner.endpoint || undefined,
                          apiKey: scanner.apiKey || undefined,
                        },
                      }),
                    'Scanner settings saved'
                  ).then(() => setScanner((s) => ({ ...s, apiKey: '' })))
                }
              >
                Save scanner settings
              </LoadingButton>
            </Stack>
          </Card>

          <Card sx={{ p: 3 }}>
            <Typography variant="h6" mb={2}>
              4. Limits
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Max résumé size (MB)"
                type="number"
                value={limits.maxResumeMb}
                onChange={(e) => setLimits({ ...limits, maxResumeMb: Number(e.target.value) })}
                inputProps={{ min: 1, max: 25 }}
              />
              <TextField
                label="Applications per address per hour"
                type="number"
                value={limits.perIpPerHour}
                onChange={(e) => setLimits({ ...limits, perIpPerHour: Number(e.target.value) })}
                inputProps={{ min: 1 }}
              />
              <TextField
                label="Applications per email per day"
                type="number"
                value={limits.perEmailPerDay}
                onChange={(e) => setLimits({ ...limits, perEmailPerDay: Number(e.target.value) })}
                inputProps={{ min: 1 }}
              />
            </Stack>
            <LoadingButton
              sx={{ mt: 2 }}
              variant="outlined"
              loading={saving === 'limits'}
              onClick={() =>
                run(
                  'limits',
                  () =>
                    updateCareersIntake({
                      limits: {
                        maxResumeBytes: Math.max(1, limits.maxResumeMb) * 1024 * 1024,
                        perIpPerHour: Math.max(1, limits.perIpPerHour),
                        perEmailPerDay: Math.max(1, limits.perEmailPerDay),
                      },
                    }),
                  'Limits saved'
                )
              }
            >
              Save limits
            </LoadingButton>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" mb={1}>
              Setting up the careers page
            </Typography>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              <strong>Recommended: the native Webflow form.</strong> Keep the Webflow form on each
              job page, add a File Upload field for the résumé (needs a Webflow Business or Premium
              site plan, 10 MB per file), and add a hidden field so the submission can be matched to
              a job. Register the webhook above and you are done; Webflow also runs its own spam
              protection on the form.
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Hidden field on the CMS job page, bound to the CMS item (any one of these names):
            </Typography>
            <Snippet>{`<input type="hidden" name="jobSlug" value="{{wf {&quot;path&quot;:&quot;slug&quot;} }}">
<!-- or name="jobId" / "webflowItemId" / "jobTitle" -->`}</Snippet>
            <Typography variant="body2" sx={{ mt: 1.5 }}>
              Field names are matched loosely: Name, Email, Phone, LinkedIn, Portfolio, Cover Letter
              / Message, Resume / CV. Anything else is kept with the application.
            </Typography>
          </Card>

          <Card sx={{ p: 3 }}>
            <Typography variant="h6" mb={1}>
              Alternative: a custom form posting to the API
            </Typography>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              Use this only if the Webflow form cannot do what you need. Add the Turnstile widget to
              the page, then post the fields and the résumé as base64. Keep the hidden “website”
              field empty — it is a trap for bots.
            </Typography>
            <Snippet>{`<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<div class="cf-turnstile" data-sitekey="${status.turnstile?.siteKey || 'YOUR_SITE_KEY'}"></div>
<input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off">

<script>
async function apply(jobId, form, file) {
  const toBase64 = (f) => new Promise((ok, no) => {
    const r = new FileReader(); r.onload = () => ok(r.result.split(',')[1]);
    r.onerror = no; r.readAsDataURL(f);
  });
  const res = await fetch('${publicApiUrl}/jobs/' + jobId + '/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      candidateName: form.name.value,
      candidateEmail: form.email.value,
      candidatePhone: form.phone.value,
      candidateLinkedIn: form.linkedin.value,
      coverLetter: form.message.value,
      website: form.website.value,
      turnstileToken: form['cf-turnstile-response'].value,
      resumeFileName: file && file.name,
      resumeBase64: file ? await toBase64(file) : undefined,
    }),
  });
  return res.json(); // { success, message }
}
</script>`}</Snippet>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              PDF and Word (.docx) only, up to {limits.maxResumeMb} MB. The API answers with a plain
              message you can show the candidate.
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
