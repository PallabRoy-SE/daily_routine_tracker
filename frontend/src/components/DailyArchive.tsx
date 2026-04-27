import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDailyHistory } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Archive } from 'lucide-react';
import { format } from 'date-fns';

interface TaskHistory {
  id: number;
  title: string;
  is_completed_on_date: boolean;
  priority: number;
}

const DailyArchive = () => {
  // Initialize strictly with HTML5 yyyy-MM-dd format using local time
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: history, isLoading, isError } = useQuery<TaskHistory[]>({
    queryKey: ['dailyHistory', selectedDate],
    queryFn: () => fetchDailyHistory(selectedDate),
    enabled: !!selectedDate, 
  });

  return (
    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative z-10">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 p-2 rounded-xl text-gray-600">
            <Archive size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">Mission Archives</h2>
            <p className="text-sm text-gray-500 font-medium">Verify historical mission logs</p>
          </div>
        </div>

        <div className="relative">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="block w-full sm:w-auto bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2 text-gray-900 font-bold focus:border-blue-500 outline-none transition-all cursor-pointer text-sm hover:bg-gray-100"
          />
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="py-12 text-center text-gray-400 italic text-sm"
            >
              Accessing encrypted archives...
            </motion.div>
          ) : isError ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="py-12 text-center text-red-400 font-medium text-sm"
            >
              Failed to retrieve historical intelligence.
            </motion.div>
          ) : (
            <motion.div 
              key="content"
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="divide-y divide-gray-50"
            >
              {history && history.length > 0 ? (
                history.map((task) => (
                  <div key={task.id} className="py-3 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className={`w-1 h-6 rounded-full ${
                        task.priority === 3 ? 'bg-rose-400' :
                        task.priority === 2 ? 'bg-amber-400' :
                        'bg-emerald-400'
                      }`} />
                      <span className={`text-sm font-semibold tracking-tight ${task.is_completed_on_date ? 'text-gray-500' : 'text-gray-800'}`}>
                        {task.title}
                      </span>
                    </div>
                    
                    {task.is_completed_on_date ? (
                      <div className="flex items-center gap-2 text-emerald-500 bg-emerald-50 px-3 py-1 rounded-lg">
                        <span className="text-[10px] font-black uppercase tracking-widest">Success</span>
                        <CheckCircle2 size={16} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-300 bg-gray-50 px-3 py-1 rounded-lg">
                        <span className="text-[10px] font-black uppercase tracking-widest">Failed</span>
                        <XCircle size={16} />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-gray-300 italic text-sm">
                  No mission records for this chronological point.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DailyArchive;
