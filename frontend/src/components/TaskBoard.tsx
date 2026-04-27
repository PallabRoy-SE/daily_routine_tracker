import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTasks, completeTask, editTask, deleteTask, createTask } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, Plus } from 'lucide-react';
import TaskModal from './TaskModal';

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
  links: TaskLink[];
}

const XpPop = ({ xp }: { xp: number }) => (
  <motion.span
    initial={{ opacity: 0, y: 0, scale: 0.5 }}
    animate={{ opacity: 1, y: -40, scale: 1.2 }}
    exit={{ opacity: 0 }}
    className="absolute top-0 left-0 text-blue-600 font-black text-sm z-50 pointer-events-none"
  >
    +{xp} XP
  </motion.span>
);

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
                    <motion.div
                      layout
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        scale: task.is_completed ? 0.98 : 1,
                        backgroundColor: task.is_completed ? 'rgba(249, 250, 251, 1)' : 'rgba(255, 255, 255, 1)'
                      }}
                      whileTap={{ scale: 0.97 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`p-4 rounded-xl border transition-all duration-200 ${
                        task.is_completed 
                          ? 'border-gray-200 opacity-60' 
                          : 'border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-start gap-3 relative">
                        <div className="relative">
                          <button
                            onClick={() => !task.is_completed && completeMutation.mutate(task)}
                            disabled={task.is_completed || completeMutation.isPending}
                            className={`mt-1 h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                              task.is_completed 
                                ? 'bg-blue-500 border-blue-500 text-white scale-110' 
                                : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                            }`}
                          >
                            <AnimatePresence>
                              {task.is_completed && (
                                <motion.svg 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="h-3.5 w-3.5" 
                                  fill="none" 
                                  viewBox="0 0 24 24" 
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </motion.svg>
                              )}
                            </AnimatePresence>
                          </button>
                          
                          <AnimatePresence>
                            {activeXpPop?.id === task.id && (
                              <XpPop xp={activeXpPop.xp} />
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="flex-1">
                          <div className="group flex items-start justify-between gap-2">
                            <h3 className={`font-semibold text-gray-800 transition-all ${task.is_completed ? 'line-through text-gray-400' : ''}`}>
                              {task.title}
                            </h3>
                            {!task.is_completed && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <button 
                                  onClick={() => handleOpenEdit(task)}
                                  className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  onClick={() => window.confirm('Delete this task?') && deleteMutation.mutate(task.id)}
                                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
                          )}
                          
                          {task.links && task.links.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {task.links.map((link, idx) => (
                                <a
                                  key={idx}
                                  href={link.url}
                                  target={link.action === 'new_tab' ? '_blank' : undefined}
                                  rel={link.action === 'new_tab' ? 'noopener noreferrer' : undefined}
                                  download={link.action === 'download'}
                                  className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded uppercase tracking-tighter hover:bg-blue-100 hover:text-blue-600 transition-colors"
                                >
                                  {link.label}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
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
