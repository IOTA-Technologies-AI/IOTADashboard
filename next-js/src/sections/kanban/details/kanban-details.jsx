import dayjs from 'dayjs';
import { useState, useCallback } from 'react';
import { varAlpha } from 'minimal-shared/utils';
import { useTabs, useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import FormGroup from '@mui/material/FormGroup';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { useDateRangePicker, CustomDateRangePicker } from 'src/components/custom-date-range-picker';
import { fDateTime } from 'src/utils/format-time';

import { KanbanDetailsToolbar } from './kanban-details-toolbar';
import { KanbanInputName } from '../components/kanban-input-name';
import { KanbanDetailsPriority } from './kanban-details-priority';
import { KanbanDetailsAttachments } from './kanban-details-attachments';
import { KanbanDetailsCommentList } from './kanban-details-comment-list';
import { KanbanDetailsCommentInput } from './kanban-details-comment-input';
import { KanbanContactsDialog } from '../components/kanban-contacts-dialog';
import {
  createReminder,
  createSubtask,
  deleteReminder,
  deleteSubtask,
  updateReminder,
  updateSubtask,
  useGetReminders,
  useGetSubtasks,
} from 'src/actions/todo';

// ----------------------------------------------------------------------

const BlockLabel = styled('span')(({ theme }) => ({
  ...theme.typography.caption,
  width: 100,
  flexShrink: 0,
  color: theme.vars.palette.text.secondary,
  fontWeight: theme.typography.fontWeightSemiBold,
}));

// ----------------------------------------------------------------------

export function KanbanDetails({ task, open, onUpdateTask, onDeleteTask, onClose }) {
  const tabs = useTabs('overview');

  const likeToggle = useBoolean();
  const contactsDialog = useBoolean();

  const [taskName, setTaskName] = useState(task.name);
  const [priority, setPriority] = useState(task.priority);
  const [taskDescription, setTaskDescription] = useState(task.description);
  const [assignees, setAssignees] = useState(task.assignee || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newReminderAt, setNewReminderAt] = useState(
    dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm')
  );
  const [newReminderChannel, setNewReminderChannel] = useState('email');
  const [newReminderEmail, setNewReminderEmail] = useState(task.assignee?.[0]?.email || '');

  const { subtasks, subtasksLoading, subtasksError } = useGetSubtasks(task.id);
  const { reminders, remindersLoading, remindersError } = useGetReminders(task.id);

  const rangePicker = useDateRangePicker(dayjs(task.due[0]), dayjs(task.due[1]));

  const handleChangeTaskName = useCallback((event) => {
    setTaskName(event.target.value);
  }, []);

  const handleUpdateTask = useCallback(
    (event) => {
      try {
        if (event.key === 'Enter') {
          if (taskName) {
            onUpdateTask({ ...task, name: taskName });
          }
        }
      } catch (error) {
        console.error(error);
      }
    },
    [onUpdateTask, task, taskName]
  );

  const handleChangeTaskDescription = useCallback((event) => {
    setTaskDescription(event.target.value);
  }, []);

  const handleChangePriority = useCallback((newValue) => {
    setPriority(newValue);
  }, []);

  const handleClickSubtaskComplete = useCallback(
    async (subtask) => {
      try {
        await updateSubtask(task.id, subtask.id, { isDone: !subtask.isDone });
      } catch (error) {
        console.error('toggle subtask failed', error);
      }
    },
    [task.id]
  );

  const handleDeleteSubtask = useCallback(
    async (subtaskId) => {
      try {
        await deleteSubtask(task.id, subtaskId);
      } catch (error) {
        console.error('delete subtask failed', error);
      }
    },
    [task.id]
  );

  const handleAddSubtask = useCallback(async () => {
    const title = newSubtaskTitle.trim();
    if (!title) return;
    try {
      await createSubtask(task.id, title);
      setNewSubtaskTitle('');
    } catch (error) {
      console.error('create subtask failed', error);
    }
  }, [newSubtaskTitle, task.id]);

  const handleToggleAssignee = useCallback(
    (contact) => {
      setAssignees((prev) => {
        const exists = prev.some((item) => item.id === contact.id);
        const nextAssignees = exists
          ? prev.filter((item) => item.id !== contact.id)
          : [...prev, { ...contact }];

        onUpdateTask?.({ ...task, assignee: nextAssignees });
        return nextAssignees;
      });
    },
    [onUpdateTask, task]
  );

  const renderToolbar = () => (
    <KanbanDetailsToolbar
      taskName={task.name}
      onDelete={onDeleteTask}
      taskStatus={task.status}
      liked={likeToggle.value}
      onCloseDetails={onClose}
      onLikeToggle={likeToggle.onToggle}
    />
  );

  const renderTabs = () => (
    <Tabs
      value={tabs.value}
      onChange={tabs.onChange}
      variant="fullWidth"
      indicatorColor="custom"
      sx={{ '--item-padding-x': 0 }}
    >
      {[
        { value: 'overview', label: 'Overview' },
        { value: 'subTasks', label: 'Subtasks' },
        { value: 'reminders', label: 'Reminders' },
        { value: 'comments', label: `Comments (${task.comments.length})` },
      ].map((tab) => (
        <Tab key={tab.value} value={tab.value} label={tab.label} />
      ))}
    </Tabs>
  );

  const renderTabOverview = () => (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      {/* Task name */}
      <KanbanInputName
        placeholder="Task name"
        value={taskName}
        onChange={handleChangeTaskName}
        onKeyUp={handleUpdateTask}
        inputProps={{ id: `${taskName}-task-input` }}
      />

      {/* Reporter */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <BlockLabel>Reporter</BlockLabel>
        <Avatar alt={task.reporter.name} src={task.reporter.avatarUrl} />
      </Box>

      {/* Assignee */}
      <Box sx={{ display: 'flex' }}>
        <BlockLabel sx={{ height: 40, lineHeight: '40px' }}>Assignee</BlockLabel>

        <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap' }}>
          {assignees.map((user) => (
            <Avatar key={user.id} alt={user.name} src={user.avatarUrl} />
          ))}

          <Tooltip title="Add assignee">
            <IconButton
              onClick={contactsDialog.onTrue}
              sx={[
                (theme) => ({
                  border: `dashed 1px ${theme.vars.palette.divider}`,
                  bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
                }),
              ]}
            >
              <Iconify icon="mingcute:add-line" />
            </IconButton>
          </Tooltip>

          <KanbanContactsDialog
            assignee={assignees}
            open={contactsDialog.value}
            onClose={contactsDialog.onFalse}
            onSelect={handleToggleAssignee}
          />
        </Box>
      </Box>

      {/* Label */}
      <Box sx={{ display: 'flex' }}>
        <BlockLabel sx={{ height: 24, lineHeight: '24px' }}>Labels</BlockLabel>

        {!!task.labels.length && (
          <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap' }}>
            {task.labels.map((label) => (
              <Chip key={label} color="info" label={label} size="small" variant="soft" />
            ))}
          </Box>
        )}
      </Box>

      {/* Due date */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <BlockLabel> Due date </BlockLabel>

        {rangePicker.selected ? (
          <Button size="small" onClick={rangePicker.onOpen}>
            {rangePicker.shortLabel}
          </Button>
        ) : (
          <Tooltip title="Add due date">
            <IconButton
              onClick={rangePicker.onOpen}
              sx={[
                (theme) => ({
                  border: `dashed 1px ${theme.vars.palette.divider}`,
                  bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
                }),
              ]}
            >
              <Iconify icon="mingcute:add-line" />
            </IconButton>
          </Tooltip>
        )}

        <CustomDateRangePicker
          variant="calendar"
          title="Choose due date"
          startDate={rangePicker.startDate}
          endDate={rangePicker.endDate}
          onChangeStartDate={rangePicker.onChangeStartDate}
          onChangeEndDate={rangePicker.onChangeEndDate}
          open={rangePicker.open}
          onClose={rangePicker.onClose}
          selected={rangePicker.selected}
          error={rangePicker.error}
        />
      </Box>

      {/* Priority */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <BlockLabel>Priority</BlockLabel>
        <KanbanDetailsPriority priority={priority} onChangePriority={handleChangePriority} />
      </Box>

      {/* Description */}
      <Box sx={{ display: 'flex' }}>
        <BlockLabel> Description </BlockLabel>
        <TextField
          fullWidth
          multiline
          size="small"
          minRows={4}
          value={taskDescription}
          onChange={handleChangeTaskDescription}
          slotProps={{ input: { sx: { typography: 'body2' } } }}
        />
      </Box>

      {/* Attachments */}
      <Box sx={{ display: 'flex' }}>
        <BlockLabel>Attachments</BlockLabel>
        <KanbanDetailsAttachments attachments={task.attachments} />
      </Box>
    </Box>
  );

  const renderTabSubtasks = () => (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      <div>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {subtasks.filter((s) => s.isDone).length} of {subtasks.length}
        </Typography>

        <LinearProgress
          variant="determinate"
          value={
            subtasks.length ? (subtasks.filter((s) => s.isDone).length / subtasks.length) * 100 : 0
          }
        />
      </div>

      {subtasksLoading && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Loading subtasks...
        </Typography>
      )}

      {subtasksError && (
        <Typography variant="body2" sx={{ color: 'error.main' }}>
          Failed to load subtasks
        </Typography>
      )}

      {!subtasksLoading && !subtasks.length && !subtasksError && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          No subtasks yet.
        </Typography>
      )}

      {!!subtasks.length && (
        <FormGroup>
          {subtasks.map((taskItem) => (
            <FormControlLabel
              key={taskItem.id}
              control={
                <Checkbox
                  disableRipple
                  name={taskItem.title}
                  checked={taskItem.isDone}
                  onChange={() => handleClickSubtaskComplete(taskItem)}
                />
              }
              label={taskItem.title}
              slotProps={{ typography: { noWrap: true } }}
              onClick={(event) => event.stopPropagation()}
              onChange={() => handleClickSubtaskComplete(taskItem)}
              secondaryAction={
                <IconButton size="small" onClick={() => handleDeleteSubtask(taskItem.id)}>
                  <Iconify icon="solar:trash-bin-trash-bold" />
                </IconButton>
              }
            />
          ))}
        </FormGroup>
      )}

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          size="small"
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          placeholder="New subtask"
        />
        <Button
          variant="outlined"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={handleAddSubtask}
          disabled={!newSubtaskTitle.trim()}
          sx={{ alignSelf: 'flex-start' }}
        >
          Add subtask
        </Button>
      </Box>
    </Box>
  );

  const renderTabReminders = () => (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      {remindersLoading && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Loading reminders...
        </Typography>
      )}

      {remindersError && (
        <Typography variant="body2" sx={{ color: 'error.main' }}>
          Failed to load reminders
        </Typography>
      )}

      {!remindersLoading && !reminders.length && !remindersError && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          No reminders yet.
        </Typography>
      )}

      {!!reminders.length && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {reminders.map((reminder) => {
            const statusColor =
              reminder.status === 'sent'
                ? 'success'
                : reminder.status === 'failed'
                  ? 'error'
                  : reminder.status === 'cancelled'
                    ? 'warning'
                    : 'info';

            return (
              <Box
                key={reminder.id}
                sx={{
                  gap: 1,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: (theme) => `1px solid ${theme.vars.palette.divider}`,
                  p: 1.5,
                  borderRadius: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="subtitle2">
                    {reminder.channel.toUpperCase()} • {fDateTime(reminder.triggerAt)}
                  </Typography>
                  {reminder.assigneeEmail && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      To: {reminder.assigneeEmail}
                    </Typography>
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip size="small" color={statusColor} label={reminder.status} />

                  {reminder.status === 'pending' && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={async () => {
                        try {
                          await updateReminder(task.id, reminder.id, {
                            status: 'sent',
                            sentAt: new Date().toISOString(),
                          });
                        } catch (error) {
                          console.error('mark reminder sent failed', error);
                        }
                      }}
                    >
                      Mark sent
                    </Button>
                  )}

                  <IconButton
                    size="small"
                    onClick={async () => {
                      try {
                        await deleteReminder(task.id, reminder.id);
                      } catch (error) {
                        console.error('delete reminder failed', error);
                      }
                    }}
                  >
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="subtitle2">New reminder</Typography>

        <TextField
          fullWidth
          size="small"
          label="Trigger at"
          type="datetime-local"
          value={newReminderAt}
          onChange={(e) => setNewReminderAt(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          select
          size="small"
          label="Channel"
          value={newReminderChannel}
          onChange={(e) => setNewReminderChannel(e.target.value)}
        >
          <MenuItem value="email">Email</MenuItem>
          <MenuItem value="web">Web</MenuItem>
        </TextField>

        {newReminderChannel === 'email' && (
          <TextField
            fullWidth
            size="small"
            label="Recipient email"
            value={newReminderEmail}
            onChange={(e) => setNewReminderEmail(e.target.value)}
            placeholder="user@example.com"
          />
        )}

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:notification-line" />}
            onClick={async () => {
              const triggerAtIso = dayjs(newReminderAt).isValid()
                ? dayjs(newReminderAt).toISOString()
                : '';

              if (!triggerAtIso) return;

              try {
                await createReminder({
                  taskId: task.id,
                  triggerAt: triggerAtIso,
                  channel: newReminderChannel,
                  assigneeEmail: newReminderChannel === 'email' ? newReminderEmail || null : null,
                });
              } catch (error) {
                console.error('create reminder failed', error);
              }
            }}
            disabled={!newReminderAt || (newReminderChannel === 'email' && !newReminderEmail)}
          >
            Schedule reminder
          </Button>
          <Button
            variant="text"
            onClick={() => {
              setNewReminderAt(dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'));
              setNewReminderChannel('email');
              setNewReminderEmail(task.assignee?.[0]?.email || '');
            }}
          >
            Reset
          </Button>
        </Box>
      </Box>
    </Box>
  );

  const renderTabComments = () =>
    !!task.comments.length && <KanbanDetailsCommentList comments={task.comments} />;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      aria-hidden={!open}
      anchor="right"
      slotProps={{
        backdrop: { invisible: true },
        paper: { sx: { width: { xs: 1, sm: 480 } } },
      }}
    >
      {renderToolbar()}
      {renderTabs()}

      <Scrollbar fillContent sx={{ py: 3, px: 2.5 }}>
        {tabs.value === 'overview' && renderTabOverview()}
        {tabs.value === 'subTasks' && renderTabSubtasks()}
        {tabs.value === 'reminders' && renderTabReminders()}
        {tabs.value === 'comments' && renderTabComments()}
      </Scrollbar>

      {tabs.value === 'comments' && <KanbanDetailsCommentInput />}
    </Drawer>
  );
}
