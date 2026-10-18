'use client';

import { keyframes } from '@emotion/react';

import Box from '@mui/material/Box';

// ----------------------------------------------------------------------

const OPEN = -48;

const swing = keyframes`
  from { transform: rotateY(0deg); }
  to { transform: rotateY(${OPEN}deg); }
`;

// After opening, the door drifts a little, as if in a draught.
const sway = keyframes`
  from { transform: rotateY(${OPEN}deg); }
  to { transform: rotateY(${OPEN + 5}deg); }
`;

const twinkle = keyframes`
  0%, 100% { opacity: 0.25; }
  50% { opacity: 1; }
`;

// [left %, top %, size px, delay s, accent]
const STARS = [
  [22, 10, 2.5, 0, false],
  [64, 7, 2, 1.2, false],
  [78, 24, 3.5, 0.6, true],
  [42, 30, 2, 2.1, false],
  [70, 43, 2.5, 1.7, false],
  [26, 51, 3, 0.3, true],
  [82, 59, 2, 2.6, false],
  [54, 66, 3, 0.9, false],
  [32, 78, 2, 1.5, false],
  [72, 85, 2.5, 2.3, true],
];

/**
 * A door left ajar onto a night sky: line-drawn, on the sign-in panel. It
 * swings open once on load, then sways slightly; still for anyone who has
 * asked their system for reduced motion.
 */
export function DoorScene({ sx }) {
  const frame = { position: 'absolute', left: '38%', width: '24%', bottom: '16%', height: '62%' };

  return (
    <Box
      aria-hidden
      sx={[
        (theme) => ({
          '--door-line': theme.vars.palette.text.primary,
          position: 'relative',
          width: 1,
          maxWidth: 380,
          aspectRatio: '4/3',
          mx: 'auto',
          perspective: '700px',
          '@media (prefers-reduced-motion: reduce)': {
            '& *': { animation: 'none !important' },
            '& .door-panel': { transform: `rotateY(${OPEN + 2}deg)` },
          },
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {/* Floor, broken either side of the threshold */}
      {[
        ['8%', '28%'],
        ['37%', '26%'],
        ['66%', '26%'],
      ].map(([left, width]) => (
        <Box
          key={left}
          sx={{
            position: 'absolute',
            left,
            width,
            bottom: '16%',
            height: '1.5px',
            bgcolor: 'var(--door-line)',
            opacity: 0.8,
          }}
        />
      ))}

      {/* The night beyond the door */}
      <Box
        sx={{
          ...frame,
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #070D1F 0%, #0F1D3F 100%)',
          boxShadow: '0 0 0 1.5px var(--door-line)',
        }}
      >
        {STARS.map(([left, top, size, delay, accent]) => (
          <Box
            key={`${left}-${top}`}
            sx={{
              position: 'absolute',
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              borderRadius: '50%',
              bgcolor: accent ? 'primary.light' : '#FFF',
              boxShadow: `0 0 ${size * 3}px ${accent ? 'currentColor' : 'rgba(255,255,255,0.8)'}`,
              color: 'primary.light',
              animation: `${twinkle} 3.2s ease-in-out ${delay}s infinite`,
            }}
          />
        ))}
      </Box>

      {/* The door, hinged on the left */}
      <Box
        className="door-panel"
        sx={{
          ...frame,
          bgcolor: 'background.paper',
          boxShadow: 'inset 0 0 0 1.5px var(--door-line)',
          transformOrigin: 'left center',
          transform: `rotateY(${OPEN}deg)`,
          animation: `${swing} 1.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.3s both, ${sway} 5s ease-in-out 2.1s infinite alternate`,
        }}
      >
        {/* Handle */}
        <Box
          sx={{
            position: 'absolute',
            right: '9%',
            top: '50%',
            width: '16%',
            height: 4,
            borderRadius: 2,
            border: '1.5px solid var(--door-line)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            right: '9%',
            top: 'calc(50% + 10px)',
            width: 5,
            height: 8,
            borderRadius: 1,
            border: '1.5px solid var(--door-line)',
          }}
        />
      </Box>
    </Box>
  );
}
