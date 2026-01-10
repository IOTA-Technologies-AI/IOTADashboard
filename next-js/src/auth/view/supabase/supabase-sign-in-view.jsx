'use client';

import { useEffect, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/global-config';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { supabase } from 'src/lib/supabase';

import { Iconify } from 'src/components/iconify';

import { getErrorMessage } from '../../utils';
import { FormHead } from '../../components/form-head';

// ----------------------------------------------------------------------

export function SupabaseSignInView() {
  const [errorMessage, setErrorMessage] = useState(null);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef(null);

  const highlightTiles = [
    {
      title: 'Enterprise SSO',
      body: 'Use your company-issued Microsoft identity with the same MFA and conditional access rules your org already enforces.',
      icon: 'mdi:shield-check',
    },
    {
      title: 'Fast handoff',
      body: 'Jump straight into the dashboard with your workspace preselected and recent files pinned for you.',
      icon: 'mdi:lightning-bolt',
    },
    {
      title: 'Built-in audit',
      body: 'Sessions, device hints, and sign-in history are logged so your compliance team has a single place to review.',
      icon: 'mdi:clipboard-list-outline',
    },
  ];

  const handleMicrosoftSignIn = async () => {
    setErrorMessage(null);
    setOauthLoading(true);
    try {
      const redirectTo = `https://dashboard.iotatechnologies.io/auth/v1/callback?next=${encodeURIComponent(paths.dashboard.root)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo,
          scopes: 'openid profile email offline_access User.Read User.ReadBasic.All',
          flowType: 'pkce',
        },
      });
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setOauthLoading(false);
    }
  };

  const scrollToIndex = (index, behavior = 'auto') => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const firstSlide = container.firstElementChild;
    const slideWidth = firstSlide?.getBoundingClientRect()?.width || container.clientWidth;
    container.scrollTo({ left: index * slideWidth, behavior });
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const nextIndex = (prev + 1) % highlightTiles.length;
        scrollToIndex(nextIndex, 'auto');
        return nextIndex;
      });
    }, 3800);

    return () => clearInterval(timer);
  }, [highlightTiles.length]);

  const handleWheelScroll = (event) => {
    if (!carouselRef.current) return;
    // Translate vertical scroll gestures (trackpad/mouse) into horizontal scrolling.
    event.preventDefault();
    carouselRef.current.scrollLeft += event.deltaY;
  };

  return (
    <Box sx={{ position: 'relative', isolation: 'isolate' }}>
      <Box
        sx={{
          position: 'absolute',
          inset: { xs: -48, md: -64 },
          zIndex: 0,
          opacity: 0.9,
          filter: 'blur(48px)',
          background:
            'radial-gradient(circle at 18% 12%, rgba(0,171,85,0.24), transparent 32%), radial-gradient(circle at 82% 8%, rgba(0,123,255,0.18), transparent 28%)',
        }}
      />

      <Card
        sx={{
          position: 'relative',
          zIndex: 1,
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          border: (theme) => `1px solid ${theme.vars.palette.divider}`,
          boxShadow: '0 24px 80px rgba(15, 23, 42, 0.18)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <Stack spacing={3.5}>
          <Stack spacing={1.5}>
            <Box sx={{ width: 80, ml: -1 }}>
              <Box
                component="img"
                src={`${CONFIG.assetsDir || ''}/logo/iotaLogo.png`}
                alt="IOTA logo"
                sx={{ width: 1, height: 'auto' }}
              />
            </Box>

            <FormHead
              title="Sign in with your organization"
              description={
                <>
                  {`Use your IOTA account to continue. `}
                  <Link
                    component={RouterLink}
                    href={paths.auth.supabase.signUp}
                    variant="subtitle2"
                  >
                    Need access?
                  </Link>
                </>
              }
              sx={{ textAlign: { xs: 'left', md: 'left' } }}
            />
          </Stack>

          {!!errorMessage && <Alert severity="error">{errorMessage}</Alert>}

          <Button
            fullWidth
            size="large"
            variant="contained"
            color="primary"
            onClick={handleMicrosoftSignIn}
            loading={oauthLoading}
            loadingIndicator="Redirecting to Microsoft..."
            startIcon={<Iconify icon="logos:microsoft-icon" width={20} />}
          >
            Sign in with Microsoft
          </Button>

          <Stack spacing={1} sx={{ pl: 0.5 }}>
            {[
              'Keep your existing MFA and conditional access policies intact.',
              'We respect device trust and session lifetime rules set by your admin.',
              'Instant handoff back to your dashboard after authentication.',
            ].map((item) => (
              <Stack key={item} direction="row" spacing={1} alignItems="center">
                <Iconify icon="mdi:check-decagram" width={18} sx={{ color: 'success.main' }} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {item}
                </Typography>
              </Stack>
            ))}
          </Stack>

          <Divider flexItem />

          <Stack spacing={1.5}>
            <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 0.6 }}>
              Workspace at a glance
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Swipe or scroll to view each benefit.
            </Typography>

            <Box sx={{ position: 'relative' }}>
              <Stack
                direction="row"
                spacing={0}
                sx={{
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  scrollSnapType: 'none',
                  scrollBehavior: 'smooth',
                  px: 0,
                  mx: 0,
                  '&::-webkit-scrollbar': { display: 'none' },
                  scrollbarWidth: 'none',
                  touchAction: 'pan-x',
                }}
                ref={carouselRef}
                onWheel={handleWheelScroll}
                onScroll={(event) => {
                  const container = event.currentTarget;
                  const firstSlide = container.firstElementChild;
                  const width = firstSlide?.getBoundingClientRect()?.width || container.clientWidth;
                  const index = Math.round(container.scrollLeft / width);
                  setActiveIndex(Math.min(Math.max(index, 0), highlightTiles.length - 1));
                }}
              >
                {highlightTiles.map((tile) => (
                  <Box
                    key={tile.title}
                    sx={{
                      minWidth: '100%',
                      maxWidth: '100%',
                      flexShrink: 0,
                      p: 3,
                      borderRadius: 2,
                      bgcolor: 'background.neutral',
                      border: (theme) => `1px solid ${theme.vars.palette.divider}`,
                    }}
                  >
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Iconify icon={tile.icon} width={20} sx={{ color: 'primary.main' }} />
                        <Typography variant="subtitle2">{tile.title}</Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {tile.body}
                      </Typography>
                    </Stack>
                  </Box>
                ))}
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mt: 1.5, justifyContent: 'center' }}>
                {highlightTiles.map((_, idx) => (
                  <Box
                    key={_.title}
                    onClick={() => {
                      setActiveIndex(idx);
                      scrollToIndex(idx, 'smooth');
                    }}
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      bgcolor: idx === activeIndex ? 'primary.main' : 'divider',
                      boxShadow:
                        idx === activeIndex ? '0 0 0 4px rgba(25, 118, 210, 0.12)' : 'none',
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </Stack>
      </Card>
    </Box>
  );
}
