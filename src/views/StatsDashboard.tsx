import XPTrendChart from '../components/XPTrendChart';
import RoutineHeatmap from '../components/RoutineHeatmap';
import DailyArchive from '../components/DailyArchive';
import { BarChart3 } from 'lucide-react';

const StatsDashboard = () => {
  return (
    <div className="space-y-12 py-8">
      {/* View Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-100 dark:shadow-none">
          <BarChart3 size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Intelligence Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium tracking-tight">Advanced metrics and historical mission analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {/* Trend Chart: Full Width */}
        <section className="w-full">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-550">Progression Velocity</h3>
            <span className="h-px flex-1 bg-gray-100 dark:bg-gray-800 mx-6" />
          </div>
          <XPTrendChart />
        </section>

        {/* Heatmap: Centered below */}
        <section className="max-w-4xl mx-auto w-full">
          <div className="mb-6 flex items-center justify-between">
            <span className="h-px flex-1 bg-gray-100 dark:bg-gray-800 mr-6" />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-550">Routine Consistency</h3>
            <span className="h-px flex-1 bg-gray-100 dark:bg-gray-800 ml-6" />
          </div>
          <RoutineHeatmap />
        </section>

        {/* Daily Archive: Centered below heatmap */}
        <section className="max-w-4xl mx-auto w-full">
          <div className="mb-6 flex items-center justify-between">
            <span className="h-px flex-1 bg-gray-100 dark:bg-gray-800 mr-6" />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-550">Chronological Drilldown</h3>
            <span className="h-px flex-1 bg-gray-100 dark:bg-gray-800 ml-6" />
          </div>
          <DailyArchive />
        </section>
      </div>

      {/* Footer Insight */}
      <footer className="pt-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Data Synchronized with Global Mission Control
        </div>
      </footer>
    </div>
  );
};

export default StatsDashboard;
