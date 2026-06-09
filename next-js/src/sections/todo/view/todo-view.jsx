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

  // Map role string → numeric roleId (mirrors Supabase roles table)
  const roleIdMap = { regular: 1, manager: 2, admin: 3, superAdmin: 4 };
  const callerRoleId = roleIdMap[user?.role] ?? 1;

  // Wrap createTask and updateTask to automatically include user info
  const todoActions = useMemo(
    () => ({
      createTask: (columnId, taskData) =>
        createTodoTask(columnId, taskData, {
          email: user?.email,
          displayName: user?.displayName || user?.email,
        }),
      // Pass callerRoleId so the server can enforce the cancel-permission rule
      moveTask: (updateTasks) => moveTodoTask(updateTasks, callerRoleId),
      updateTask: (columnId, taskData) =>
        updateTodoTask(columnId, taskData, {
          email: user?.email,
          displayName: user?.displayName || user?.email,
          roleId: callerRoleId,
        }),
      deleteTask: deleteTodoTask,
      createColumn: createTodoColumn,
      moveColumn: moveTodoColumn,
      updateColumn: updateTodoColumn,
      clearColumn: clearTodoColumn,
      deleteColumn: deleteTodoColumn,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.email, user?.displayName, callerRoleId]
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
