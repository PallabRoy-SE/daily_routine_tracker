import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DashboardStats from './components/DashboardStats';
import TaskBoard from './components/TaskBoard';
import StatsDashboard from './views/StatsDashboard';
import SettingsPanel from './components/SettingsPanel';
import { Home as HomeIcon, BookOpen, User, Plus, Moon, Sun } from 'lucide-react';
import { useTheme } from './hooks/useTheme';

function App() {
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<'home' | 'journal' | 'profile'>('home');
  const { theme, toggleTheme } = useTheme();

  // Midnight check: setup interval only if opened within 5 minutes of next calendar day
  useEffect(() => {
    const nextDay = new Date();
    nextDay.setHours(24, 0, 0, 0);
    const msUntilMidnight = nextDay.getTime() - Date.now();
    const fiveMinutesInMs = 5 * 60 * 1000;

    if (msUntilMidnight <= fiveMinutesInMs) {
      console.log(`App loaded within 5 mins of midnight (${Math.round(msUntilMidnight / 1000)}s left). Activating midnight check interval.`);
      let currentDay = new Date().getDate();
      const interval = setInterval(() => {
        const today = new Date().getDate();
        if (today !== currentDay) {
          console.log('Midnight day transition detected. Invalidating task queries.');
          currentDay = today;
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['upcomingTasks'] });
        }
      }, 15000); // Check every 15 seconds
      return () => clearInterval(interval);
    }
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] text-gray-900 dark:text-[#f3f4f6] transition-colors duration-250 pb-24 md:pb-12">
      {/* Top Header Navigation Bar (Desktop View only) */}
      <header className="hidden md:flex sticky top-0 z-40 bg-white/90 dark:bg-[#121212]/95 backdrop-blur-md border-b border-gray-200/50 dark:border-[#2D2D2D]/60 py-4 px-8 items-center justify-between transition-all duration-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00E5FF] to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/10">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900 dark:text-white tracking-tight leading-none">Daily Routine Tracker</h1>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mt-1">Productivity Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-1 bg-gray-100/60 dark:bg-[#1E1E1E]/60 p-1 rounded-xl border border-gray-200/20 dark:border-gray-800/30">
            <button
              onClick={() => setActiveView('home')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 ${activeView === 'home'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-[#00E5FF] shadow-sm'
                  : 'text-gray-500 dark:text-gray-450 hover:text-gray-850 dark:hover:text-white'
                }`}
            >
              <HomeIcon size={14} />
              Home
            </button>
            <button
              onClick={() => setActiveView('journal')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 ${activeView === 'journal'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-[#00E5FF] shadow-sm'
                  : 'text-gray-500 dark:text-gray-450 hover:text-gray-850 dark:hover:text-white'
                }`}
            >
              <BookOpen size={14} />
              Journal
            </button>
            <button
              onClick={() => setActiveView('profile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 ${activeView === 'profile'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-[#00E5FF] shadow-sm'
                  : 'text-gray-500 dark:text-gray-450 hover:text-gray-850 dark:hover:text-white'
                }`}
            >
              <User size={14} />
              Profile
            </button>
          </nav>

          <div className="h-6 w-px bg-gray-200 dark:bg-[#2D2D2D]" />

          {/* Theme Quick Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#1E1E1E] rounded-xl text-gray-500 dark:text-gray-400 transition-colors"
            title="Toggle Dark Mode"
          >
            {theme === 'dark' ? <Sun size={18} className="text-[#00E5FF]" /> : <Moon size={18} className="text-blue-600" />}
          </button>
        </div>
      </header>

      {/* Mobile Header (Only visible on mobile) */}
      <header className="md:hidden py-4 px-4 text-center border-b border-gray-100 dark:border-[#2D2D2D] mb-6 flex justify-between items-center bg-white dark:bg-[#121212]">
        <div className="text-left">
          <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Daily Routine Tracker</h1>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mt-0.5">Be Consistent</p>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-gray-150 dark:hover:bg-[#1E1E1E] rounded-xl text-gray-500 dark:text-gray-400 transition-colors"
        >
          {theme === 'dark' ? <Sun size={18} className="text-[#00E5FF]" /> : <Moon size={18} className="text-blue-600" />}
        </button>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2">
        {activeView === 'home' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left/Center Column: Metrics Dashboard (Concentric Rings & 7-Day Calendar Strip) */}
            <div className="lg:col-span-5 space-y-6">
              <DashboardStats />
            </div>

            {/* Right Column: Task Lists & Countdown checkmarks */}
            <div className="lg:col-span-7">
              <TaskBoard />
            </div>
          </div>
        )}

        {activeView === 'journal' && (
          <div className="w-full">
            <StatsDashboard />
          </div>
        )}

        {activeView === 'profile' && (
          <div className="max-w-3xl mx-auto w-full">
            <SettingsPanel />
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) for mobile task addition */}
      {activeView === 'home' && (
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-create-task'))}
          className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50 w-14 h-14 rounded-full bg-gradient-to-tr from-[#00E5FF] to-blue-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/20 dark:shadow-none hover:scale-105 active:scale-95 transition-all cursor-pointer border-none"
          title="Launch New Mission"
          aria-label="Add new mission"
        >
          <Plus size={28} />
        </button>
      )}

      {/* Sticky Bottom Navigation Bar (Mobile View only) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#1E1E1E] border-t border-gray-200/50 dark:border-[#2D2D2D]/60 md:hidden flex justify-around items-center py-2.5 px-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => setActiveView('home')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${activeView === 'home' ? 'text-blue-600 dark:text-[#00E5FF]' : 'text-gray-400 dark:text-gray-550 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
        >
          <HomeIcon size={20} />
          <span className="text-[10px] font-bold tracking-tight">Home</span>
        </button>
        <button
          onClick={() => setActiveView('journal')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${activeView === 'journal' ? 'text-blue-600 dark:text-[#00E5FF]' : 'text-gray-400 dark:text-gray-550 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
        >
          <BookOpen size={20} />
          <span className="text-[10px] font-bold tracking-tight">Journal</span>
        </button>
        <button
          onClick={() => setActiveView('profile')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${activeView === 'profile' ? 'text-blue-600 dark:text-[#00E5FF]' : 'text-gray-400 dark:text-gray-550 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
        >
          <User size={20} />
          <span className="text-[10px] font-bold tracking-tight">Profile</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
