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
  
  // Accent colors for high contrast
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
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
  
  // Accent colors for high contrast
  primary: '#007AFF',
  secondary: '#6b7280',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
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
  
  // Accent colors for high contrast
  primary: '#007AFF',
  secondary: '#9ca3af',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
};

// High contrast light theme for visually impaired users
const highContrastLightTheme: ThemeColors = {
  // Background colors - pure white/black for maximum contrast
  background: '#ffffff',
  surface: '#ffffff',
  surfaceTransparent: 'rgba(255, 255, 255, 0.95)',
  
  // Text colors - pure black for maximum contrast
  text: '#000000',
  textSecondary: '#000000',
  textTertiary: '#333333',
  
  // UI element colors - strong borders
  border: '#000000',
  borderTransparent: '#666666',
  shadow: 'rgba(0, 0, 0, 0.3)',
  
  // Interactive element colors - clear distinction
  button: '#f0f0f0',
  buttonBorder: '#000000',
  buttonText: '#000000',
  
  // Status colors - high contrast versions
  recording: '#00ff00',
  speaking: '#0000ff',
  disabled: '#888888',
  
  // Translation display colors - clear distinction
  translationBackground: '#f8f8f8',
  translationBorder: '#000000',
  currentMessageBackground: '#e6f3ff',
  placeholderText: '#666666',
  
  // Header colors
  headerButton: '#ffffff',
  headerButtonBorder: '#000000',
  
  // Language selector colors
  selectorBackground: '#ffffff',
  selectorBorder: '#000000',
  dropdownBackground: '#ffffff',
  dropdownBorder: '#000000',
  optionSelected: '#e6f3ff',
  
  // Accent colors for high contrast
  primary: '#0066cc',
  secondary: '#666666',
  success: '#008800',
  warning: '#cc8800',
  error: '#cc0000',
};

// High contrast dark theme for visually impaired users
const highContrastDarkTheme: ThemeColors = {
  // Background colors - pure black for maximum contrast
  background: '#000000',
  surface: '#000000',
  surfaceTransparent: 'rgba(0, 0, 0, 0.95)',
  
  // Text colors - pure white for maximum contrast
  text: '#ffffff',
  textSecondary: '#ffffff',
  textTertiary: '#cccccc',
  
  // UI element colors - strong borders
  border: '#ffffff',
  borderTransparent: '#999999',
  shadow: 'rgba(255, 255, 255, 0.3)',
  
  // Interactive element colors - clear distinction
  button: '#1a1a1a',
  buttonBorder: '#ffffff',
  buttonText: '#ffffff',
  
  // Status colors - high contrast versions
  recording: '#00ff00',
  speaking: '#66ccff',
  disabled: '#777777',
  
  // Translation display colors - clear distinction
  translationBackground: '#1a1a1a',
  translationBorder: '#ffffff',
  currentMessageBackground: '#003366',
  placeholderText: '#aaaaaa',
  
  // Header colors
  headerButton: '#000000',
  headerButtonBorder: '#ffffff',
  
  // Language selector colors
  selectorBackground: '#000000',
  selectorBorder: '#ffffff',
  dropdownBackground: '#000000',
  dropdownBorder: '#ffffff',
  optionSelected: '#003366',
  
  // Accent colors for high contrast
  primary: '#3399ff',
  secondary: '#999999',
  success: '#00cc00',
  warning: '#ffcc00',
  error: '#ff3333',
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

  const getThemeColors = (currentTheme: ThemeMode): ThemeColors => {
    switch (currentTheme) {
      case 'light':
        return lightTheme;
      case 'dark':
        return darkTheme;
      case 'high-contrast-light':
        return highContrastLightTheme;
      case 'high-contrast-dark':
        return highContrastDarkTheme;
      default:
        return darkTheme;
    }
  };

  const colors = getThemeColors(theme);

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
