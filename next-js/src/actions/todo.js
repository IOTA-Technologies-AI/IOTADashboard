import useSWR, { mutate } from 'swr';
import { useMemo, startTransition } from 'react';

import axios, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

const enableServer = true;
const TODO_ENDPOINT = endpoints.todo.board;

const swrOptions = {
  revalidateIfStale: enableServer,
  revalidateOnFocus: enableServer,
  revalidateOnReconnect: enableServer,
};

let currentPipelineId = null;

const defaultReporter = { id: 'todo-reporter', name: 'Workspace', avatarUrl: '' };

const normalizeTask = (item = {}, stageId) => {
  const startDate = new Date().toISOString();
  const endDate = item.expectedCloseDate || item.due?.[1] || startDate;

  return {
    ...item,
    stageId: stageId || item.stageId,
    priority: item.priority || 'medium',
    attachments: item.attachments || [],
    labels: item.labels || [],
    comments: item.comments || [],
    assignee: item.assignee || [],
    reporter: item.reporter || defaultReporter,
    due: item.due || [startDate, endDate],
    status: item.status || 'open',
    value: item.value ?? 0,
  };
};

// ----------------------------------------------------------------------

export function useGetTodoBoard() {
  const { data, isLoading, error, isValidating } = useSWR(TODO_ENDPOINT, fetcher, {
    ...swrOptions,
  });

  const memoizedValue = useMemo(() => {
    const tasks = data?.board.tasks ?? {};
    const normalizedTasks = {};

    Object.entries(tasks).forEach(([stageId, stageTasks]) => {
      normalizedTasks[stageId] = (stageTasks || []).map((task) =>
        normalizeTask({ ...task, stageId }, stageId)
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
    color: columnData.color ?? null,
  };

  const res = await axios.post(endpoints.todo.stages, payload);
  const stage = res.stage || res.data?.stage || res.data?.[0] || res.data;

  mutate(
    TODO_ENDPOINT,
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
  await axios.patch(`${endpoints.todo.stages}/${columnId}`, { name: columnName });

  startTransition(() => {
    mutate(
      TODO_ENDPOINT,
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
      TODO_ENDPOINT,
      (currentData) => {
        const { board } = currentData;
        return { ...currentData, board: { ...board, columns: updateColumns } };
      },
      false
    );
  });

  const stages = updateColumns.map((col, index) => ({ id: col.id, position: (index + 1) * 100 }));
  await axios.post(`${endpoints.todo.stages}/reorder`, { pipelineId, stages });
}

// ----------------------------------------------------------------------

export async function clearColumn(columnId) {
  let tasksToDelete = [];

  startTransition(() => {
    mutate(
      TODO_ENDPOINT,
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
      tasksToDelete.map((task) => axios.delete(`${endpoints.todo.tasks}/${task.id}`))
    );
  }
}

// ----------------------------------------------------------------------

export async function deleteColumn(columnId) {
  await axios.delete(`${endpoints.todo.stages}/${columnId}`);

  mutate(
    TODO_ENDPOINT,
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

  if (!pipelineId) throw new Error('Board is not ready yet');

  const payload = {
    pipelineId,
    stageId: columnId,
    name: taskData.name || 'Untitled',
    description: taskData.description || '',
    expectedCloseDate: taskData.due?.[1] || taskData.expectedCloseDate || null,
    status: taskData.status || 'open',
  };

  const res = await axios.post(endpoints.todo.tasks, payload);
  const created = res.task || res.data?.task || res.data?.[0] || res.data;
  const task = normalizeTask({ ...created, stageId: columnId }, columnId);

  startTransition(() => {
    mutate(
      TODO_ENDPOINT,
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
    description: taskData.description,
    status: taskData.status,
    expectedCloseDate: taskData.due?.[1] || taskData.expectedCloseDate,
  };

  const res = await axios.patch(`${endpoints.todo.tasks}/${taskData.id}`, payload);
  const updated = res.task || res.data?.task || res.data?.[0] || res.data;
  const updatedTask = normalizeTask({ ...updated, stageId: columnId }, columnId);

  startTransition(() => {
    mutate(
      TODO_ENDPOINT,
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
  const normalizedTasks = {};
  const updates = [];

  Object.entries(updateTasks).forEach(([stageId, tasks]) => {
    normalizedTasks[stageId] = (tasks || []).map((task) => {
      const nextTask = normalizeTask({ ...task, stageId }, stageId);
      updates.push({ id: task.id, stageId });
      return nextTask;
    });
  });

  startTransition(() => {
    mutate(
      TODO_ENDPOINT,
      (currentData) => {
        const { board } = currentData;

        return { ...currentData, board: { ...board, tasks: normalizedTasks } };
      },
      false
    );
  });

  await Promise.all(
    updates.map((update) =>
      axios.patch(`${endpoints.todo.tasks}/${update.id}`, { stageId: update.stageId })
    )
  );
}

// ----------------------------------------------------------------------

export async function deleteTask(columnId, taskId) {
  await axios.delete(`${endpoints.todo.tasks}/${taskId}`);

  mutate(
    TODO_ENDPOINT,
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
