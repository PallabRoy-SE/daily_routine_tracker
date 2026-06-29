import { useQuery } from '@tanstack/react-query';
import { ActivityCalendar } from 'react-activity-calendar';
import { fetchHeatmapData } from '../services/api';
import { Activity } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface HeatmapData {
  date: string;
  count: number;
}

const RoutineHeatmap = () => {
  const { theme } = useTheme();
  const { data, isLoading, isError } = useQuery<HeatmapData[]>({
    queryKey: ['heatmapData'],
    queryFn: fetchHeatmapData,
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm animate-pulse">
        <div className="h-6 w-48 bg-gray-100 dark:bg-gray-700 rounded mb-6"></div>
        <div className="h-32 w-full bg-gray-50 dark:bg-gray-900 rounded"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 dark:bg-red-950/20 p-6 rounded-2xl border border-red-100 dark:border-red-900/30 text-red-500 dark:text-red-400 text-sm font-medium">
        Failed to load activity intelligence.
      </div>
    );
  }

  // Map count to level (0-4)
  const activities = data?.map(day => {
    let level = 0;
    if (day.count === 1) level = 1;
    else if (day.count === 2) level = 2;
    else if (day.count === 3) level = 3;
    else if (day.count > 3) level = 4;
    
    return {
      date: day.date,
      count: day.count,
      level: level as 0 | 1 | 2 | 3 | 4
    };
  }) || [];

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-emerald-100 dark:bg-emerald-950/30 p-2 rounded-xl text-emerald-600 dark:text-emerald-400">
            <Activity size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 tracking-tight">Annual Routine Consistency</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium tracking-tight">Your daily mission achievement velocity</p>
          </div>
        </div>
        <div className="py-12 flex flex-col items-center justify-center border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center">
          <span className="text-3xl mb-2" role="img" aria-label="empty calendar">📅</span>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No activity recorded yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Start completing daily tasks to populate your annual consistency calendar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-emerald-100 dark:bg-emerald-950/30 p-2 rounded-xl text-emerald-600 dark:text-emerald-400">
          <Activity size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 tracking-tight">Annual Routine Consistency</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium tracking-tight">Your daily mission achievement velocity</p>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <ActivityCalendar 
          data={activities} 
          theme={{
            light: ['#e2e8f0', '#6ee7b7', '#10b981', '#059669', '#064e3b'],
            dark: ['#1e293b', '#064e3b', '#059669', '#10b981', '#34d399'],
          }}
          colorScheme={theme}
          labels={{
            totalCount: '{{count}} missions completed in the last year',
          }}
          fontSize={12}
          blockSize={12}
          blockMargin={4}
          showWeekdayLabels
        />
      </div>
      
      <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-550">
        <span>Historical Archive Alpha</span>
        <div className="flex items-center gap-2">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#e2e8f0] dark:bg-[#1e293b]" />
            <div className="w-2.5 h-2.5 rounded-sm bg-[#6ee7b7] dark:bg-[#064e3b]" />
            <div className="w-2.5 h-2.5 rounded-sm bg-[#10b981] dark:bg-[#059669]" />
            <div className="w-2.5 h-2.5 rounded-sm bg-[#059669] dark:bg-[#10b981]" />
            <div className="w-2.5 h-2.5 rounded-sm bg-[#064e3b] dark:bg-[#34d399]" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
};

export default RoutineHeatmap;
