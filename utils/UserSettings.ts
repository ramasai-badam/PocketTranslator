import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_SETTINGS_KEY = 'userSettings';

export interface UserSettings {
  singleUserMode: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  singleUserMode: false,
};

export class UserSettingsManager {
  /**
   * Load user settings from storage
   */
  private static async loadSettings(): Promise<UserSettings> {
    try {
      const stored = await AsyncStorage.getItem(USER_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all properties exist
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Failed to load user settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Save user settings to storage
   */
  private static async saveSettings(settings: UserSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settings));
      console.log('User settings saved:', settings);
    } catch (error) {
      console.error('Failed to save user settings:', error);
      throw error;
    }
  }

  /**
   * Get single user mode setting
   */
  static async getSingleUserMode(): Promise<boolean> {
    const settings = await this.loadSettings();
    return settings.singleUserMode;
  }

  /**
   * Set single user mode setting
   */
  static async setSingleUserMode(enabled: boolean): Promise<void> {
    const settings = await this.loadSettings();
    settings.singleUserMode = enabled;
    await this.saveSettings(settings);
  }

  /**
   * Get all user settings
   */
  static async getAllSettings(): Promise<UserSettings> {
    return await this.loadSettings();
  }

  /**
   * Update multiple settings at once
   */
  static async updateSettings(updates: Partial<UserSettings>): Promise<void> {
    const settings = await this.loadSettings();
    const newSettings = { ...settings, ...updates };
    await this.saveSettings(newSettings);
  }

  /**
   * Reset all settings to defaults
   */
  static async resetSettings(): Promise<void> {
    await this.saveSettings(DEFAULT_SETTINGS);
  }
}