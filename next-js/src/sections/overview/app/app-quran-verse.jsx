'use client';

import { useState, useEffect } from 'react';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { apiHelper } from 'src/utils/apiHelper';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns a deterministic {surahNo, ayahNo} pair for today.
 * Cycles through all 114 surahs using the day-of-year; always picks ayah 1.
 * The same verse is shown for the entire calendar day.
 */
function getDailyVerse() {
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((today - start) / 86_400_000);
  return { surahNo: (dayOfYear % 114) + 1, ayahNo: 1 };
}

/** Strip markdown-style `## Heading` markers from tafsir content. */
function cleanTafsir(text = '') {
  return text.replace(/^##\s+(.+)$/gm, '$1').trim();
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AppQuranVerse({ sx, ...other }) {
  const [tab, setTab] = useState(0);
  const [verse, setVerse] = useState(null);
  const [tafsir, setTafsir] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const { surahNo, ayahNo } = getDailyVerse();

  useEffect(() => {
    Promise.all([
      apiHelper.fetchQuranVerse(surahNo, ayahNo),
      apiHelper.fetchQuranTafsir(surahNo, ayahNo),
    ])
      .then(([verseData, tafsirData]) => {
        setVerse(verseData);
        setTafsir(tafsirData);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [surahNo, ayahNo]);

  const tafsirEntry = tafsir?.tafsirs?.find((t) => t.author === 'Ibn Kathir');
  const tafsirText = tafsirEntry ? cleanTafsir(tafsirEntry.content) : '';
  const tafsirGroup = tafsirEntry?.groupVerse ?? null;

  return (
    <Card
      sx={[
        {
          display: 'flex',
          flexDirection: 'column',
          height: { xs: 288, xl: 320 },
          bgcolor: 'grey.900',
          color: 'common.white',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      {/* ── Header ── */}
      <Box sx={{ px: 2.5, pt: 2, pb: 0.5 }}>
        <Typography variant="overline" sx={{ color: 'primary.light', letterSpacing: 1.5 }}>
          Quran — Verse of the Day
        </Typography>

        {!loading && !error && verse && (
          <Typography variant="caption" sx={{ display: 'block', color: 'grey.500', mt: 0.25 }}>
            {verse.surahName} ({verse.surahNameArabic}) · Surah {surahNo}, Ayah {ayahNo}
          </Typography>
        )}
      </Box>

      {/* ── Tabs ── */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        textColor="inherit"
        sx={{
          px: 2.5,
          minHeight: 34,
          '& .MuiTab-root': {
            color: 'grey.500',
            minHeight: 34,
            py: 0.5,
            fontSize: 12,
            fontWeight: 500,
          },
          '& .Mui-selected': { color: 'common.white' },
          '& .MuiTabs-indicator': { bgcolor: 'primary.main' },
          borderBottom: '1px solid',
          borderColor: 'grey.800',
        }}
      >
        <Tab label="Arabic" />
        <Tab label="Translation" />
        <Tab label="Tafsir" />
      </Tabs>

      {/* ── Content ── */}
      <Box sx={{ flex: 1, overflow: 'hidden', px: 2.5, py: 2 }}>
        {loading && (
          <>
            <Skeleton variant="text" width="85%" sx={{ bgcolor: 'grey.800', mb: 1 }} />
            <Skeleton variant="text" width="65%" sx={{ bgcolor: 'grey.800', mb: 1 }} />
            <Skeleton variant="text" width="75%" sx={{ bgcolor: 'grey.800' }} />
          </>
        )}

        {!loading && error && (
          <Typography variant="body2" sx={{ color: 'warning.light' }}>
            Unable to load verse. Please check your connection.
          </Typography>
        )}

        {!loading && !error && (
          <>
            {/* Arabic */}
            {tab === 0 && (
              <Typography
                dir="rtl"
                lang="ar"
                sx={{
                  textAlign: 'right',
                  fontSize: { xs: '1.3rem', xl: '1.5rem' },
                  lineHeight: 2.4,
                  fontFamily:
                    '"Amiri", "Scheherazade New", "Traditional Arabic", "Arial Unicode MS", serif',
                  color: 'common.white',
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {verse?.arabic1}
              </Typography>
            )}

            {/* English Translation */}
            {tab === 1 && (
              <Typography
                variant="body1"
                sx={{
                  lineHeight: 1.9,
                  color: 'grey.100',
                  fontStyle: 'italic',
                  display: '-webkit-box',
                  WebkitLineClamp: 6,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                &ldquo;{verse?.english}&rdquo;
                <Box
                  component="span"
                  sx={{
                    display: 'block',
                    mt: 1.5,
                    fontSize: 12,
                    color: 'grey.500',
                    fontStyle: 'normal',
                  }}
                >
                  — {verse?.surahName} ({verse?.surahNameTranslation}) · {verse?.revelationPlace}
                </Box>
              </Typography>
            )}

            {/* Tafsir */}
            {tab === 2 && (
              <Box>
                {tafsirGroup && (
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mb: 1,
                      color: 'primary.light',
                      fontStyle: 'italic',
                    }}
                  >
                    {tafsirGroup}
                  </Typography>
                )}

                <Typography
                  variant="body2"
                  sx={{ lineHeight: 1.85, color: 'grey.300', whiteSpace: 'pre-line' }}
                >
                  {tafsirText.length > 560 ? `${tafsirText.slice(0, 560)}…` : tafsirText}
                </Typography>

                <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'grey.600' }}>
                  Source: Ibn Kathir Tafsir
                </Typography>
              </Box>
            )}
          </>
        )}
      </Box>
    </Card>
  );
}
