import { toast } from 'sonner';
import { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useBoolean } from 'minimal-shared/hooks';
import { mergeClasses } from 'minimal-shared/utils';

import { useKanbanActions } from '../context/actions-context';
import { useBoard } from '../context/board-context';

import { kanbanClasses } from '../classes';
import { KanbanDetails } from '../details/kanban-details';
import { useTaskItemDnd } from '../hooks/use-task-item-dnd';
import { getAttr, isSafari, taskMotionOptions } from '../utils/helpers';
import {
  ItemRoot,
  ItemInfo,
  ItemName,
  ItemImage,
  ItemStatus,
  ItemContent,
  ItemPreview,
  DropIndicator,
} from './styles';

// ----------------------------------------------------------------------

const renderDropIndicator = (state, closestEdge) =>
  state.type === kanbanClasses.state.taskOver && state.closestEdge === closestEdge ? (
    <DropIndicator sx={{ height: state.dragRect.height }} />
  ) : null;

const renderTaskPreview = (state, task) =>
  state.type === kanbanClasses.state.preview
    ? createPortal(
        <ItemPreview
          sx={{
            width: state.dragRect.width,
            ...(!isSafari() && { borderRadius: 'var(--kanban-item-radius)' }),
          }}
        >
          <ItemStatus status={task.priority} />
          <ItemName name={task.name} />
        </ItemPreview>,
        state.container
      )
    : null;

// ----------------------------------------------------------------------

export function KanbanTaskItem({ task, columnId, sx, ...other }) {
  const taskDetailsDialog = useBoolean();
  const { taskRef, state } = useTaskItemDnd(task, columnId);
  const { deleteTask, updateTask, moveTask } = useKanbanActions();
  const { columns, tasks: boardTasks } = useBoard();

  const handleDeleteTask = useCallback(async () => {
    try {
      deleteTask(columnId, task.id);
      toast.success('Delete success!', { position: 'top-center' });
    } catch (error) {
      console.error(error);
    }
  }, [columnId, task.id]);

  const handleUpdateTask = useCallback(
    async (taskData) => {
      try {
        updateTask(columnId, taskData);
      } catch (error) {
        console.error(error);
      }
    },
    [columnId]
  );

  // Move this task to a different column by rebuilding the full task map.
  const handleMoveToColumn = useCallback(
    (targetColumnId) => {
      if (targetColumnId === columnId) return;
      const newTasks = {};
      // Copy all columns, removing the task from its current column and
      // prepending it to the target column.
      Object.keys(boardTasks).forEach((colId) => {
        newTasks[colId] = (boardTasks[colId] || []).filter((t) => t.id !== task.id);
      });
      newTasks[targetColumnId] = [
        { ...task, stageId: targetColumnId },
        ...(newTasks[targetColumnId] || []),
      ];
      moveTask(newTasks);
    },
    [columnId, task, boardTasks, moveTask]
  );

  const renderTaskDetailsDialog = () => (
    <KanbanDetails
      task={task}
      open={taskDetailsDialog.value}
      onClose={taskDetailsDialog.onFalse}
      onUpdateTask={handleUpdateTask}
      onDeleteTask={handleDeleteTask}
      columns={columns}
      currentColumnId={columnId}
      onMoveToColumn={handleMoveToColumn}
    />
  );

  const renderTaskDisplay = () => (
    <ItemRoot
      ref={taskRef}
      {...taskMotionOptions(task.id)}
      {...{
        [getAttr('dataTaskId')]: task.id,
      }}
      data-priority={task.priority || 'low'}
      className={mergeClasses([kanbanClasses.item.root], {
        [kanbanClasses.state.dragging]: state.type === kanbanClasses.state.dragging,
        [kanbanClasses.state.draggingAndLeftSelf]:
          state.type === kanbanClasses.state.draggingAndLeftSelf,
        [kanbanClasses.state.openDetails]: taskDetailsDialog.value,
      })}
      sx={sx}
      onClick={taskDetailsDialog.onTrue}
      {...other}
    >
      <ItemImage attachments={task.attachments} />
      <ItemContent>
        <ItemStatus status={task.priority} />
        <ItemName name={task.name} />
        <ItemInfo
          comments={task.comments}
          assignee={task.assignee}
          attachments={task.attachments}
        />
      </ItemContent>
    </ItemRoot>
  );

  return (
    <>
      {renderDropIndicator(state, 'top')}
      {renderTaskDisplay()}
      {renderDropIndicator(state, 'bottom')}
      {renderTaskPreview(state, task)}

      {renderTaskDetailsDialog()}
    </>
  );
}
