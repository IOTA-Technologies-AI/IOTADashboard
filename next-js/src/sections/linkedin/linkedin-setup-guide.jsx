'use client';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { linkedInRedirectUri } from 'src/actions/linkedin';

// ----------------------------------------------------------------------

const PROD_ORIGIN = 'https://dashboard.iotatechnologies.io';

const Code = ({ children }) => (
  <Box
    component="code"
    sx={{
      px: 0.75,
      py: 0.25,
      borderRadius: 0.75,
      typography: 'body2',
      fontFamily: 'monospace',
      bgcolor: 'background.neutral',
      wordBreak: 'break-all',
    }}
  >
    {children}
  </Box>
);

/** What has to exist on LinkedIn's side before the page can be connected. */
export function LinkedInSetupGuide({ status }) {
  const callbackPath = status?.callbackPath || '/dashboard/integration/linkedin/callback';
  const here = linkedInRedirectUri(callbackPath);
  const prod = `${PROD_ORIGIN}${callbackPath}`;

  const steps = [
    <>
      A <strong>super admin of the IOTA company page</strong> signs in at{' '}
      <Link href="https://www.linkedin.com/developers/apps/new" target="_blank" rel="noopener">
        linkedin.com/developers
      </Link>{' '}
      and creates an app: name it e.g. &quot;IOTA Dashboard&quot;, choose the IOTA company page as
      its LinkedIn Page, add the IOTA logo and the privacy policy URL.
    </>,
    <>
      On the app&apos;s <strong>Settings</strong> tab, verify the app with the company page
      (LinkedIn sends a link that a page admin must approve).
    </>,
    <>
      On the <strong>Products</strong> tab, request <strong>Community Management API</strong> and
      fill in the access form (IOTA&apos;s legal name, registered address, website, business email,
      use case: &quot;internal analytics of our own company page&quot;). LinkedIn requires this
      product to be the only one on the app. It starts on the Development tier.
    </>,
    <>
      On the <strong>Auth</strong> tab, under <em>Authorized redirect URLs</em>, add{' '}
      <Code>{prod}</Code>
      {here && here !== prod ? (
        <>
          {' '}
          and, for this environment, <Code>{here}</Code>
        </>
      ) : null}
      . Check that the scopes listed there include{' '}
      {(status?.scopes || ['r_organization_admin', 'r_organization_social']).map((s, i) => (
        <span key={s}>
          {i ? ' and ' : ''}
          <Code>{s}</Code>
        </span>
      ))}
      .
    </>,
    <>
      Copy the <strong>Client ID</strong> and <strong>Primary Client Secret</strong> from the Auth
      tab and give them to whoever manages the API, who sets them as the Encore secrets{' '}
      <Code>LINKEDIN_CLIENT_ID</Code> and <Code>LINKEDIN_CLIENT_SECRET</Code> and redeploys. Never
      paste the secret into chat, email or a ticket.
    </>,
    <>
      Back here, an IOTA admin presses <strong>Connect LinkedIn</strong> and signs in with a
      LinkedIn account that is an <strong>administrator</strong> of the IOTA page.
    </>,
    <>
      Once it works on the Development tier, apply for the <strong>Standard tier</strong> from the
      Products tab. LinkedIn may ask for a screen recording of this page and the sign-in.
    </>,
  ];

  return (
    <Stack spacing={1.5}>
      <Box component="ol" sx={{ pl: 2.5, m: 0, '& li': { mb: 1.25 }, typography: 'body2' }}>
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary">
        Access is read-only: page details, analytics and posts. Nothing is posted to LinkedIn.
        Without LinkedIn&apos;s token renewal (offered to approved apps only), the sign-in lasts 60
        days and has to be reconnected before then.
      </Typography>
    </Stack>
  );
}
