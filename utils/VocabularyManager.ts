import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLanguageDisplayName } from './LanguageConfig';

const VOCABULARY_STORAGE_KEY = 'vocabularyWords';

export interface VocabularyEntry {
  id: string;
  originalText: string;
  translatedText: string;
  originalLanguage: string;
  translatedLanguage: string;
  timestamp: number;
  dateAdded: string; // Human-readable date
}

export class VocabularyManager {
  /**
   * Save a new vocabulary word
   */
  static async saveVocabularyWord(
    originalText: string,
    translatedText: string,
    originalLanguage: string,
    translatedLanguage: string
  ): Promise<{ success: boolean; message: string; isDuplicate?: boolean }> {
    try {
      // Check for duplicates first
      const existingWords = await this.loadVocabulary();
      const duplicate = existingWords.find(word => 
        word.originalText.toLowerCase() === originalText.toLowerCase() &&
        word.originalLanguage === originalLanguage &&
        word.translatedLanguage === translatedLanguage
      );

      if (duplicate) {
        return {
          success: false,
          message: 'This word is already in your vocabulary',
          isDuplicate: true
        };
      }

      const entry: VocabularyEntry = {
        id: `vocab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        originalText: originalText.trim(),
        translatedText: translatedText.trim(),
        originalLanguage,
        translatedLanguage,
        timestamp: Date.now(),
        dateAdded: new Date().toLocaleDateString(),
      };

      existingWords.push(entry);
      await this.saveVocabulary(existingWords);

      console.log('Vocabulary word saved:', entry);
      return {
        success: true,
        message: 'Word added to vocabulary!'
      };
    } catch (error) {
      console.error('Failed to save vocabulary word:', error);
      return {
        success: false,
        message: 'Failed to save word to vocabulary'
      };
    }
  }

  /**
   * Load all vocabulary words from storage
   */
  private static async loadVocabulary(): Promise<VocabularyEntry[]> {
    try {
      const stored = await AsyncStorage.getItem(VOCABULARY_STORAGE_KEY);
      const words = stored ? JSON.parse(stored) : [];
      // Sort by timestamp (newest first)
      return words.sort((a: VocabularyEntry, b: VocabularyEntry) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to load vocabulary:', error);
      return [];
    }
  }

  /**
   * Save vocabulary words to storage
   */
  private static async saveVocabulary(words: VocabularyEntry[]): Promise<void> {
    try {
      await AsyncStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(words));
    } catch (error) {
      console.error('Failed to save vocabulary:', error);
      throw error;
    }
  }

  /**
   * Get all vocabulary words
   */
  static async getAllVocabularyWords(): Promise<VocabularyEntry[]> {
    return await this.loadVocabulary();
  }

  /**
   * Delete a specific vocabulary word
   */
  static async deleteVocabularyWord(wordId: string): Promise<void> {
    try {
      const words = await this.loadVocabulary();
      const filteredWords = words.filter(word => word.id !== wordId);
      await this.saveVocabulary(filteredWords);
      console.log(`Vocabulary word ${wordId} deleted`);
    } catch (error) {
      console.error('Failed to delete vocabulary word:', error);
      throw error;
    }
  }

  /**
   * Clear all vocabulary words
   */
  static async clearAllVocabulary(): Promise<void> {
    try {
      await AsyncStorage.removeItem(VOCABULARY_STORAGE_KEY);
      console.log('All vocabulary words cleared');
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
    languagePairs: { [key: string]: number };
    recentlyAdded: number; // Words added in last 7 days
  }> {
    try {
      const words = await this.loadVocabulary();
      const totalWords = words.length;
      
      // Count language pairs
      const languagePairs: { [key: string]: number } = {};
      words.forEach(word => {
        const pairKey = `${getLanguageDisplayName(word.originalLanguage)} → ${getLanguageDisplayName(word.translatedLanguage)}`;
        languagePairs[pairKey] = (languagePairs[pairKey] || 0) + 1;
      });

      // Count recently added (last 7 days)
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const recentlyAdded = words.filter(word => word.timestamp > sevenDaysAgo).length;

      return {
        totalWords,
        languagePairs,
        recentlyAdded
      };
    } catch (error) {
      console.error('Failed to get vocabulary stats:', error);
      return {
        totalWords: 0,
        languagePairs: {},
        recentlyAdded: 0
      };
    }
  }

  /**
   * Search vocabulary words
   */
  static async searchVocabulary(query: string): Promise<VocabularyEntry[]> {
    try {
      const words = await this.loadVocabulary();
      const searchTerm = query.toLowerCase().trim();
      
      if (!searchTerm) return words;

      return words.filter(word =>
        word.originalText.toLowerCase().includes(searchTerm) ||
        word.translatedText.toLowerCase().includes(searchTerm) ||
        getLanguageDisplayName(word.originalLanguage).toLowerCase().includes(searchTerm) ||
        getLanguageDisplayName(word.translatedLanguage).toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.error('Failed to search vocabulary:', error);
      return [];
    }
  }
}