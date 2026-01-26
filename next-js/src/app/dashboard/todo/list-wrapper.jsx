'use client';

import { PageGuard } from 'src/auth/guard';
import { TodoView } from 'src/sections/todo/view';

export default function TodoListWrapper() {
  return (
    <PageGuard>
      <TodoView />
    </PageGuard>
  );
}
