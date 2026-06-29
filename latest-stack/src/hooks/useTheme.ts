import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';

let globalTheme: Theme = 'light';
const listeners = new Set<(theme: Theme) => void>();

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem('theme') as Theme | null;
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Initialize theme once on module load
if (typeof window !== 'undefined') {
  globalTheme = getInitialTheme();
  if (globalTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(globalTheme);

  useEffect(() => {
    const listener = (newTheme: Theme) => setTheme(newTheme);
    listeners.add(listener);
    
    // In case the theme was updated elsewhere before this component mounted
    if (theme !== globalTheme) {
      setTheme(globalTheme);
    }
    
    return () => {
      listeners.delete(listener);
    };
  }, [theme]);

  const toggleTheme = () => {
    const newTheme: Theme = theme === 'light' ? 'dark' : 'light';
    globalTheme = newTheme;
    localStorage.setItem('theme', newTheme);
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    listeners.forEach((listener) => listener(newTheme));
  };

  return { theme, toggleTheme };
};
