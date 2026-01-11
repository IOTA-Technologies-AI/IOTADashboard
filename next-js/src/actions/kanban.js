import useSWR, { mutate } from 'swr';
import { useMemo, startTransition } from 'react';

import axios, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
const enableServer = true;

const KANBAN_ENDPOINT = endpoints.sales.board;

const swrOptions = {
  revalidateIfStale: enableServer,
  revalidateOnFocus: enableServer,
  revalidateOnReconnect: enableServer,
};

let currentPipelineId = null;

const defaultReporter = { id: 'sales-reporter', name: 'Sales', avatarUrl: '' };

const normalizeDealToTask = (deal = {}) => {
  const startDate = new Date().toISOString();
  const endDate = deal.expectedCloseDate || startDate;

  return {
    ...deal,
    priority: deal.priority || 'medium',
    attachments: deal.attachments || [],
    labels: deal.labels || [],
    comments: deal.comments || [],
    assignee: deal.assignee || [],
    reporter: deal.reporter || defaultReporter,
    due: deal.due || [startDate, endDate],
    status: deal.status || 'open',
    value: deal.value ?? 0,
    currency: deal.currency || 'USD',
    stageId: deal.stageId,
  };
};

// ----------------------------------------------------------------------

export function useGetBoard() {
  const { data, isLoading, error, isValidating } = useSWR(KANBAN_ENDPOINT, fetcher, {
    ...swrOptions,
  });

  const memoizedValue = useMemo(() => {
    const tasks = data?.board.tasks ?? {};
    const normalizedTasks = {};

    Object.entries(tasks).forEach(([stageId, stageTasks]) => {
      normalizedTasks[stageId] = (stageTasks || []).map((task) =>
        normalizeDealToTask({ ...task, stageId })
      );
    });

    const columns = data?.board.columns ?? [];
    const pipelineId = data?.board.pipelineId ?? null;

    if (pipelineId) {
      currentPipelineId = pipelineId;
    }

    return {
      board: { tasks: normalizedTasks, columns, pipelineId },
      boardLoading: isLoading,
      boardError: error,
      boardValidating: isValidating,
      boardEmpty: !isLoading && !isValidating && !columns.length,
    };
  }, [
    data?.board.columns,
    data?.board.tasks,
    data?.board.pipelineId,
    error,
    isLoading,
    isValidating,
  ]);

  return memoizedValue;
}

// ----------------------------------------------------------------------

export async function createColumn(columnData, pipelineIdOverride) {
  const pipelineId = pipelineIdOverride || currentPipelineId;

  const payload = {
    pipelineId,
    name: columnData.name,
    position: columnData.position || 1000,
    probability: columnData.probability ?? null,
    isClosedWon: columnData.isClosedWon ?? false,
    isClosedLost: columnData.isClosedLost ?? false,
    color: columnData.color ?? null,
  };

  const res = await axios.post(endpoints.sales.stages, payload);
  const stage = res.stage || res.data?.stage || res.data?.[0] || res.data;

  mutate(
    KANBAN_ENDPOINT,
    (currentData) => {
      const { board } = currentData;
      const columns = [...board.columns, stage];
      const tasks = { ...board.tasks, [stage.id]: [] };
      return { ...currentData, board: { ...board, columns, tasks, pipelineId } };
    },
    false
  );
}

// ----------------------------------------------------------------------

export async function updateColumn(columnId, columnName) {
  await axios.patch(`${endpoints.sales.stages}/${columnId}`, { name: columnName });

  startTransition(() => {
    mutate(
      KANBAN_ENDPOINT,
      (currentData) => {
        const { board } = currentData;

        const columns = board.columns.map((column) =>
          column.id === columnId ? { ...column, name: columnName } : column
        );

        return { ...currentData, board: { ...board, columns } };
      },
      false
    );
  });
}

// ----------------------------------------------------------------------

export async function moveColumn(updateColumns) {
  const pipelineId = currentPipelineId;

  startTransition(() => {
    mutate(
      KANBAN_ENDPOINT,
      (currentData) => {
        const { board } = currentData;
        return { ...currentData, board: { ...board, columns: updateColumns } };
      },
      false
    );
  });

  const stages = updateColumns.map((col, index) => ({ id: col.id, position: (index + 1) * 100 }));
  await axios.post(`${endpoints.sales.stages}/reorder`, { pipelineId, stages });
}

// ----------------------------------------------------------------------

export async function clearColumn(columnId) {
  let tasksToDelete = [];

  startTransition(() => {
    mutate(
      KANBAN_ENDPOINT,
      (currentData) => {
        const { board } = currentData;

        const boardTasks = board.tasks || {};
        tasksToDelete = boardTasks[columnId] || [];

        const tasks = { ...boardTasks, [columnId]: [] };

        return { ...currentData, board: { ...board, tasks } };
      },
      false
    );
  });

  if (tasksToDelete.length) {
    await Promise.all(
      tasksToDelete.map((task) => axios.delete(`${endpoints.sales.deals}/${task.id}`))
    );
  }
}

// ----------------------------------------------------------------------

export async function deleteColumn(columnId) {
  await axios.delete(`${endpoints.sales.stages}/${columnId}`);

  mutate(
    KANBAN_ENDPOINT,
    (currentData) => {
      const { board } = currentData;

      const columns = board.columns.filter((column) => column.id !== columnId);
      const boardTasks = board.tasks || {};
      const tasks = Object.keys(boardTasks)
        .filter((key) => key !== columnId)
        .reduce((obj, key) => {
          obj[key] = boardTasks[key];
          return obj;
        }, {});

      return { ...currentData, board: { ...board, columns, tasks } };
    },
    false
  );
}

// ----------------------------------------------------------------------

export async function createTask(columnId, taskData) {
  const pipelineId = currentPipelineId;

  if (!pipelineId) throw new Error('Pipeline is not ready yet');

  const payload = {
    pipelineId,
    stageId: columnId,
    name: taskData.name || 'Untitled',
    value: taskData.value ?? 0,
    currency: taskData.currency || 'USD',
    probability: taskData.probability ?? null,
    status: taskData.status || 'open',
    expectedCloseDate: taskData.due?.[1] || taskData.expectedCloseDate || null,
    description: taskData.description || '',
  };

  const res = await axios.post(endpoints.sales.deals, payload);
  const deal = res.deal || res.data?.deal || res.data?.[0] || res.data;
  const task = normalizeDealToTask({ ...deal, stageId: columnId });

  startTransition(() => {
    mutate(
      KANBAN_ENDPOINT,
      (currentData) => {
        const { board } = currentData;
        const boardTasks = board.tasks || {};
        const columnTasks = boardTasks[columnId] || [];
        const tasks = { ...boardTasks, [columnId]: [task, ...columnTasks] };

        return { ...currentData, board: { ...board, tasks } };
      },
      false
    );
  });
}

// ----------------------------------------------------------------------

export async function updateTask(columnId, taskData) {
  const payload = {
    stageId: columnId,
    name: taskData.name,
    value: taskData.value,
    currency: taskData.currency,
    probability: taskData.probability,
    status: taskData.status,
    expectedCloseDate: taskData.due?.[1] || taskData.expectedCloseDate,
    description: taskData.description,
  };

  const res = await axios.patch(`${endpoints.sales.deals}/${taskData.id}`, payload);
  const deal = res.deal || res.data?.deal || res.data?.[0] || res.data;
  const updatedTask = normalizeDealToTask({ ...deal, stageId: columnId });

  startTransition(() => {
    mutate(
      KANBAN_ENDPOINT,
      (currentData) => {
        const { board } = currentData;
        const boardTasks = board.tasks || {};
        const tasksInColumn = boardTasks[columnId] || [];

        const updateTasks = tasksInColumn.map((task) =>
          task.id === taskData.id
            ? {
                ...task,
                ...updatedTask,
              }
            : task
        );

        const tasks = { ...boardTasks, [columnId]: updateTasks };

        return { ...currentData, board: { ...board, tasks } };
      },
      false
    );
  });
}

// ----------------------------------------------------------------------

export async function moveTask(updateTasks) {
  const updates = [];

  // Identify which tasks actually moved to a different column
  Object.entries(updateTasks).forEach(([stageId, tasks]) => {
    (tasks || []).forEach((task) => {
      // Only update tasks that changed stage
      if (task.stageId !== stageId) {
        updates.push({ id: task.id, stageId });
      }
    });
  });

  // Normalize tasks to ensure stageId is updated
  const normalizedTasks = {};
  Object.entries(updateTasks).forEach(([stageId, tasks]) => {
    normalizedTasks[stageId] = (tasks || []).map((task) => ({
      ...task,
      stageId, // Ensure stageId is updated to match the new column
    }));
  });

  // Immediately update the cache (optimistic update)
  await mutate(
    KANBAN_ENDPOINT,
    (currentData) => {
      if (!currentData?.board) return currentData;
      const { board } = currentData;
      return { ...currentData, board: { ...board, tasks: normalizedTasks } };
    },
    { revalidate: false }
  );

  // Only call API for tasks that actually moved to a different column
  if (updates.length > 0) {
    try {
      await Promise.all(
        updates.map((update) =>
          axios.patch(`${endpoints.sales.deals}/${update.id}`, { stageId: update.stageId })
        )
      );
    } catch (error) {
      console.error('Failed to move task:', error);
      // Revalidate to restore correct state on error
      mutate(KANBAN_ENDPOINT);
      throw error;
    }
  }
}

// ----------------------------------------------------------------------

export async function deleteTask(columnId, taskId) {
  await axios.delete(`${endpoints.sales.deals}/${taskId}`);

  mutate(
    KANBAN_ENDPOINT,
    (currentData) => {
      const { board } = currentData;
      const boardTasks = board.tasks || {};
      const columnTasks = boardTasks[columnId] || [];

      const tasks = {
        ...boardTasks,
        [columnId]: columnTasks.filter((task) => task.id !== taskId),
      };

      return { ...currentData, board: { ...board, tasks } };
    },
    false
  );
}
