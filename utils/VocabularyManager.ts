import AsyncStorage from '@react-native-async-storage/async-storage';

const VOCABULARY_STORAGE_KEY = 'vocabularyWords';

// Simple vocabulary tracking - just store translation entry IDs
export interface VocabularyEntry {
  translationId: string; // ID of the translation entry
  timestamp: number; // When it was added to vocabulary
  dateAdded: string; // Human-readable date
}

export class VocabularyManager {
  /**
   * Add a translation to vocabulary by its ID
   */
  static async addToVocabulary(translationId: string): Promise<{ success: boolean; message: string; isDuplicate?: boolean }> {
    try {
      const existingEntries = await this.loadVocabulary();
      
      // Check if already in vocabulary
      const isDuplicate = existingEntries.some(entry => entry.translationId === translationId);
      if (isDuplicate) {
        return {
          success: false,
          message: 'Already in vocabulary!',
          isDuplicate: true
        };
      }

      const entry: VocabularyEntry = {
        translationId,
        timestamp: Date.now(),
        dateAdded: new Date().toLocaleDateString(),
      };

      existingEntries.push(entry);
      await this.saveVocabulary(existingEntries);

      return {
        success: true,
        message: 'Added to vocabulary!'
      };
    } catch (error) {
      console.error('Failed to add to vocabulary:', error);
      return {
        success: false,
        message: 'Failed to add to vocabulary'
      };
    }
  }

  /**
   * Remove a translation from vocabulary by its ID
   */
  static async removeFromVocabulary(translationId: string): Promise<{ success: boolean; message: string }> {
    try {
      const entries = await this.loadVocabulary();
      const filteredEntries = entries.filter(entry => entry.translationId !== translationId);
      
      if (filteredEntries.length === entries.length) {
        return {
          success: false,
          message: 'Not found in vocabulary'
        };
      }

      await this.saveVocabulary(filteredEntries);
      return {
        success: true,
        message: 'Removed from vocabulary!'
      };
    } catch (error) {
      console.error('Failed to remove from vocabulary:', error);
      return {
        success: false,
        message: 'Failed to remove from vocabulary'
      };
    }
  }

  /**
   * Check if a translation is in vocabulary
   */
  static async isInVocabulary(translationId: string): Promise<boolean> {
    try {
      const entries = await this.loadVocabulary();
      return entries.some(entry => entry.translationId === translationId);
    } catch (error) {
      console.error('Failed to check vocabulary:', error);
      return false;
    }
  }

  /**
   * Get all vocabulary translation IDs
   */
  static async getVocabularyTranslationIds(): Promise<string[]> {
    try {
      const entries = await this.loadVocabulary();
      return entries.map(entry => entry.translationId);
    } catch (error) {
      console.error('Failed to get vocabulary IDs:', error);
      return [];
    }
  }

  /**
   * Load all vocabulary entries from storage
   */
  private static async loadVocabulary(): Promise<VocabularyEntry[]> {
    try {
      const stored = await AsyncStorage.getItem(VOCABULARY_STORAGE_KEY);
      const entries = stored ? JSON.parse(stored) : [];
      // Sort by timestamp (newest first)
      return entries.sort((a: VocabularyEntry, b: VocabularyEntry) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to load vocabulary:', error);
      return [];
    }
  }

  /**
   * Save vocabulary entries to storage
   */
  private static async saveVocabulary(entries: VocabularyEntry[]): Promise<void> {
    try {
      await AsyncStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Failed to save vocabulary:', error);
      throw error;
    }
  }

  /**
   * Get all vocabulary entries
   */
  static async getAllVocabularyEntries(): Promise<VocabularyEntry[]> {
    return await this.loadVocabulary();
  }

  /**
   * Clear all vocabulary entries
   */
  static async clearAllVocabulary(): Promise<void> {
    try {
      await AsyncStorage.removeItem(VOCABULARY_STORAGE_KEY);
      console.log('All vocabulary entries cleared');
    } catch (error) {
      console.error('Failed to clear vocabulary:', error);
      throw error;
    }
  }

  /**
   * Get vocabulary statistics
   */
  static async getVocabularyStats(): Promise<{
    totalWords: number;
    recentlyAdded: number; // Words added in last 7 days
  }> {
    try {
      const entries = await this.loadVocabulary();
      const totalWords = entries.length;
      
      // Count recently added (last 7 days)
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const recentlyAdded = entries.filter(entry => entry.timestamp > sevenDaysAgo).length;

      return {
        totalWords,
        recentlyAdded
      };
    } catch (error) {
      console.error('Failed to get vocabulary stats:', error);
      return {
        totalWords: 0,
        recentlyAdded: 0
      };
    }
  }
}