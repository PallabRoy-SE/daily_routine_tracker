import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface TimerState {
  secondsRemaining: number;
  initialSecondsRemaining: number;
  isRunning: boolean;
  startedAt: number | null;
  timeLimit: number; // in minutes
}

interface TimerContextType {
  timers: Record<string, TimerState>;
  startTimer: (taskId: string) => void;
  pauseTimer: (taskId: string) => void;
  resetTimer: (taskId: string, timeLimitMinutes: number) => void;
  initializeTimer: (taskId: string, timeLimitMinutes: number) => void;
  deleteTimer: (taskId: string) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

const STORAGE_KEY = 'daily_routine_tracker_timers';

export const TimerProvider = ({ children }: { children: ReactNode }) => {
  const [timers, setTimers] = useState<Record<string, TimerState>>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        const loadedTimers: Record<string, TimerState> = {};
        for (const taskId in parsed) {
          const timer = parsed[taskId];
          if (timer.isRunning && timer.startedAt) {
            const elapsed = Math.floor((now - timer.startedAt) / 1000);
            const remaining = Math.max(0, timer.initialSecondsRemaining - elapsed);
            loadedTimers[taskId] = {
              ...timer,
              secondsRemaining: remaining,
              isRunning: remaining > 0,
              startedAt: remaining > 0 ? timer.startedAt : null,
            };
          } else {
            loadedTimers[taskId] = timer;
          }
        }
        return loadedTimers;
      } catch (e) {
        console.error('Failed to parse timers from localStorage', e);
      }
    }
    return {};
  });

  // Save to localStorage whenever timers change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
  }, [timers]);

  // Central interval to decrement running timers
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) => {
        let changed = false;
        const next = { ...prev };
        const now = Date.now();

        for (const taskId in next) {
          const timer = next[taskId];
          if (timer.isRunning && timer.startedAt !== null) {
            const elapsed = Math.floor((now - timer.startedAt) / 1000);
            const remaining = Math.max(0, timer.initialSecondsRemaining - elapsed);

            if (remaining !== timer.secondsRemaining) {
              next[taskId] = {
                ...timer,
                secondsRemaining: remaining,
                isRunning: remaining > 0,
                startedAt: remaining > 0 ? timer.startedAt : null,
              };
              changed = true;
            }
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const initializeTimer = (taskId: string, timeLimitMinutes: number) => {
    setTimers((prev) => {
      const existing = prev[taskId];
      if (existing !== undefined) {
        // If the time limit changed, reset the timer to the new limit
        if (existing.timeLimit === timeLimitMinutes) {
          return prev;
        }
      }
      return {
        ...prev,
        [taskId]: {
          secondsRemaining: timeLimitMinutes * 60,
          initialSecondsRemaining: timeLimitMinutes * 60,
          isRunning: false,
          startedAt: null,
          timeLimit: timeLimitMinutes,
        },
      };
    });
  };

  const startTimer = (taskId: string) => {
    setTimers((prev) => {
      const timer = prev[taskId];
      if (!timer || timer.isRunning || timer.secondsRemaining <= 0) return prev;
      return {
        ...prev,
        [taskId]: {
          ...timer,
          isRunning: true,
          startedAt: Date.now(),
          initialSecondsRemaining: timer.secondsRemaining,
        },
      };
    });
  };

  const pauseTimer = (taskId: string) => {
    setTimers((prev) => {
      const timer = prev[taskId];
      if (!timer || !timer.isRunning || timer.startedAt === null) return prev;
      const elapsed = Math.floor((Date.now() - timer.startedAt) / 1000);
      const remaining = Math.max(0, timer.initialSecondsRemaining - elapsed);
      return {
        ...prev,
        [taskId]: {
          ...timer,
          isRunning: false,
          startedAt: null,
          secondsRemaining: remaining,
          initialSecondsRemaining: remaining,
        },
      };
    });
  };

  const resetTimer = (taskId: string, timeLimitMinutes: number) => {
    setTimers((prev) => {
      return {
        ...prev,
        [taskId]: {
          secondsRemaining: timeLimitMinutes * 60,
          initialSecondsRemaining: timeLimitMinutes * 60,
          isRunning: false,
          startedAt: null,
          timeLimit: timeLimitMinutes,
        },
      };
    });
  };

  const deleteTimer = (taskId: string) => {
    setTimers((prev) => {
      if (prev[taskId] === undefined) return prev;
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  };

  return (
    <TimerContext.Provider value={{ timers, startTimer, pauseTimer, resetTimer, initializeTimer, deleteTimer }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimerContext = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimerContext must be used within a TimerProvider');
  }
  return context;
};
