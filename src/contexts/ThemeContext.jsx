/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(undefined);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('jarvis_theme');
    // Force blue users to neon-green based on user request
    if (saved === 'blue' || saved === 'green') {
      return 'neon-green';
    }
    return saved || 'neon-green';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('jarvis_theme', theme);
  }, [theme]);

  // Provide hex values for canvas/WebGL
  const themeColors = {
    'neon-green': { colorA: '#4eff65', colorB: '#21ff3d', colorC: '#7dff8e', shadow: '#06e823' },
    green: { colorA: '#4ade80', colorB: '#22c55e', colorC: '#86efac', shadow: '#16a34a' },
    cyan:  { colorA: '#22d3ee', colorB: '#06b6d4', colorC: '#67e8f9', shadow: '#0891b2' },
    amber: { colorA: '#fbbf24', colorB: '#f59e0b', colorC: '#fcd34d', shadow: '#d97706' },
    purple:{ colorA: '#c084fc', colorB: '#a855f7', colorC: '#d8b4fe', shadow: '#9333ea' },
    red:   { colorA: '#f87171', colorB: '#ef4444', colorC: '#fca5a5', shadow: '#dc2626' },
    blue:  { colorA: '#60a5fa', colorB: '#3b82f6', colorC: '#93c5fd', shadow: '#2563eb' }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colors: themeColors[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
