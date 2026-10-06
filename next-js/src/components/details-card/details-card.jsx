import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

/**
 * A read-only block of labelled values, for details pages.
 *
 * `fields` is a list of `{ label, value, href? }`. A missing value prints as
 * an em dash rather than dropping the row, so the reader can see what is not
 * on file. A field with `href` renders as a link (used for stored documents).
 */
export function DetailsCard({ title, fields, columns = 2, sx }) {
  return (
    <Card sx={{ p: 3, ...sx }}>
      {title ? (
        <Typography variant="h6" sx={{ mb: 3 }}>
          {title}
        </Typography>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          rowGap: 2.5,
          columnGap: 3,
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: `repeat(${columns}, 1fr)` },
        }}
      >
        {fields.map((field) => (
          <Box key={field.label}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              {field.label}
            </Typography>
            {field.href ? (
              <Link href={field.href} target="_blank" rel="noopener" variant="body2">
                {field.value || 'Open'}
              </Link>
            ) : (
              <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                {field.value === null || field.value === undefined || field.value === ''
                  ? '—'
                  : field.value}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Card>
  );
}
