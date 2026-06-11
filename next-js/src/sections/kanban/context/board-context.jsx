import { createContext, useContext } from 'react';

// Provides the live board (columns + tasks) to any kanban descendant.
const BoardContext = createContext({ columns: [], tasks: {} });

export function BoardProvider({ board, children }) {
  return <BoardContext.Provider value={board}>{children}</BoardContext.Provider>;
}

export function useBoard() {
  return useContext(BoardContext);
}
