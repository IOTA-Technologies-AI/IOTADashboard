'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import GlobalStyles from '@mui/material/GlobalStyles';
import FormControlLabel from '@mui/material/FormControlLabel';

import { useGetBoard } from 'src/actions/kanban';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { kanbanClasses } from '../classes';
import { useBoardDnd } from '../hooks/use-board-dnd';
import { KanbanColumn } from '../column/kanban-column';
import { KanbanColumnAdd } from '../column/kanban-column-add';
import { KanbanColumnSkeleton } from '../components/kanban-skeleton';
import { defaultKanbanActions, KanbanActionsProvider } from '../context/actions-context';

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

export function KanbanView({
  title = 'Kanban',
  renderBeforeBoard,
  maxWidth = false,
  loading,
  useBoardHook = useGetBoard,
  actions,
  canManageColumns = true,
}) {
  const actionSet = actions || defaultKanbanActions;
  const { board: serverBoard, boardLoading, boardEmpty } = useBoardHook();

  // ── Local board state ────────────────────────────────────────────────────
  // Keeps a React-state copy of the board so drag-and-drop re-renders happen
  // in the same frame the user releases the card, not after SWR propagates.
  const [localBoard, setLocalBoard] = useState(null);
  const serverBoardRef = useRef(serverBoard);
  serverBoardRef.current = serverBoard;

  // Keep local board in sync with server board (initial load, task creates /
  // deletes, and error-recovery revalidations from the API layer).
  useEffect(() => {
    if (serverBoard) {
      setLocalBoard(serverBoard);
    }
  }, [serverBoard]);

  // The board actually rendered – local state takes priority so every drop is
  // reflected in the same React render cycle without waiting for SWR.
  const displayBoard = localBoard ?? serverBoard ?? { columns: [], tasks: {} };

  // moveTask: update local state synchronously, then fire the async SWR + API
  // path so the UI never blocks on the network.
  const localMoveTask = useCallback(
    (updateTasks) => {
      const normalizedTasks = {};
      Object.entries(updateTasks).forEach(([stageId, tasks]) => {
        normalizedTasks[stageId] = (tasks || []).map((task) => ({ ...task, stageId }));
      });
      setLocalBoard((prev) => (prev ? { ...prev, tasks: normalizedTasks } : prev));
      // Persist to server + keep SWR cache consistent (error handling / revert
      // lives inside actionSet.moveTask which calls mutate(TODO_ENDPOINT) on failure).
      actionSet.moveTask(updateTasks);
    },
    [actionSet]
  );

  // moveColumn: same local-first pattern.
  const localMoveColumn = useCallback(
    (updateColumns) => {
      setLocalBoard((prev) => (prev ? { ...prev, columns: updateColumns } : prev));
      actionSet.moveColumn(updateColumns);
    },
    [actionSet]
  );

  // Expose the wrapped actions through context so the DnD hooks pick them up.
  const localActionSet = useMemo(
    () => ({ ...actionSet, moveTask: localMoveTask, moveColumn: localMoveColumn }),
    [actionSet, localMoveTask, localMoveColumn]
  );

  const { boardRef } = useBoardDnd(displayBoard);

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
            onClick={() => actionSet.createColumn({ name: 'New stage' })}
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
        {displayBoard.columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={displayBoard.tasks[column.id]}
            canManageColumns={canManageColumns}
          />
        ))}
      </AnimatePresence>
      {canManageColumns ? <KanbanColumnAdd /> : null}
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

  const renderBoard = () => (
    <ScrollContainer ref={boardRef}>
      {boardLoading || loading ? renderLoading() : boardEmpty ? renderEmpty() : renderList()}
    </ScrollContainer>
  );

  return (
    <KanbanActionsProvider actions={localActionSet}>
      {inputGlobalStyles()}

      <DashboardContent
        maxWidth={maxWidth}
        sx={{
          '--container-max-width': maxWidth ? 'var(--max-width)' : '1200px',
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

        {renderBoard()}
      </DashboardContent>
    </KanbanActionsProvider>
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
