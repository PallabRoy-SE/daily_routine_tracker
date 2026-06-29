import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchXpTrend } from '../services/api';
import { TrendingUp } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface XpData {
  date: string;
  xp: number;
}

const XPTrendChart = () => {
  const { theme } = useTheme();
  const { data, isLoading, isError } = useQuery<XpData[]>({
    queryKey: ['xpTrend'],
    queryFn: fetchXpTrend,
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm animate-pulse">
        <div className="h-6 w-48 bg-gray-100 dark:bg-gray-700 rounded mb-6"></div>
        <div className="h-48 w-full bg-gray-50 dark:bg-gray-900 rounded"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 dark:bg-red-950/20 p-6 rounded-2xl border border-red-100 dark:border-red-900/30 text-red-500 dark:text-red-400 text-sm font-medium">
        Failed to load progression data.
      </div>
    );
  }

  // Ensure data exists and format dates for the chart
  const chartData = data?.map(item => ({
    ...item,
    formattedDate: new Date(item.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
  })) || [];

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-blue-100 dark:bg-blue-950/30 p-2 rounded-xl text-blue-600 dark:text-blue-400">
          <TrendingUp size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 tracking-tight">Mission XP Progression</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium tracking-tight">Your daily XP gains over the last 30 days</p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorXp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
            <XAxis 
              dataKey="formattedDate" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: theme === 'dark' ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 600 }}
              minTickGap={20}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: theme === 'dark' ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 600 }}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                padding: '12px'
              }}
              itemStyle={{ fontWeight: 800, color: '#3b82f6' }}
              labelStyle={{ color: theme === 'dark' ? '#94a3b8' : '#64748b', marginBottom: '4px', fontWeight: 600 }}
            />
            <Area 
              type="monotone" 
              dataKey="xp" 
              stroke="#3b82f6" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorXp)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex items-center justify-center gap-6">
         <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500 ring-4 ring-blue-50 dark:ring-blue-950/30" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Daily Gain</span>
         </div>
      </div>
    </div>
  );
};

export default XPTrendChart;
