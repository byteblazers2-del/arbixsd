import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppTheme = 'navy' | 'onyx';

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  isOnyx: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'onyx',
  setTheme: () => {},
  isOnyx: true
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Load saved theme or default to 'onyx' (the new dark theme requested)
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem('app_theme');
      if (saved === 'navy' || saved === 'onyx') {
        return saved;
      }
    } catch {}
    return 'onyx';
  });

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('app_theme', newTheme);
    } catch {}
  };

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (theme === 'onyx') {
      root.setAttribute('data-theme', 'onyx');
      body.classList.add('theme-onyx');
      body.classList.remove('theme-navy');
    } else {
      root.setAttribute('data-theme', 'navy');
      body.classList.add('theme-navy');
      body.classList.remove('theme-onyx');
    }

    // Sync Telegram Mini App Header, Background and Bottom Bar
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        const targetColor = theme === 'onyx' ? '#000000' : '#0F1721';
        if (typeof tg.setHeaderColor === 'function') {
          tg.setHeaderColor(targetColor);
        }
        if (typeof tg.setBackgroundColor === 'function') {
          tg.setBackgroundColor(targetColor);
        }
        if (typeof tg.setBottomBarColor === 'function') {
          tg.setBottomBarColor(targetColor);
        }
      }
    } catch {}
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isOnyx: theme === 'onyx' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
