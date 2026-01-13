'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Slider from '@mui/material/Slider';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';

import { RippleLoader } from 'src/components/loader-new';

// ----------------------------------------------------------------------

export default function LoaderDemoPage() {
  const [size, setSize] = useState(250);
  const [darkBg, setDarkBg] = useState(true);

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Typography variant="h3" sx={{ mb: 5 }}>
        New Loader Demo
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        This is a preview of the new ripple loader with the IOTA logo. Adjust the settings below to
        see how it looks in different configurations.
      </Typography>

      {/* Controls */}
      <Stack spacing={3} sx={{ mb: 5, maxWidth: 400 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Size: {size}px
          </Typography>
          <Slider
            value={size}
            onChange={(e, newValue) => setSize(newValue)}
            min={100}
            max={400}
            step={10}
          />
        </Box>

        <FormControlLabel
          control={<Switch checked={darkBg} onChange={(e) => setDarkBg(e.target.checked)} />}
          label="Dark background"
        />
      </Stack>

      {/* Loader Preview */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 500,
          borderRadius: 2,
          bgcolor: darkBg ? 'grey.900' : 'grey.100',
          border: '1px solid',
          borderColor: 'divider',
          transition: 'background-color 0.3s ease',
        }}
      >
        <RippleLoader size={size} />
      </Box>

      {/* Fullscreen Preview */}
      <Typography variant="h5" sx={{ mt: 6, mb: 3 }}>
        Fullscreen Preview (Splash Screen Style)
      </Typography>

      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 600,
          borderRadius: 2,
          bgcolor: darkBg ? 'grey.900' : 'grey.50',
          border: '1px solid',
          borderColor: 'divider',
          transition: 'background-color 0.3s ease',
          overflow: 'hidden',
        }}
      >
        <RippleLoader size={300} />
      </Box>

      {/* Small Loader Examples */}
      <Typography variant="h5" sx={{ mt: 6, mb: 3 }}>
        Size Variations
      </Typography>

      <Stack
        direction="row"
        spacing={4}
        alignItems="center"
        justifyContent="center"
        flexWrap="wrap"
      >
        {[80, 120, 180, 250].map((loaderSize) => (
          <Box
            key={loaderSize}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: loaderSize + 100,
                height: loaderSize + 100,
                borderRadius: 2,
                bgcolor: 'grey.900',
              }}
            >
              <RippleLoader size={loaderSize} />
            </Box>
            <Typography variant="caption" color="text.secondary">
              {loaderSize}px
            </Typography>
          </Box>
        ))}
      </Stack>
    </Container>
  );
}
