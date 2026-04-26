import { useQuery } from '@tanstack/react-query';
import { fetchUserStats } from '../services/api';

const DashboardStats = () => {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['userStats'],
    queryFn: fetchUserStats,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse flex space-x-4 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex-1 space-y-4 py-1">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-lg border border-red-100">
        Error loading stats. Please check your backend connection.
      </div>
    );
  }

  // Simple level calculation: Level = (XP / 100) + 1
  const xpPerLevel = 100;
  const level = Math.floor(stats.xp / xpPerLevel) + 1;
  const currentLevelXp = stats.xp % xpPerLevel;
  const progressPercentage = (currentLevelXp / xpPerLevel) * 100;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Level {level}</span>
          <span className="text-sm font-medium text-blue-600">{stats.xp} Total XP</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden border border-gray-200">
          <div 
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-400 font-medium">
          {xpPerLevel - currentLevelXp} XP remaining for Level {level + 1}
        </p>
      </div>

      <div className="flex items-center gap-4 bg-orange-50 px-6 py-4 rounded-xl border border-orange-100">
        <div className="text-3xl animate-bounce" role="img" aria-label="streak fire">🔥</div>
        <div>
          <p className="text-2xl font-black text-orange-600 leading-none">{stats.current_streak}</p>
          <p className="text-xs font-bold text-orange-400 uppercase tracking-tighter">Day Streak</p>
        </div>
        <div className="h-8 w-px bg-orange-200 mx-2" />
        <div>
          <p className="text-lg font-bold text-gray-700 leading-none">{stats.max_streak}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Best</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
