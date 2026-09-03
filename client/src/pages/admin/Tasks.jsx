import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  Badge,
  Input,
  Select,
  Modal,
  PageHeader,
  EmptyState
} from '../../components/ui';
import { formatDate, todayISO } from '../../lib/utils';
import { Plus, CheckCircle2, Trash2 } from 'lucide-react';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Pending');
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('Reception');
  const [due, setDue] = useState(todayISO());

  const assignees = ['Reception', 'Front Desk', 'Dr. Ananya', 'Dr. Vikram', 'Dr. Meera', 'Admin'];

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await api.get('/tasks');
      setTasks(data || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const openModal = () => {
    setTitle('');
    setAssignee('Reception');
    setDue(todayISO());
    setModalOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title) return;

    try {
      await api.post('/tasks', {
        title,
        assignee,
        due,
        status: 'pending'
      });
      setModalOpen(false);
      fetchTasks();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleToggleTask = async (task) => {
    const nextStatus = task.status === 'pending' ? 'completed' : 'pending';
    try {
      await api.put(`/tasks/${task.id}`, { status: nextStatus });
      fetchTasks();
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.del(`/tasks/${id}`);
      fetchTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const today = todayISO();

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'Pending') return t.status === 'pending';
    if (filter === 'Completed') return t.status === 'completed';
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        subtitle={`${pendingCount} pending`}
        actions={
          <Button onClick={openModal}>
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-2 border-b pb-3">
        {['Pending', 'Completed', 'All'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              filter === tab
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading…</div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState title="No tasks found" subtitle="No tasks match the selected filter." />
      ) : (
        <Card className="divide-y overflow-hidden">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isOverdue = !isCompleted && task.due && task.due < today;

            return (
              <div
                key={task.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => handleToggleTask(task)}
                    className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                      isCompleted
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input hover:border-primary'
                    }`}
                  >
                    {isCompleted && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                  <span
                    className={`text-sm font-medium truncate ${
                      isCompleted ? 'line-through text-muted-foreground' : ''
                    }`}
                  >
                    {task.title}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {task.assignee}
                  </Badge>
                  <span
                    className={`text-xs ${
                      isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'
                    }`}
                  >
                    {formatDate(task.due)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(task.id)}
                    className="text-destructive hover:text-destructive h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* Add Task Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add New Task"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Save Task</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Task Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Call back Priya Sharma about teeth whitening"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Assignee</label>
            <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              {assignees.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <Input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
