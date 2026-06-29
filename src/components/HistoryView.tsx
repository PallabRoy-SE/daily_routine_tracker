import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTaskLogs } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, CheckCircle2, Circle } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: number;
}

interface TaskLog {
  id: string;
  task_id: string;
  target_date: string;
  is_completed: boolean;
  task: Task;
}

const HistoryView = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: logs, isLoading, isError } = useQuery<TaskLog[]>({
    queryKey: ['taskLogs', selectedDate],
    queryFn: () => fetchTaskLogs(selectedDate),
  });

  const priorityColors = {
    3: 'text-rose-500 bg-rose-50 border-rose-100',
    2: 'text-amber-500 bg-amber-50 border-amber-100',
    1: 'text-emerald-500 bg-emerald-50 border-emerald-100',
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
            <Calendar size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">Mission History</h2>
            <p className="text-sm text-gray-500">Review your past performance</p>
          </div>
        </div>
        
        <div className="relative w-full sm:w-auto">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full sm:w-auto bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2.5 text-gray-900 font-bold focus:border-blue-500 focus:ring-0 outline-none transition-all cursor-pointer"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            <div className="col-span-full py-20 text-center text-gray-400 animate-pulse font-medium">
              Scanning historical archives...
            </div>
          ) : isError ? (
            <div className="col-span-full py-20 text-center text-red-500 font-medium bg-red-50 rounded-2xl border-2 border-red-100">
              Error retrieving mission data for this date.
            </div>
          ) : logs && logs.length > 0 ? (
            logs.map((log) => (
              <motion.div
                layout
                key={log.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-5 rounded-2xl border-2 transition-all ${
                  log.is_completed 
                    ? 'bg-blue-50 border-blue-100' 
                    : 'bg-white border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                    priorityColors[log.task.priority as keyof typeof priorityColors]
                  }`}>
                    Priority {log.task.priority}
                  </div>
                  {log.is_completed ? (
                    <CheckCircle2 className="text-blue-500" size={20} />
                  ) : (
                    <Circle className="text-gray-300" size={20} />
                  )}
                </div>
                
                <h3 className={`font-bold text-gray-800 text-lg leading-tight ${log.is_completed ? 'line-through opacity-60' : ''}`}>
                  {log.task.title}
                </h3>
                
                {log.task.description && (
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2 italic">
                    "{log.task.description}"
                  </p>
                )}

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase ${log.is_completed ? 'text-blue-600' : 'text-gray-400'}`}>
                    {log.is_completed ? 'Mission Accomplished' : 'Mission Failed/Skipped'}
                  </span>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl">
              <div className="text-4xl mb-4 opacity-20">📭</div>
              <p className="text-gray-400 font-medium italic">No mission logs found for this date.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HistoryView;
