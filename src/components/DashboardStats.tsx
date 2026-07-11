import { useQuery, useQueries } from '@tanstack/react-query';
import { fetchUserStats, fetchTasks, fetchDailyHistory } from '../services/api';
import { startOfWeek, addDays, format } from 'date-fns';

const DashboardStats = () => {
  const { data: stats, isLoading: isStatsLoading, isError: isStatsError } = useQuery({
    queryKey: ['userStats'],
    queryFn: fetchUserStats,
  });

  const { isLoading: isTasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
  });

  // Calculate current week dates (Monday to Sunday)
  const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfCurrentWeek, i));

  // Fetch completion stats for each of the 7 days in parallel
  const historyQueries = useQueries({
    queries: weekDays.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return {
        queryKey: ['dailyHistory', dateStr],
        queryFn: () => fetchDailyHistory(dateStr),
      };
    }),
  });

  if (isStatsLoading || isTasksLoading) {
    return (
      <div className="animate-pulse space-y-4 p-6 bg-[#F8F9FA] dark:bg-[#1E1E1E] rounded-3xl border border-gray-200/50 dark:border-[#2D2D2D]/60">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (isStatsError || !stats) {
    return (
      <div className="p-4 text-red-500 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-150 dark:border-red-900/30">
        Error loading stats. Please check your database connection.
      </div>
    );
  }

  // Find today's daily rate data from historyQueries to ensure consistency
  const todayDateStr = format(new Date(), 'yyyy-MM-dd');
  const todayIdx = weekDays.findIndex(day => format(day, 'yyyy-MM-dd') === todayDateStr);
  const todayHistory = todayIdx !== -1 ? historyQueries[todayIdx]?.data || [] : [];

  const totalTasks = todayHistory.length;
  const completedTasks = todayHistory.filter((t) => t.is_completed_on_date).length;
  const dailyCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Streak Milestone progression (e.g. milestones of 7, 30, 90, 365)
  const currentStreak = stats.current_streak || 0;
  const streakTarget = currentStreak < 7 ? 7 : currentStreak < 30 ? 30 : currentStreak < 90 ? 90 : 365;
  const streakProgress = Math.min(100, Math.round((currentStreak / streakTarget) * 100));

  // Compute daily rates for the 7-day strip
  const dailyRates = weekDays.map((day, idx) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const query = historyQueries[idx];
    const historyTasks = query?.data || [];
    const total = historyTasks.length;
    const completed = historyTasks.filter((t) => t.is_completed_on_date).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      dateStr,
      label: format(day, 'EEE'),
      dayNum: format(day, 'd'),
      rate,
      isToday: format(day, 'yyyy-MM-dd') === todayDateStr,
    };
  });


  // SVG Concentric ring constants
  const center = 80;
  const outerRadius = 64;
  const innerRadius = 48;
  const strokeWidth = 10;

  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;

  const outerOffset = outerCircumference - (dailyCompletionRate / 100) * outerCircumference;
  const innerOffset = innerCircumference - (streakProgress / 100) * innerCircumference;

  // Level calculation
  const xpPerLevel = 100;
  const level = Math.floor(stats.xp / xpPerLevel) + 1;
  const currentLevelXp = stats.xp % xpPerLevel;
  const progressPercentage = (currentLevelXp / xpPerLevel) * 100;

  return (
    <div className="bg-[#F8F9FA] dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200/50 dark:border-[#2D2D2D]/60 shadow-sm transition-all duration-200">
      {/* Metrics Row (SVG concentric rings + details) */}
      <div className="flex flex-col sm:flex-row items-center gap-8 justify-around">
        {/* SVG Concentric Rings */}
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg className="w-40 h-40 transform -rotate-90">
            {/* Outer track */}
            <circle
              cx={center}
              cy={center}
              r={outerRadius}
              className="stroke-gray-200/50 dark:stroke-[#2A2A2A]"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Outer ring: Daily completions (Neon Cyan) */}
            <circle
              cx={center}
              cy={center}
              r={outerRadius}
              className="stroke-[#00E5FF]"
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={outerCircumference}
              strokeDashoffset={outerOffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />

            {/* Inner track */}
            <circle
              cx={center}
              cy={center}
              r={innerRadius}
              className="stroke-gray-200/50 dark:stroke-[#2A2A2A]"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Inner ring: Streak (Electric Blue) */}
            <circle
              cx={center}
              cy={center}
              r={innerRadius}
              className="stroke-blue-500"
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={innerCircumference}
              strokeDashoffset={innerOffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          </svg>

          {/* Center Information */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
              {dailyCompletionRate}%
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mt-1">
              Done Today
            </span>
          </div>
        </div>

        {/* Dynamic Detail Cards */}
        <div className="space-y-4 w-full sm:w-auto flex-1 max-w-[200px]">
          {/* Daily Missions details */}
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-[#00E5FF]" />
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight leading-none">Missions Complete</p>
              <p className="text-sm font-black text-gray-800 dark:text-gray-200 mt-1">{completedTasks} / {totalTasks}</p>
            </div>
          </div>

          {/* Streak details */}
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-blue-500" />
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight leading-none">Streak Progression</p>
              <p className="text-sm font-black text-gray-800 dark:text-gray-200 mt-1">{currentStreak} / {streakTarget} Days</p>
            </div>
          </div>

          {/* Spark card for Streak Fire */}
          <div className="bg-orange-50/50 dark:bg-orange-950/10 p-3 rounded-2xl border border-orange-100/40 dark:border-orange-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl animate-bounce" role="img" aria-label="streak fire">🔥</span>
              <div>
                <p className="text-sm font-black text-orange-600 dark:text-orange-400 leading-none">{currentStreak} Day</p>
                <p className="text-[9px] font-bold text-orange-400 dark:text-orange-550 uppercase tracking-tighter mt-0.5">Active Streak</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-450 leading-none">Best: {stats.max_streak}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Mini-Calendar Progress Strip */}
      <div className="mt-8 pt-6 border-t border-gray-200/50 dark:border-[#2D2D2D]/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-550">Weekly Progress Logs</h3>
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#00E5FF]">Activity</span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {dailyRates.map((day) => {
            const radius = 12;
            const circ = 2 * Math.PI * radius;
            const offset = circ - (day.rate / 100) * circ;
            return (
              <div
                key={day.dateStr}
                className={`flex flex-col items-center p-2 rounded-2xl border transition-all ${day.isToday
                  ? 'bg-blue-50/20 dark:bg-blue-950/10 border-blue-200/60 dark:border-blue-900/50'
                  : 'bg-white dark:bg-[#121212] border-gray-150 dark:border-[#2D2D2D]'
                  }`}
              >
                <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-550 leading-none">
                  {day.label[0]}
                </span>

                <div className="relative my-1.5 w-8 h-8 flex items-center justify-center">
                  <svg className="w-8 h-8 transform -rotate-90">
                    <circle
                      cx="16"
                      cy="16"
                      r={radius}
                      className="stroke-gray-100 dark:stroke-gray-800"
                      strokeWidth="2.5"
                      fill="transparent"
                    />
                    <circle
                      cx="16"
                      cy="16"
                      r={radius}
                      className="stroke-[#00E5FF]"
                      strokeWidth="2.5"
                      fill="transparent"
                      strokeDasharray={circ}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                    />
                  </svg>
                  <span
                    className={`absolute text-[9px] font-bold ${day.isToday ? 'text-blue-600 dark:text-[#00E5FF] font-black' : 'text-gray-600 dark:text-gray-400'
                      }`}
                  >
                    {day.dayNum}
                  </span>
                </div>

                <span className="text-[8px] font-black tracking-tighter text-gray-400 dark:text-gray-550">
                  {day.rate}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Level XP sub-card */}
      <div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-[#2D2D2D]/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-550">Level {level}</span>
            <span className="text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-[#00E5FF] px-2 py-0.5 rounded-lg font-black uppercase tracking-wider">
              {stats.xp} Total XP
            </span>
          </div>
          <span className="text-[10px] text-gray-400 dark:text-gray-550 font-bold uppercase">
            {xpPerLevel - currentLevelXp} XP to Level {level + 1}
          </span>
        </div>
        <div className="w-full bg-gray-200/50 dark:bg-gray-850/50 rounded-full h-2.5 overflow-hidden border border-gray-200/20 dark:border-gray-700/20">
          <div
            className="bg-gradient-to-r from-blue-500 to-[#00E5FF] h-full transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
