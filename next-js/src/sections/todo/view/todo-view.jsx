'use client';

import { KanbanView } from 'src/sections/kanban/view';

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

// ----------------------------------------------------------------------

const todoActions = {
  createTask: createTodoTask,
  moveTask: moveTodoTask,
  updateTask: updateTodoTask,
  deleteTask: deleteTodoTask,
  createColumn: createTodoColumn,
  moveColumn: moveTodoColumn,
  updateColumn: updateTodoColumn,
  clearColumn: clearTodoColumn,
  deleteColumn: deleteTodoColumn,
};

export function TodoView() {
  const { user } = useAuthContext();
  const canManageColumns = ['admin', 'superAdmin'].includes(user?.role);

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
