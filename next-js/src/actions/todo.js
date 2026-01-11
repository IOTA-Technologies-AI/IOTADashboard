import useSWR, { mutate } from 'swr';
import { useMemo, startTransition } from 'react';

import axios, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

const enableServer = true;
const TODO_ENDPOINT = endpoints.todo.board;
const subtasksKey = (taskId) => (taskId ? [endpoints.todo.subtasks, { params: { taskId } }] : null);
const remindersKey = (taskId) =>
  taskId ? [endpoints.todo.reminders, { params: { taskId } }] : null;
const commentsKey = (taskId) => (taskId ? [endpoints.todo.comments, { params: { taskId } }] : null);

const swrOptions = {
  revalidateIfStale: enableServer,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  // Avoid 5s retry loops on network/CORS errors; surface once to the UI instead of spamming.
  shouldRetryOnError: false,
};

let currentPipelineId = null;

const defaultReporter = { id: 'todo-reporter', name: 'Workspace', avatarUrl: '' };

const normalizeTask = (item = {}, stageId) => {
  const startDate = new Date().toISOString();
  const endDate = item.expectedCloseDate || item.due?.[1] || startDate;

  // Build assignee array from assigneeEmail/assigneeName fields
  const assigneeList = [];
  if (item.assigneeEmail) {
    assigneeList.push({
      id: item.assigneeEmail,
      name: item.assigneeName || item.assigneeEmail,
      email: item.assigneeEmail,
      avatarUrl: '',
    });
  }

  return {
    ...item,
    stageId: stageId || item.stageId,
    priority: item.priority || 'medium',
    attachments: item.attachments || [],
    labels: item.labels || [],
    comments: item.comments || [],
    assignee: assigneeList.length > 0 ? assigneeList : item.assignee || [],
    reporter: item.reporter || {
      id: item.createdByEmail || 'todo-reporter',
      name: item.createdByName || 'Workspace',
      avatarUrl: '',
    },
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
    const tasks = data?.board?.tasks ?? {};
    const normalizedTasks = {};

    Object.entries(tasks).forEach(([stageId, stageTasks]) => {
      normalizedTasks[stageId] = (stageTasks || []).map((task) =>
        normalizeTask({ ...task, stageId }, stageId)
      );
    });

    const columns = data?.board?.columns ?? [];
    const pipelineId = data?.board?.pipelineId ?? null;

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
  }, [data, error, isLoading, isValidating]);

  return memoizedValue;
}

// ----------------------------------------------------------------------
// Subtasks
// ----------------------------------------------------------------------

export function useGetSubtasks(taskId) {
  const { data, isLoading, error, isValidating } = useSWR(subtasksKey(taskId), fetcher, {
    ...swrOptions,
  });

  return {
    subtasks: data?.subtasks || [],
    subtasksLoading: isLoading,
    subtasksError: error,
    subtasksValidating: isValidating,
  };
}

export async function createSubtask(taskId, title) {
  const payload = { taskId, title: title || 'Untitled' };
  await axios.post(endpoints.todo.subtasks, payload);

  startTransition(() => {
    mutate(subtasksKey(taskId));
  });
}

export async function updateSubtask(taskId, subtaskId, patch) {
  await axios.patch(`${endpoints.todo.subtasks}/${subtaskId}`, patch);

  startTransition(() => {
    mutate(subtasksKey(taskId));
  });
}

export async function deleteSubtask(taskId, subtaskId) {
  await axios.delete(`${endpoints.todo.subtasks}/${subtaskId}`);

  startTransition(() => {
    mutate(subtasksKey(taskId));
  });
}

// ----------------------------------------------------------------------
// Reminders
// ----------------------------------------------------------------------

export function useGetReminders(taskId) {
  const { data, isLoading, error, isValidating } = useSWR(remindersKey(taskId), fetcher, {
    ...swrOptions,
  });

  return {
    reminders: data?.reminders || [],
    remindersLoading: isLoading,
    remindersError: error,
    remindersValidating: isValidating,
  };
}

export async function createReminder(payload) {
  await axios.post(endpoints.todo.reminders, payload);

  startTransition(() => {
    mutate(remindersKey(payload.taskId));
  });
}

export async function updateReminder(taskId, reminderId, patch) {
  await axios.patch(`${endpoints.todo.reminders}/${reminderId}`, patch);

  startTransition(() => {
    mutate(remindersKey(taskId));
  });
}

export async function deleteReminder(taskId, reminderId) {
  await axios.delete(`${endpoints.todo.reminders}/${reminderId}`);

  startTransition(() => {
    mutate(remindersKey(taskId));
  });
}

// ----------------------------------------------------------------------
// Comments
// ----------------------------------------------------------------------

export function useGetComments(taskId) {
  const { data, isLoading, error, isValidating } = useSWR(commentsKey(taskId), fetcher, {
    ...swrOptions,
  });

  return {
    comments: data?.comments || [],
    commentsLoading: isLoading,
    commentsError: error,
    commentsValidating: isValidating,
  };
}

export async function createComment(payload) {
  await axios.post(endpoints.todo.comments, payload);

  startTransition(() => {
    mutate(commentsKey(payload.taskId));
    // Also refresh the board to update comment count
    mutate(TODO_ENDPOINT);
  });
}

export async function updateComment(taskId, commentId, patch) {
  await axios.patch(`${endpoints.todo.comments}/${commentId}`, patch);

  startTransition(() => {
    mutate(commentsKey(taskId));
  });
}

export async function deleteComment(taskId, commentId) {
  await axios.delete(`${endpoints.todo.comments}/${commentId}`);

  startTransition(() => {
    mutate(commentsKey(taskId));
    mutate(TODO_ENDPOINT);
  });
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
      if (!currentData?.board) return currentData;
      const { board } = currentData;
      const columns = [...board.columns, stage];
      const tasks = { ...board.tasks, [stage.id]: [] };
      return { ...currentData, board: { ...board, columns, tasks, pipelineId } };
    },
    { revalidate: false }
  );
}

// ----------------------------------------------------------------------

export async function updateColumn(columnId, columnName) {
  await axios.patch(`${endpoints.todo.stages}/${columnId}`, { name: columnName });

  startTransition(() => {
    mutate(
      TODO_ENDPOINT,
      (currentData) => {
        if (!currentData?.board) return currentData;
        const { board } = currentData;

        const columns = board.columns.map((column) =>
          column.id === columnId ? { ...column, name: columnName } : column
        );

        return { ...currentData, board: { ...board, columns } };
      },
      { revalidate: false }
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
        if (!currentData?.board) return currentData;
        const { board } = currentData;
        return { ...currentData, board: { ...board, columns: updateColumns } };
      },
      { revalidate: false }
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
        if (!currentData?.board) return currentData;
        const { board } = currentData;

        const boardTasks = board.tasks || {};
        tasksToDelete = boardTasks[columnId] || [];

        const tasks = { ...boardTasks, [columnId]: [] };

        return { ...currentData, board: { ...board, tasks } };
      },
      { revalidate: false }
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
      if (!currentData?.board) return currentData;
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
    { revalidate: false }
  );
}

// ----------------------------------------------------------------------

export async function createTask(columnId, taskData, userInfo = {}) {
  const pipelineId = currentPipelineId;

  if (!pipelineId) throw new Error('Board is not ready yet');

  const payload = {
    pipelineId,
    stageId: columnId,
    name: taskData.name || 'Untitled',
    description: taskData.description || '',
    expectedCloseDate: taskData.due?.[1] || taskData.expectedCloseDate || null,
    status: taskData.status || 'open',
    // Creator info
    createdByEmail: userInfo.email || null,
    createdByName: userInfo.displayName || userInfo.email || null,
    // Assignee info (if provided)
    assigneeEmail: taskData.assigneeEmail || null,
    assigneeName: taskData.assigneeName || null,
  };

  const res = await axios.post(endpoints.todo.tasks, payload);
  const created = res.task || res.data?.task || res.data?.[0] || res.data;
  const task = normalizeTask({ ...created, stageId: columnId }, columnId);

  startTransition(() => {
    mutate(
      TODO_ENDPOINT,
      (currentData) => {
        if (!currentData?.board) return currentData;
        const { board } = currentData;
        const boardTasks = board.tasks || {};
        const columnTasks = boardTasks[columnId] || [];
        const tasks = { ...boardTasks, [columnId]: [task, ...columnTasks] };

        return { ...currentData, board: { ...board, tasks } };
      },
      { revalidate: false }
    );
  });
}

// ----------------------------------------------------------------------

export async function updateTask(columnId, taskData, userInfo = {}) {
  const payload = {
    stageId: columnId,
    name: taskData.name,
    description: taskData.description,
    status: taskData.status,
    expectedCloseDate: taskData.due?.[1] || taskData.expectedCloseDate,
    // Labels
    labels: taskData.labels,
    // Include assignee fields if provided
    assigneeEmail: taskData.assigneeEmail,
    assigneeName: taskData.assigneeName,
  };

  const res = await axios.patch(`${endpoints.todo.tasks}/${taskData.id}`, payload);
  const updated = res.task || res.data?.task || res.data?.[0] || res.data;
  const updatedTask = normalizeTask({ ...updated, stageId: columnId }, columnId);

  startTransition(() => {
    mutate(
      TODO_ENDPOINT,
      (currentData) => {
        if (!currentData?.board) return currentData;
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
      { revalidate: false }
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

  // Immediately update the cache with the new task structure (optimistic update)
  // Normalize tasks to ensure stageId is updated
  const normalizedTasks = {};
  Object.entries(updateTasks).forEach(([stageId, tasks]) => {
    normalizedTasks[stageId] = (tasks || []).map((task) => ({
      ...task,
      stageId, // Ensure stageId is updated to match the new column
    }));
  });

  await mutate(
    TODO_ENDPOINT,
    (currentData) => {
      if (!currentData?.board) return currentData;
      const { board } = currentData;
      return { ...currentData, board: { ...board, tasks: normalizedTasks } };
    },
    { revalidate: false } // Use options object for SWR v2
  );

  // Only call API for tasks that actually moved to a different column
  if (updates.length > 0) {
    try {
      await Promise.all(
        updates.map((update) =>
          axios.patch(`${endpoints.todo.tasks}/${update.id}`, { stageId: update.stageId })
        )
      );
    } catch (error) {
      console.error('Failed to move task:', error);
      // Revalidate to restore correct state on error
      mutate(TODO_ENDPOINT);
      throw error;
    }
  }
}

// ----------------------------------------------------------------------

export async function deleteTask(columnId, taskId) {
  await axios.delete(`${endpoints.todo.tasks}/${taskId}`);

  mutate(
    TODO_ENDPOINT,
    (currentData) => {
      if (!currentData?.board) return currentData;
      const { board } = currentData;
      const boardTasks = board.tasks || {};
      const columnTasks = boardTasks[columnId] || [];

      const tasks = {
        ...boardTasks,
        [columnId]: columnTasks.filter((task) => task.id !== taskId),
      };

      return { ...currentData, board: { ...board, tasks } };
    },
    { revalidate: false }
  );
}
