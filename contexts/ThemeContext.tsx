import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SettingsManager, ThemeMode } from '../utils/SettingsManager';

export type { ThemeMode };

interface ThemeColors {
  // Background colors
  background: string;
  surface: string;
  surfaceTransparent: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  
  // UI element colors
  border: string;
  borderTransparent: string;
  shadow: string;
  
  // Interactive element colors
  button: string;
  buttonBorder: string;
  buttonText: string;
  
  // Status colors
  recording: string;
  speaking: string;
  disabled: string;
  
  // Translation display colors
  translationBackground: string;
  translationBorder: string;
  currentMessageBackground: string;
  placeholderText: string;
  
  // Header colors
  headerButton: string;
  headerButtonBorder: string;
  
  // Language selector colors
  selectorBackground: string;
  selectorBorder: string;
  dropdownBackground: string;
  dropdownBorder: string;
  optionSelected: string;
}

const lightTheme: ThemeColors = {
  // Background colors
  background: '#f8f9fa',
  surface: '#ffffff',
  surfaceTransparent: 'rgba(255, 255, 255, 0.9)',
  
  // Text colors
  text: '#1a1a1a',
  textSecondary: 'rgba(26, 26, 26, 0.7)',
  textTertiary: 'rgba(26, 26, 26, 0.5)',
  
  // UI element colors
  border: 'rgba(26, 26, 26, 0.2)',
  borderTransparent: 'rgba(26, 26, 26, 0.1)',
  shadow: 'rgba(0, 0, 0, 0.1)',
  
  // Interactive element colors
  button: 'rgba(26, 26, 26, 0.1)',
  buttonBorder: 'rgba(26, 26, 26, 0.2)',
  buttonText: '#1a1a1a',
  
  // Status colors
  recording: 'rgba(34, 197, 94, 0.2)',
  speaking: '#6b7280',
  disabled: 'rgba(26, 26, 26, 0.3)',
  
  // Translation display colors
  translationBackground: 'rgba(26, 26, 26, 0.05)',
  translationBorder: 'rgba(26, 26, 26, 0.1)',
  currentMessageBackground: 'rgba(59, 130, 246, 0.1)',
  placeholderText: 'rgba(26, 26, 26, 0.4)',
  
  // Header colors
  headerButton: 'rgba(26, 26, 26, 0.1)',
  headerButtonBorder: 'rgba(26, 26, 26, 0.2)',
  
  // Language selector colors
  selectorBackground: 'rgba(26, 26, 26, 0.1)',
  selectorBorder: 'rgba(26, 26, 26, 0.2)',
  dropdownBackground: 'rgba(255, 255, 255, 0.98)',
  dropdownBorder: 'rgba(26, 26, 26, 0.2)',
  optionSelected: 'rgba(59, 130, 246, 0.2)',
};

const darkTheme: ThemeColors = {
  // Background colors
  background: '#1a1a1a',
  surface: '#101010',
  surfaceTransparent: 'rgba(16, 16, 16, 0.9)',
  
  // Text colors
  text: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.9)',
  textTertiary: 'rgba(255, 255, 255, 0.6)',
  
  // UI element colors
  border: 'rgba(255, 255, 255, 0.3)',
  borderTransparent: 'rgba(255, 255, 255, 0.2)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  
  // Interactive element colors
  button: 'rgba(255, 255, 255, 0.2)',
  buttonBorder: 'rgba(255, 255, 255, 0.3)',
  buttonText: '#ffffff',
  
  // Status colors
  recording: 'rgba(255, 255, 255, 0.8)',
  speaking: '#666666',
  disabled: 'rgba(255, 255, 255, 0.2)',
  
  // Translation display colors
  translationBackground: 'rgba(255, 255, 255, 0.1)',
  translationBorder: 'rgba(255, 255, 255, 0.2)',
  currentMessageBackground: 'rgba(255, 255, 255, 0.08)',
  placeholderText: 'rgba(255, 255, 255, 0.6)',
  
  // Header colors
  headerButton: 'rgba(255, 255, 255, 0.2)',
  headerButtonBorder: 'rgba(255, 255, 255, 0.3)',
  
  // Language selector colors
  selectorBackground: 'rgba(255, 255, 255, 0.2)',
  selectorBorder: 'rgba(255, 255, 255, 0.3)',
  dropdownBackground: 'rgba(0, 0, 0, 0.98)',
  dropdownBorder: 'rgba(255, 255, 255, 0.2)',
  optionSelected: 'rgba(255, 255, 255, 0.2)',
};

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  isLoading: boolean;
  updateTheme: (newTheme: ThemeMode) => Promise<void>;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [isLoading, setIsLoading] = useState(true);

  const loadTheme = useCallback(async () => {
    try {
      const savedTheme = await SettingsManager.getTheme();
      setTheme(savedTheme);
    } catch (error) {
      console.error('Failed to load theme:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  const updateTheme = useCallback(async (newTheme: ThemeMode) => {
    try {
      await SettingsManager.setTheme(newTheme);
      setTheme(newTheme);
    } catch (error) {
      console.error('Failed to update theme:', error);
      throw error;
    }
  }, []);

  const refreshTheme = useCallback(async () => {
    await loadTheme();
  }, [loadTheme]);

  const colors = theme === 'light' ? lightTheme : darkTheme;

  const value = {
    theme,
    colors,
    isLoading,
    updateTheme,
    refreshTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
