'use client';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';

import { textOfVersion } from 'src/actions/consents';

// ----------------------------------------------------------------------

function Fact({ label, children }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" component="div">
        {children}
      </Typography>
    </Box>
  );
}

/** Where the wording a person saw lives, when it is not one of IOTA's own forms. */
function wordingElsewhere(record) {
  if (record.kind === 'leads')
    return 'Shown on the website form (Webflow); the version is the privacy notice.';
  if (record.method === 'webflow_form')
    return 'The website careers form, which has no consent checkbox.';
  if (record.status === 'missing') return 'None — this arrived before consent was recorded.';
  return null;
}

/**
 * Everything recorded about one consent, shown when its row is opened: the
 * exact words agreed to, the notice, where it was given, and any withdrawal.
 */
export function ConsentRecordDetail({ record, wording }) {
  const text = record.textVersion ? textOfVersion(wording, record.textVersion) : null;
  const elsewhere = text ? null : wordingElsewhere(record);

  return (
    <Box sx={{ px: 3, py: 2.5, bgcolor: 'background.neutral' }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            What they agreed to
          </Typography>
          {text ? (
            <>
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                “{text.text}”
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {text.title} · wording {record.textVersion}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {elsewhere || `Wording ${record.textVersion || '—'}`}
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          }}
        >
          <Fact label="Given">{record.capturedAt ? fDateTime(record.capturedAt) : '—'}</Fact>
          <Fact label="Privacy notice">
            {record.noticeVersion ? (
              wording?.notice?.url ? (
                <Link href={wording.notice.url} target="_blank" rel="noopener">
                  {record.noticeVersion}
                </Link>
              ) : (
                record.noticeVersion
              )
            ) : (
              '—'
            )}
          </Fact>
          <Fact label="Where">
            {record.sourceUrl ? (
              <Link
                href={record.sourceUrl}
                target="_blank"
                rel="noopener"
                sx={{ wordBreak: 'break-all' }}
              >
                {record.sourceUrl}
              </Link>
            ) : (
              record.source || '—'
            )}
          </Fact>
          <Fact label="Record">
            {record.kind} #{String(record.subjectId).slice(0, 8)}
          </Fact>
        </Box>

        {record.notes?.length ? (
          <Fact label="Notes">
            {record.notes.map((n) => (
              <div key={n}>{n}</div>
            ))}
          </Fact>
        ) : null}

        {record.withdrawnAt ? (
          <Box sx={{ pl: 1.5, borderLeft: 3, borderColor: 'error.main' }}>
            <Fact label="Withdrawn">
              {fDateTime(record.withdrawnAt)}
              {record.withdrawnBy ? ` — ${record.withdrawnBy}` : ''}
            </Fact>
            {record.withdrawalNote ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {record.withdrawalNote}
              </Typography>
            ) : null}
          </Box>
        ) : null}
      </Stack>
    </Box>
  );
}
