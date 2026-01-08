'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import GlobalStyles from '@mui/material/GlobalStyles';
import FormControlLabel from '@mui/material/FormControlLabel';

import { createColumn, useGetBoard } from 'src/actions/kanban';
import { DashboardContent } from 'src/layouts/dashboard';

import { EmptyContent } from 'src/components/empty-content';
import { Iconify } from 'src/components/iconify';

import { kanbanClasses } from '../classes';
import { useBoardDnd } from '../hooks/use-board-dnd';
import { KanbanColumn } from '../column/kanban-column';
import { KanbanColumnAdd } from '../column/kanban-column-add';
import { KanbanColumnSkeleton } from '../components/kanban-skeleton';

// ----------------------------------------------------------------------

const inputGlobalStyles = () => (
  <GlobalStyles
    styles={{
      body: {
        '--kanban-item-gap': '16px',
        '--kanban-item-radius': '12px',
        '--kanban-column-gap': '24px',
        '--kanban-column-width': '336px',
        '--kanban-column-radius': '16px',
        '--kanban-column-pt': '20px',
        '--kanban-column-pb': '16px',
        '--kanban-column-px': '16px',
      },
    }}
  />
);

// ----------------------------------------------------------------------

export function KanbanView({ title = 'Kanban', renderBeforeBoard, maxWidth = false, loading }) {
  const { board, boardLoading, boardEmpty } = useGetBoard();
  const { boardRef } = useBoardDnd(board);

  const [columnFixed, setColumnFixed] = useState(false);

  const renderLoading = () => (
    <Box sx={{ gap: 'var(--kanban-column-gap)', display: 'flex', alignItems: 'flex-start' }}>
      <KanbanColumnSkeleton />
    </Box>
  );

  const renderEmpty = () => (
    <Box
      sx={{
        py: 10,
        maxHeight: { md: 480 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <EmptyContent
        title="No stages yet"
        description="Add your first stage (+) and use @ in names/descriptions to tag teammates."
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => createColumn({ name: 'New stage' })}
          >
            Add stage
          </Button>
        }
        sx={{ width: '100%', maxWidth: 420 }}
      />
    </Box>
  );

  const renderList = () => (
    <FlexibleColumnContainer columnFixed={columnFixed}>
      <AnimatePresence>
        {board.columns.map((column) => (
          <KanbanColumn key={column.id} column={column} tasks={board.tasks[column.id]} />
        ))}
      </AnimatePresence>
      <KanbanColumnAdd />
    </FlexibleColumnContainer>
  );

  const renderHead = () => (
    <Box
      sx={{
        mb: 3,
        pr: { sm: 3 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Typography variant="h4">{title}</Typography>

      <FormControlLabel
        label="Fixed column"
        labelPlacement="start"
        control={
          <Switch
            checked={columnFixed}
            onChange={(event) => {
              setColumnFixed(event.target.checked);
            }}
            slotProps={{ input: { id: 'fixed-column-switch' } }}
          />
        }
      />
    </Box>
  );

  return (
    <>
      {inputGlobalStyles()}

      <DashboardContent
        maxWidth={maxWidth}
        sx={{
          pb: 3,
          pl: { sm: 3 },
          pr: { sm: 3 },
          minHeight: 0,
          flex: '1 1 0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {renderHead()}

        {renderBeforeBoard ? <Box sx={{ mb: 3 }}>{renderBeforeBoard}</Box> : null}

        <ScrollContainer ref={boardRef}>
          {boardLoading || loading ? (
            renderLoading()
          ) : (
            <>{boardEmpty ? renderEmpty() : renderList()}</>
          )}
        </ScrollContainer>
      </DashboardContent>
    </>
  );
}

// ----------------------------------------------------------------------

const flexStyles = {
  minHeight: 0,
  flex: '1 1 auto',
};

const ScrollContainer = styled('div')(({ theme }) => ({
  ...theme.mixins.scrollbarStyles(theme),
  ...flexStyles,
  display: 'flex',
  overflowX: 'auto',
  flexDirection: 'column',
}));

const FlexibleColumnContainer = styled('ul', {
  shouldForwardProp: (prop) => !['columnFixed', 'sx'].includes(prop),
})(({ theme }) => ({
  display: 'flex',
  gap: 'var(--kanban-column-gap)',
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(2),
  variants: [
    {
      props: { columnFixed: true },
      style: {
        ...flexStyles,
        [`& .${kanbanClasses.column.root}`]: { ...flexStyles },
      },
    },
  ],
}));
