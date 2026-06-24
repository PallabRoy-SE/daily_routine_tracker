import { useQuery } from '@tanstack/react-query';
import { ActivityCalendar } from 'react-activity-calendar';
import { fetchHeatmapData } from '../services/api';
import { Activity } from 'lucide-react';

interface HeatmapData {
  date: string;
  count: number;
}

const RoutineHeatmap = () => {
  const { data, isLoading, isError } = useQuery<HeatmapData[]>({
    queryKey: ['heatmapData'],
    queryFn: fetchHeatmapData,
  });

  if (isLoading) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm animate-pulse">
        <div className="h-6 w-48 bg-gray-100 rounded mb-6"></div>
        <div className="h-32 w-full bg-gray-50 rounded"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-red-500 text-sm font-medium">
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
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
            <Activity size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">Annual Routine Consistency</h2>
            <p className="text-sm text-gray-500 font-medium tracking-tight">Your daily mission achievement velocity</p>
          </div>
        </div>
        <div className="py-12 flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-2xl p-6 text-center">
          <span className="text-3xl mb-2" role="img" aria-label="empty calendar">📅</span>
          <p className="text-sm font-bold text-gray-700">No activity recorded yet</p>
          <p className="text-xs text-gray-400 mt-1">Start completing daily tasks to populate your annual consistency calendar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
          <Activity size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">Annual Routine Consistency</h2>
          <p className="text-sm text-gray-500 font-medium tracking-tight">Your daily mission achievement velocity</p>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <ActivityCalendar 
          data={activities} 
          theme={{
            light: ['#f0fdf4', '#6ee7b7', '#10b981', '#059669', '#064e3b'],
            dark: ['#f0fdf4', '#6ee7b7', '#10b981', '#059669', '#064e3b'], // Simplified for now
          }}
          labels={{
            totalCount: '{{count}} missions completed in the last year',
          }}
          fontSize={12}
          blockSize={12}
          blockMargin={4}
          showWeekdayLabels
        />
      </div>
      
      <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
        <span>Historical Archive Alpha</span>
        <div className="flex items-center gap-2">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#f0fdf4]" />
            <div className="w-2.5 h-2.5 rounded-sm bg-[#6ee7b7]" />
            <div className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" />
            <div className="w-2.5 h-2.5 rounded-sm bg-[#059669]" />
            <div className="w-2.5 h-2.5 rounded-sm bg-[#064e3b]" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
};

export default RoutineHeatmap;
