import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Colors = {
  bg: string;
  bgSoft: string;
  text: string;
  textSub: string;
  textMuted: string;
  primary: string;
  primaryBg: string;
  border: string;
  sectionHead: string;
  card: string;
};

export const light: Colors = {
  bg:          '#FFFFFF',
  bgSoft:      '#F7F8FC',
  text:        '#1A202C',
  textSub:     '#718096',
  textMuted:   '#A0AEC0',
  primary:     '#5A67D8',
  primaryBg:   '#EEF2FF',
  border:      '#F0F0F0',
  sectionHead: '#C0C8D8',
  card:        '#FFFFFF',
};

export const dark: Colors = {
  bg:          '#0F1117',
  bgSoft:      '#1A1D27',
  text:        '#F0F4FF',
  textSub:     '#94A3B8',
  textMuted:   '#64748B',
  primary:     '#818CF8',
  primaryBg:   '#1E1B4B',
  border:      '#2D3748',
  sectionHead: '#4A5568',
  card:        '#1A1D27',
};

type ThemeCtx = { colors: Colors; isDark: boolean; toggle: () => void };
const ThemeContext = createContext<ThemeCtx>({ colors: light, isDark: false, toggle: () => {} });

const STORAGE_KEY = 'cove_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [isDark, setIsDark] = useState(system === 'dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val === 'dark')  setIsDark(true);
      else if (val === 'light') setIsDark(false);
      else setIsDark(system === 'dark');
    });
  }, []);

  function toggle() {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ colors: isDark ? dark : light, isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
