import AsyncStorage from '@react-native-async-storage/async-storage';

// Settings storage key
const SETTINGS_STORAGE_KEY = 'pocket_translator_settings';

// Text size options
export const TEXT_SIZE_OPTIONS = [
  { id: 'small', label: 'Small', fontSize: 14, lineHeight: 20 },
  { id: 'medium', label: 'Medium', fontSize: 16, lineHeight: 22 },
  { id: 'large', label: 'Large', fontSize: 18, lineHeight: 26 },
  { id: 'xlarge', label: 'Extra Large', fontSize: 20, lineHeight: 28 },
  { id: 'xxlarge', label: 'XXL', fontSize: 22, lineHeight: 30 },
] as const;

export type TextSizeId = typeof TEXT_SIZE_OPTIONS[number]['id'];

// Theme options
export type ThemeMode = 'light' | 'dark' | 'high-contrast-light' | 'high-contrast-dark';

// Settings interface
export interface UserSettings {
  textSize: TextSizeId;
  theme: ThemeMode;
}

// Default settings
const DEFAULT_SETTINGS: UserSettings = {
  textSize: 'large', // Default to current size (18px)
  theme: 'dark', // Default to dark theme (current)
};

export class SettingsManager {
  // Get all settings
  static async getSettings(): Promise<UserSettings> {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Failed to load settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  // Save settings
  static async saveSettings(settings: UserSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  // Get text size setting
  static async getTextSize(): Promise<TextSizeId> {
    try {
      const settings = await this.getSettings();
      return settings.textSize;
    } catch (error) {
      console.error('Failed to get text size:', error);
      return DEFAULT_SETTINGS.textSize;
    }
  }

  // Save text size setting
  static async setTextSize(textSize: TextSizeId): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, textSize };
      await this.saveSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to set text size:', error);
      throw error;
    }
  }

  // Get text size configuration
  static getTextSizeConfig(textSizeId: TextSizeId) {
    return TEXT_SIZE_OPTIONS.find(option => option.id === textSizeId) || TEXT_SIZE_OPTIONS[2]; // Default to 'large'
  }

  // Get theme setting
  static async getTheme(): Promise<ThemeMode> {
    try {
      const settings = await this.getSettings();
      return settings.theme;
    } catch (error) {
      console.error('Failed to get theme:', error);
      return DEFAULT_SETTINGS.theme;
    }
  }

  // Save theme setting
  static async setTheme(theme: ThemeMode): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, theme };
      await this.saveSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to set theme:', error);
      throw error;
    }
  }

  // Clear all settings
  static async clearSettings(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear settings:', error);
      throw error;
    }
  }
}
