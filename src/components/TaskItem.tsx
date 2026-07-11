import { useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, Play, Pause, RotateCcw, Clock, AlertCircle } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
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

interface TaskItemProps {
  task: Task;
  onComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  completePending: boolean;
  activeXpPop: { id: string; xp: number } | null;
}

const XpPop = ({ xp }: { xp: number }) => (
  <motion.span
    initial={{ opacity: 0, y: 0, scale: 0.5 }}
    animate={{ opacity: 1, y: -40, scale: 1.2 }}
    exit={{ opacity: 0 }}
    className="absolute -top-6 left-0 text-blue-600 font-black text-sm z-50 pointer-events-none"
  >
    +{xp} XP
  </motion.span>
);

const TaskItem = forwardRef<HTMLDivElement, TaskItemProps>(({
  task,
  onComplete,
  onEdit,
  onDelete,
  completePending,
  activeXpPop,
}, ref) => {
  const { theme } = useTheme();
  const { timers, startTimer, pauseTimer, resetTimer, initializeTimer } = useTimerContext();
  const timer = timers[task.id];

  // Initialize the timer state if time_limit exists
  useEffect(() => {
    if (task.time_limit !== null && task.time_limit !== undefined) {
      initializeTimer(task.id, task.time_limit);
    }
  }, [task.id, task.time_limit, initializeTimer]);

  // Pause the timer automatically if the task is completed
  useEffect(() => {
    if (task.is_completed && timer?.isRunning) {
      pauseTimer(task.id);
    }
  }, [task.is_completed, timer?.isRunning, task.id, pauseTimer]);

  const isActive = timer?.isRunning ?? false;

  const getSecondsRemaining = () => {
    if (!timer) {
      return task.time_limit ? task.time_limit * 60 : null;
    }
    if (timer.isRunning && timer.startedAt !== null) {
      const elapsed = Math.floor((Date.now() - timer.startedAt) / 1000);
      return Math.max(0, timer.initialSecondsRemaining - elapsed);
    }
    return timer.secondsRemaining;
  };

  const secondsRemaining = getSecondsRemaining();

  const toggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActive) {
      pauseTimer(task.id);
    } else {
      startTimer(task.id);
    }
  };

  const handleResetTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.time_limit) {
      resetTimer(task.id, task.time_limit);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isExpired = secondsRemaining === 0;

  // Percentage of progress for visual ring or bar
  const progressPercent = task.time_limit && secondsRemaining !== null
    ? (secondsRemaining / (task.time_limit * 60)) * 100
    : 100;

  // Theme-aware Framer Motion colors
  const isDark = theme === 'dark';
  const motionBg = task.is_completed
    ? (isDark ? 'rgba(30, 30, 30, 0.5)' : 'rgba(248, 249, 250, 0.6)')
    : isExpired
      ? (isDark ? 'rgba(220, 38, 38, 0.08)' : 'rgba(254, 242, 242, 1)')
      : (isDark ? 'rgba(30, 30, 30, 1)' : 'rgba(248, 249, 250, 1)');

  const motionBorder = task.is_completed
    ? (isDark ? 'rgba(45, 45, 45, 0.6)' : 'rgba(229, 231, 235, 0.4)')
    : isExpired
      ? (isDark ? 'rgba(248, 113, 113, 0.4)' : 'rgba(252, 165, 165, 0.8)')
      : isActive
        ? (isDark ? 'rgba(0, 229, 255, 0.8)' : 'rgba(59, 130, 246, 0.8)')
        : (isDark ? 'rgba(45, 45, 45, 0.8)' : 'rgba(229, 231, 235, 0.6)');


  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: task.is_completed ? 0.98 : 1,
        backgroundColor: motionBg,
        borderColor: motionBorder
      }}
      whileTap={{ scale: 0.97 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`p-4 rounded-2xl border-2 transition-all duration-200 ${task.is_completed
        ? 'opacity-60'
        : 'shadow-sm hover:shadow-md'
        }`}
    >
      <div className="flex items-start gap-3 relative">
        {/* Complete Checkbox */}
        <div className="relative">
          <button
            onClick={() => !task.is_completed && onComplete(task)}
            disabled={task.is_completed || completePending}
            className={`mt-1.5 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all ${task.is_completed
              ? 'bg-blue-500 border-blue-500 text-white scale-110'
              : isExpired
                ? 'border-red-400 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30'
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

        {/* Task Body */}
        <div className="flex-1 min-w-0">
          <div className="group flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <h3 className={`font-bold text-gray-800 dark:text-gray-200 transition-all ${task.is_completed ? 'line-through text-gray-400 dark:text-gray-600' : ''
                }`}>
                {task.title}
              </h3>
              {task.scheduled_date && task.scheduled_date > new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0] && (
                <span className="inline-block bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-lg w-fit">
                  📅 Scheduled: {task.scheduled_date}
                </span>
              )}
            </div>

            {/* Actions (Edit / Delete) */}
            {!task.is_completed && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(task);
                  }}
                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Delete this task?')) {
                      onDelete(task.id);
                    }
                  }}
                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>

          {task.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{task.description}</p>
          )}

          {/* Links */}
          {task.links && task.links.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {task.links.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target={link.action === 'new_tab' ? '_blank' : undefined}
                  rel={link.action === 'new_tab' ? 'noopener noreferrer' : undefined}
                  download={link.action === 'download'}
                  className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded uppercase tracking-tighter hover:bg-blue-100 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}

          {/* Interactive Countdown Timer */}
          {task.time_limit !== null && secondsRemaining !== null && (
            <div className="mt-4 pt-3 border-t border-gray-100/50 dark:border-gray-700/50 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <Clock size={14} className={isActive ? "text-blue-500 animate-pulse" : ""} />
                  {isExpired ? (
                    <span className="text-red-500 dark:text-red-400 flex items-center gap-1 font-bold">
                      <AlertCircle size={12} />
                      Time's Up!
                    </span>
                  ) : (
                    <span>
                      {formatTime(secondsRemaining)} remaining
                    </span>
                  )}
                </div>

                {/* Timer Controls */}
                {!task.is_completed && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={toggleTimer}
                      disabled={isExpired}
                      className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${isExpired
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        : isActive
                          ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                          : 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                        }`}
                      title={isActive ? "Pause Timer" : "Start Timer"}
                    >
                      {isActive ? <Pause size={12} /> : <Play size={12} />}
                    </button>
                    <button
                      onClick={handleResetTimer}
                      className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
                      title="Reset Timer"
                    >
                      <RotateCcw size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {!task.is_completed && (
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{
                      width: `${progressPercent}%`,
                      backgroundColor: isExpired
                        ? 'rgb(239, 68, 68)'
                        : progressPercent < 20
                          ? 'rgb(245, 158, 11)'
                          : 'rgb(59, 130, 246)'
                    }}
                    transition={{ duration: 0.3 }}
                    className="h-full rounded-full"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export default TaskItem;
