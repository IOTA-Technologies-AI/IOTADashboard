import { useRef } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Fab from '@mui/material/Fab';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import InputBase from '@mui/material/InputBase';
import CardHeader from '@mui/material/CardHeader';

import { Iconify } from 'src/components/iconify';

import { ProfilePostItem } from './profile-post-item';

// ----------------------------------------------------------------------

export function ProfileHome({ info, posts, sx, ...other }) {
  const fileRef = useRef(null);

  const handleAttach = () => {
    if (fileRef.current) {
      fileRef.current.click();
    }
  };

  const renderSummary = () => (
    <Card sx={{ py: 3, textAlign: 'center' }}>
      <Stack
        divider={<Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed' }} />}
        sx={{ flexDirection: 'row', typography: 'h6' }}
      >
        <Stack sx={{ width: 1 }}>
          {info.role || 'Role unavailable'}
          <Box component="span" sx={{ color: 'text.secondary', typography: 'body2' }}>
            Role
          </Box>
        </Stack>

        <Stack sx={{ width: 1 }}>
          {info.managerName || 'Manager unavailable'}
          <Box component="span" sx={{ color: 'text.secondary', typography: 'body2' }}>
            Manager
          </Box>
        </Stack>
      </Stack>
    </Card>
  );

  const renderAbout = () => (
    <Card>
      <CardHeader title="About" />

      <Box
        sx={{
          p: 3,
          gap: 2,
          display: 'flex',
          typography: 'body2',
          flexDirection: 'column',
        }}
      >
        <div>{info.quote}</div>

        <Box sx={{ gap: 2, display: 'flex', lineHeight: '24px' }}>
          <Iconify width={24} icon="mingcute:location-fill" />
          <span>
            Location
            <Link variant="subtitle2" color="inherit">
              &nbsp;{info.location || 'Not provided'}
            </Link>
          </span>
        </Box>

        <Box sx={{ gap: 2, display: 'flex', lineHeight: '24px' }}>
          <Iconify width={24} icon="solar:letter-bold" />
          {info.email}
        </Box>

        <Box sx={{ gap: 2, display: 'flex', lineHeight: '24px' }}>
          <Iconify width={24} icon="solar:case-minimalistic-bold" />
          <span>{info.department ? `Department: ${info.department}` : 'Department not set'}</span>
        </Box>

        <Box sx={{ gap: 2, display: 'flex', lineHeight: '24px' }}>
          <Iconify width={24} icon="solar:user-bold" />
          <span>
            {info.managerTitle ? `${info.managerName} • ${info.managerTitle}` : info.managerName}
          </span>
        </Box>

        {info.officeLocation && (
          <Box sx={{ gap: 2, display: 'flex', lineHeight: '24px' }}>
            <Iconify width={24} icon="solar:building-2-bold" />
            <span>Office: {info.officeLocation}</span>
          </Box>
        )}
      </Box>
    </Card>
  );

  const renderPostInput = () => (
    <Card sx={{ p: 3 }}>
      <InputBase
        multiline
        fullWidth
        rows={4}
        placeholder="Share what you are thinking here..."
        inputProps={{ id: 'post-input' }}
        sx={[
          (theme) => ({
            p: 2,
            mb: 3,
            borderRadius: 1,
            border: `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.2)}`,
          }),
        ]}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ gap: 1, display: 'flex', alignItems: 'center' }}>
          <Fab size="small" color="inherit" variant="softExtended" onClick={handleAttach}>
            <Iconify icon="solar:gallery-wide-bold" width={24} sx={{ color: 'success.main' }} />
            Image/Video
          </Fab>
          <Fab size="small" color="inherit" variant="softExtended">
            <Iconify icon="solar:videocamera-record-bold" width={24} sx={{ color: 'error.main' }} />
            Streaming
          </Fab>
        </Box>

        <Button variant="contained">Post</Button>
      </Box>

      <input ref={fileRef} type="file" style={{ display: 'none' }} />
    </Card>
  );

  const renderSocials = () => (
    <Card>
      <CardHeader title="Contact" />

      <Box sx={{ p: 3, gap: 2, display: 'flex', flexDirection: 'column', typography: 'body2' }}>
        {info.phone && (
          <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
            <Iconify icon="solar:phone-bold" />
            <Link color="inherit">{info.phone}</Link>
          </Box>
        )}

        {info.userPrincipalName && (
          <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
            <Iconify icon="solar:letter-bold" />
            <Link color="inherit">{info.userPrincipalName}</Link>
          </Box>
        )}

        {info.managerEmail && (
          <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
            <Iconify icon="solar:envelope-bold" />
            <Link color="inherit">{info.managerEmail}</Link>
          </Box>
        )}
      </Box>
    </Card>
  );

  return (
    <Grid container spacing={3} sx={sx} {...other}>
      <Grid size={{ xs: 12, md: 4 }} sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
        {renderSummary()}
        {renderAbout()}
        {renderSocials()}
      </Grid>

      <Grid size={{ xs: 12, md: 8 }} sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
        {renderPostInput()}

        {posts.map((post) => (
          <ProfilePostItem key={post.id} post={post} />
        ))}
      </Grid>
    </Grid>
  );
}
