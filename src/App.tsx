import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DashboardStats from './components/DashboardStats';
import TaskBoard from './components/TaskBoard';
import StatsDashboard from './views/StatsDashboard';
import SettingsPanel from './components/SettingsPanel';
import { ListTodo, BarChart2 } from 'lucide-react';

function App() {
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<'tasks' | 'stats'>('tasks');

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
    <div className='min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-24'>
      <div className='max-w-7xl mx-auto'>
        <header className='mb-12 text-center'>
          <h1 className='text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl'>Daily Routine Tracker</h1>
          <p className='mt-4 text-xl text-gray-500'>Complete your tasks, earn XP, and maintain your streak!</p>
        </header>

        <main>
          <DashboardStats />

          {/* Pill-shaped Segmented Control */}
          <div className='flex justify-center mt-12 mb-12'>
            <div className='bg-gray-200/50 p-1.5 rounded-2xl flex gap-1 items-center border border-gray-100 shadow-inner'>
              <button
                onClick={() => setActiveView('tasks')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  activeView === 'tasks' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ListTodo size={18} />
                Daily Missions
              </button>
              <button
                onClick={() => setActiveView('stats')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  activeView === 'stats' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <BarChart2 size={18} />
                History & Stats
              </button>
            </div>
          </div>

          <div className='mt-8'>
            {activeView === 'tasks' ? (
              <div>
                <h2 className='text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2'>
                  <span className='bg-blue-600 text-white p-1.5 rounded-lg'>
                    <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'
                      />
                    </svg>
                  </span>
                  Today's Missions
                </h2>
                <TaskBoard />
              </div>
            ) : (
              <StatsDashboard />
            )}
            <SettingsPanel />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
