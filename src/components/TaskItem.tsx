import { useState, useEffect, useRef, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, Play, Pause, RotateCcw, Clock, AlertCircle } from 'lucide-react';

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
  const [isActive, setIsActive] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(
    task.time_limit ? task.time_limit * 60 : null
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync remaining seconds if time_limit changes or task resets
  useEffect(() => {
    if (task.time_limit) {
      setSecondsRemaining(task.time_limit * 60);
    } else {
      setSecondsRemaining(null);
    }
    setIsActive(false);
  }, [task.time_limit, task.is_completed]);

  // Timer logic
  useEffect(() => {
    if (isActive && secondsRemaining !== null && secondsRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev !== null && prev > 1) {
            return prev - 1;
          }
          setIsActive(false);
          return 0;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, secondsRemaining]);

  const toggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsActive(!isActive);
  };

  const resetTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsActive(false);
    if (task.time_limit) {
      setSecondsRemaining(task.time_limit * 60);
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

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: task.is_completed ? 0.98 : 1,
        backgroundColor: task.is_completed 
          ? 'rgba(249, 250, 251, 1)' 
          : isExpired 
            ? 'rgba(254, 242, 242, 1)' // soft red background for expired tasks
            : 'rgba(255, 255, 255, 1)',
        borderColor: task.is_completed 
          ? 'rgba(229, 231, 235, 1)' 
          : isExpired 
            ? 'rgba(252, 165, 165, 1)' 
            : isActive 
              ? 'rgba(147, 197, 253, 1)' 
              : 'rgba(243, 244, 246, 1)'
      }}
      whileTap={{ scale: 0.97 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
        task.is_completed 
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
            className={`mt-1.5 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all ${
              task.is_completed
                ? 'bg-blue-500 border-blue-500 text-white scale-110'
                : isExpired
                  ? 'border-red-400 hover:border-blue-500 hover:bg-blue-50'
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

        {/* Task Body */}
        <div className="flex-1 min-w-0">
          <div className="group flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <h3 className={`font-bold text-gray-800 transition-all ${
                task.is_completed ? 'line-through text-gray-400' : ''
              }`}>
                {task.title}
              </h3>
              {task.scheduled_date && task.scheduled_date > new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0] && (
                <span className="inline-block bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-lg w-fit">
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
                  className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
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
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>

          {task.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
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
                  className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded uppercase tracking-tighter hover:bg-blue-100 hover:text-blue-600 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}

          {/* Interactive Countdown Timer */}
          {task.time_limit !== null && secondsRemaining !== null && (
            <div className="mt-4 pt-3 border-t border-gray-100/50 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                  <Clock size={14} className={isActive ? "text-blue-500 animate-pulse" : ""} />
                  {isExpired ? (
                    <span className="text-red-500 flex items-center gap-1 font-bold">
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
                      className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${
                        isExpired 
                          ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                          : isActive
                            ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                      title={isActive ? "Pause Timer" : "Start Timer"}
                    >
                      {isActive ? <Pause size={12} /> : <Play size={12} />}
                    </button>
                    <button
                      onClick={resetTimer}
                      className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-center"
                      title="Reset Timer"
                    >
                      <RotateCcw size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {!task.is_completed && (
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
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
