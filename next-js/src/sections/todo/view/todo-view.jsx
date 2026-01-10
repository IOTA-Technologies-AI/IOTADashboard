'use client';

import { useMemo } from 'react';

import {
  useGetTodoBoard,
  createTask as createTodoTask,
  moveTask as moveTodoTask,
  updateTask as updateTodoTask,
  deleteTask as deleteTodoTask,
  createColumn as createTodoColumn,
  moveColumn as moveTodoColumn,
  updateColumn as updateTodoColumn,
  clearColumn as clearTodoColumn,
  deleteColumn as deleteTodoColumn,
} from 'src/actions/todo';

import { KanbanView } from 'src/sections/kanban/view';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

export function TodoView() {
  const { user } = useAuthContext();
  const canManageColumns = ['admin', 'superAdmin'].includes(user?.role);

  // Wrap createTask and updateTask to automatically include user info
  const todoActions = useMemo(
    () => ({
      createTask: (columnId, taskData) =>
        createTodoTask(columnId, taskData, {
          email: user?.email,
          displayName: user?.displayName || user?.email,
        }),
      moveTask: moveTodoTask,
      updateTask: (columnId, taskData) =>
        updateTodoTask(columnId, taskData, {
          email: user?.email,
          displayName: user?.displayName || user?.email,
        }),
      deleteTask: deleteTodoTask,
      createColumn: createTodoColumn,
      moveColumn: moveTodoColumn,
      updateColumn: updateTodoColumn,
      clearColumn: clearTodoColumn,
      deleteColumn: deleteTodoColumn,
    }),
    [user?.email, user?.displayName]
  );

  return (
    <KanbanView
      title="To Do"
      maxWidth="xl"
      useBoardHook={useGetTodoBoard}
      actions={todoActions}
      canManageColumns={canManageColumns}
    />
  );
}
