import React, { createContext, useCallback, useEffect, useState } from 'react';

export const ThemeContext = createContext({ theme: 'light', setTheme: () => {}, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try { return (localStorage.getItem('theme') || 'light').toLowerCase() === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });

  const applyThemeClass = useCallback((t) => {
    if (typeof document === 'undefined') return;
    if (t === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => { applyThemeClass(theme); try { localStorage.setItem('theme', theme); } catch {} }, [theme, applyThemeClass]);

  const setTheme = useCallback((t) => setThemeState(t === 'dark' ? 'dark' : 'light'), []);
  const toggleTheme = useCallback(() => setThemeState(t => t === 'dark' ? 'light' : 'dark'), []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
