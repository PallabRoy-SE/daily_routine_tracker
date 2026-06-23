import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTasks, completeTask, editTask, deleteTask, createTask } from '../services/api';
import { Plus } from 'lucide-react';
import TaskModal from './TaskModal';
import TaskItem from './TaskItem';
import { AnimatePresence } from 'framer-motion';

interface TaskLink {
  url: string;
  label: string;
  action: 'new_tab' | 'download' | 'internal_link';
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  priority: number;
  is_completed: boolean;
  time_limit: number | null;
  links: TaskLink[];
}

const TaskBoard = () => {
  const queryClient = useQueryClient();
  const [activeXpPop, setActiveXpPop] = useState<{ id: number; xp: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { data: tasks, isLoading, isError } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
  });

  const completeMutation = useMutation({
    mutationFn: (task: Task) => completeTask(task.id),
    onSuccess: (_, task) => {
      const xpValue = task.priority * 10;
      setActiveXpPop({ id: task.id, xp: xpValue });
      setTimeout(() => setActiveXpPop(null), 1000);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const taskMutation = useMutation({
    mutationFn: (data: any) => {
      if (selectedTask?.id) {
        return editTask(selectedTask.id, data);
      }
      return createTask(data);
    },
    onSuccess: () => {
      setIsModalOpen(false);
      setSelectedTask(null);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const handleOpenCreate = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleModalSubmit = (data: any) => {
    taskMutation.mutate(data);
  };

  // Group tasks by priority (3: High, 2: Med, 1: Low)
  const groupedTasks = useMemo(() => ({
    High: tasks?.filter(t => t.priority === 3) || [],
    Medium: tasks?.filter(t => t.priority === 2) || [],
    Low: tasks?.filter(t => t.priority === 1) || [],
  }), [tasks]);

  if (isLoading) return <div className="text-center py-10 text-gray-400 font-medium">Loading your routine...</div>;
  if (isError) return <div className="text-center py-10 text-red-500">Failed to load tasks.</div>;

  const priorityColors = {
    High: 'text-rose-500 bg-rose-50 border-rose-100',
    Medium: 'text-amber-500 bg-amber-50 border-amber-100',
    Low: 'text-emerald-500 bg-emerald-50 border-emerald-100',
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          <Plus size={20} />
          Add New Mission
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {(['High', 'Medium', 'Low'] as const).map((priority) => (
          <div key={priority} className="flex flex-col gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border w-fit text-xs font-bold uppercase tracking-wider ${priorityColors[priority]}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
              {priority} Priority
            </div>

            <div className="flex flex-col gap-3">
              <AnimatePresence mode="popLayout">
                {groupedTasks[priority].length > 0 ? (
                  groupedTasks[priority].map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onComplete={(t) => completeMutation.mutate(t)}
                      onEdit={handleOpenEdit}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      completePending={completeMutation.isPending}
                      activeXpPop={activeXpPop}
                    />
                  ))
                ) : (
                  <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-xl text-gray-300 text-sm italic">
                    No tasks found
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={selectedTask}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
};

export default TaskBoard;
