import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTasks, completeTask, editTask, deleteTask, createTask, fetchUpcomingTasks } from '../services/api';
import { Plus } from 'lucide-react';
import TaskModal from './TaskModal';
import TaskItem from './TaskItem';
import { AnimatePresence } from 'framer-motion';
import { useTimerContext } from '../context/TimerContext';

interface TaskLink {
  url: string;
  label: string;
  action: 'new_tab' | 'download' | 'internal_link';
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  is_completed: boolean;
  time_limit: number | null;
  links: TaskLink[];
  scheduled_date: string;
}

const TaskBoard = () => {
  const queryClient = useQueryClient();
  const { deleteTimer } = useTimerContext();
  const [activeTab, setActiveTab] = useState<'daily' | 'upcoming'>('daily');
  const [activeXpPop, setActiveXpPop] = useState<{ id: string; xp: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Listen to Floating Action Button event
  useEffect(() => {
    const handleOpenCreateEvent = () => {
      setSelectedTask(null);
      setIsModalOpen(true);
    };
    window.addEventListener('open-create-task', handleOpenCreateEvent);
    return () => {
      window.removeEventListener('open-create-task', handleOpenCreateEvent);
    };
  }, []);

  const { data: tasks, isLoading: isDailyLoading, isError: isDailyError } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
  });

  const { data: upcomingTasks, isLoading: isUpcomingLoading, isError: isUpcomingError } = useQuery<Task[]>({
    queryKey: ['upcomingTasks'],
    queryFn: fetchUpcomingTasks,
  });

  const completeMutation = useMutation({
    mutationFn: (task: Task) => completeTask(task.id),
    onSuccess: (_, task) => {
      const xpValue = task.priority * 10;
      setActiveXpPop({ id: task.id, xp: xpValue });
      setTimeout(() => setActiveXpPop(null), 1000);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingTasks'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
      queryClient.invalidateQueries({ queryKey: ['dailyHistory'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: (_, taskId) => {
      deleteTimer(taskId);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dailyHistory'] });
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
      queryClient.invalidateQueries({ queryKey: ['upcomingTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dailyHistory'] });
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

  // Group daily tasks by priority (3: High, 2: Med, 1: Low)
  const groupedTasks = useMemo(() => ({
    High: tasks?.filter(t => t.priority === 3) || [],
    Medium: tasks?.filter(t => t.priority === 2) || [],
    Low: tasks?.filter(t => t.priority === 1) || [],
  }), [tasks]);

  // Sort upcoming tasks chronologically, then by priority
  const sortedUpcomingTasks = useMemo(() => {
    if (!upcomingTasks) return [];
    return [...upcomingTasks].sort((a, b) => {
      const dateDiff = a.scheduled_date.localeCompare(b.scheduled_date);
      if (dateDiff !== 0) return dateDiff;
      return b.priority - a.priority;
    });
  }, [upcomingTasks]);

  const isLoading = isDailyLoading || isUpcomingLoading;
  const isError = isDailyError || isUpcomingError;

  if (isLoading) return <div className="text-center py-10 text-gray-400 dark:text-gray-550 font-medium">Loading your routine...</div>;
  if (isError) return <div className="text-center py-10 text-red-500 dark:text-red-400 font-medium">Failed to load tasks.</div>;

  const priorityColors = {
    High: 'text-rose-500 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30',
    Medium: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30',
    Low: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30',
  };

  return (
    <div className="space-y-8">
      {/* Header Tabs Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200/50 dark:border-[#2D2D2D]/60 pb-4">
        <div className="flex gap-6 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('daily')}
            className={`text-lg font-bold pb-2 border-b-4 transition-all duration-200 ${
              activeTab === 'daily'
                ? 'border-blue-600 text-blue-600 dark:text-[#00E5FF] dark:border-[#00E5FF]'
                : 'border-transparent text-gray-400 hover:text-gray-650 dark:text-gray-500 dark:hover:text-gray-300'
            }`}
          >
            Daily Missions
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`text-lg font-bold pb-2 border-b-4 transition-all duration-200 ${
              activeTab === 'upcoming'
                ? 'border-blue-600 text-blue-600 dark:text-[#00E5FF] dark:border-[#00E5FF]'
                : 'border-transparent text-gray-400 hover:text-gray-650 dark:text-gray-500 dark:hover:text-gray-300'
            }`}
          >
            Upcoming Missions
          </button>
        </div>

        <button
          onClick={handleOpenCreate}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-2xl font-extrabold text-xs uppercase tracking-wider hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-200/30 dark:shadow-none transition-all active:scale-95 cursor-pointer"
        >
          <Plus size={16} />
          Add New Mission
        </button>
      </div>

      {activeTab === 'daily' ? (
        /* Daily Missions Column View */
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
                    <div className="py-8 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl text-gray-300 dark:text-gray-600 text-sm italic">
                      No tasks found
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Upcoming Missions Chronological Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {sortedUpcomingTasks.length > 0 ? (
              sortedUpcomingTasks.map((task) => (
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
              <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-100 dark:border-gray-850 rounded-3xl text-gray-400 dark:text-gray-500 font-medium italic">
                No upcoming missions scheduled
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

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
