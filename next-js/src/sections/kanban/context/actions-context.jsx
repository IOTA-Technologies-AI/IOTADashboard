import { createContext, useContext, useMemo } from 'react';

import {
  createTask,
  moveTask,
  updateTask,
  deleteTask,
  createColumn,
  moveColumn,
  updateColumn,
  clearColumn,
  deleteColumn,
} from 'src/actions/kanban';

const defaultKanbanActions = {
  createTask,
  moveTask,
  updateTask,
  deleteTask,
  createColumn,
  moveColumn,
  updateColumn,
  clearColumn,
  deleteColumn,
};

const KanbanActionsContext = createContext(defaultKanbanActions);

export function KanbanActionsProvider({ actions = defaultKanbanActions, children }) {
  const value = useMemo(() => ({ ...defaultKanbanActions, ...actions }), [actions]);

  return <KanbanActionsContext.Provider value={value}>{children}</KanbanActionsContext.Provider>;
}

export function useKanbanActions() {
  return useContext(KanbanActionsContext);
}

export { defaultKanbanActions };
