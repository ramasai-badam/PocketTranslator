import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLanguageDisplayName } from './LanguageConfig';

const TRANSLATION_HISTORY_KEY = 'translationHistory';

export interface TranslationEntry {
  id: string;
  originalText: string;
  translatedText: string;
  fromLanguage: string;
  toLanguage: string;
  timestamp: number;
  speaker: 'user1' | 'user2'; // Which side of the interface spoke
}

export interface LanguagePairConversation {
  languagePair: string; // e.g., "en-es"
  displayName: string; // e.g., "English ↔ Spanish"
  entries: TranslationEntry[];
  lastUpdated: number;
  totalEntries: number;
}

export interface VocabularyEntry {
  id: string;
  originalWord: string;
  translatedWord: string;
  fromLanguage: string;
  toLanguage: string;
  timestamp: number;
  notes?: string;
}

const VOCABULARY_STORAGE_KEY = 'vocabularyList';

export class TranslationHistoryManager {
  /**
   * Save a new translation to history
   */
  static async saveTranslation(
    originalText: string,
    translatedText: string,
    fromLanguage: string,
    toLanguage: string,
    speaker: 'user1' | 'user2'
  ): Promise<void> {
    try {
      const entry: TranslationEntry = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        originalText,
        translatedText,
        fromLanguage,
        toLanguage,
        timestamp: Date.now(),
        speaker,
      };

      const history = await this.loadHistory();
      const languagePair = this.getLanguagePairKey(fromLanguage, toLanguage);
      
      if (!history[languagePair]) {
        history[languagePair] = {
          languagePair,
          displayName: this.getLanguagePairDisplayName(fromLanguage, toLanguage),
          entries: [],
          lastUpdated: Date.now(),
          totalEntries: 0,
        };
      }

      history[languagePair].entries.push(entry);
      history[languagePair].lastUpdated = Date.now();
      history[languagePair].totalEntries = history[languagePair].entries.length;

      await this.saveHistory(history);
      console.log('Translation saved to history:', entry);
    } catch (error) {
      console.error('Failed to save translation to history:', error);
    }
  }

  /**
   * Load all translation history
   */
  private static async loadHistory(): Promise<{ [key: string]: LanguagePairConversation }> {
    try {
      const stored = await AsyncStorage.getItem(TRANSLATION_HISTORY_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to load translation history:', error);
      return {};
    }
  }

  /**
   * Save translation history
   */
  private static async saveHistory(history: { [key: string]: LanguagePairConversation }): Promise<void> {
    try {
      await AsyncStorage.setItem(TRANSLATION_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save translation history:', error);
    }
  }

  /**
   * Get all language pair conversations
   */
  static async getAllConversations(): Promise<LanguagePairConversation[]> {
    const history = await this.loadHistory();
    return Object.values(history).sort((a, b) => b.lastUpdated - a.lastUpdated);
  }

  /**
   * Get all translations organized by day and language pair
   */
  static async getTranslationsByDay(): Promise<{ [date: string]: { [languagePair: string]: { conversation: LanguagePairConversation; entries: TranslationEntry[] } } }> {
    const history = await this.loadHistory();
    const result: { [date: string]: { [languagePair: string]: { conversation: LanguagePairConversation; entries: TranslationEntry[] } } } = {};

    // Process each conversation
    Object.values(history).forEach(conversation => {
      conversation.entries.forEach(entry => {
        const date = new Date(entry.timestamp);
        const dateKey = date.toDateString(); // e.g., "Mon Dec 25 2023"
        
        if (!result[dateKey]) {
          result[dateKey] = {};
        }
        
        if (!result[dateKey][conversation.languagePair]) {
          result[dateKey][conversation.languagePair] = {
            conversation,
            entries: []
          };
        }
        
        result[dateKey][conversation.languagePair].entries.push(entry);
      });
    });

    // Sort entries within each day/language pair by timestamp (newest first)
    Object.keys(result).forEach(dateKey => {
      Object.keys(result[dateKey]).forEach(languagePair => {
        result[dateKey][languagePair].entries.sort((a, b) => b.timestamp - a.timestamp);
      });
    });

    return result;
  }

  /**
   * Delete a specific translation entry
   */
  static async deleteTranslation(translationId: string): Promise<void> {
    try {
      const history = await this.loadHistory();
      let found = false;

      // Find and remove the translation from the appropriate conversation
      Object.keys(history).forEach(languagePair => {
        const conversation = history[languagePair];
        const entryIndex = conversation.entries.findIndex(entry => entry.id === translationId);
        
        if (entryIndex !== -1) {
          conversation.entries.splice(entryIndex, 1);
          conversation.totalEntries = conversation.entries.length;
          
          // Update last updated time if there are remaining entries
          if (conversation.entries.length > 0) {
            conversation.lastUpdated = Math.max(...conversation.entries.map(e => e.timestamp));
          }
          
          found = true;
        }
      });

      // Remove empty conversations
      Object.keys(history).forEach(languagePair => {
        if (history[languagePair].entries.length === 0) {
          delete history[languagePair];
        }
      });

      if (found) {
        await this.saveHistory(history);
        console.log(`Translation ${translationId} deleted successfully`);
      } else {
        throw new Error('Translation not found');
      }
    } catch (error) {
      console.error('Failed to delete translation:', error);
      throw error;
    }
  }

  /**
   * Get conversation for a specific language pair
   */
  static async getConversation(fromLanguage: string, toLanguage: string): Promise<LanguagePairConversation | null> {
    const history = await this.loadHistory();
    const languagePair = this.getLanguagePairKey(fromLanguage, toLanguage);
    return history[languagePair] || null;
  }

  /**
   * Clear all history
   */
  static async clearAllHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TRANSLATION_HISTORY_KEY);
      console.log('Translation history cleared');
    } catch (error) {
      console.error('Failed to clear translation history:', error);
    }
  }

  /**
   * Clear history for a specific language pair
   */
  static async clearConversation(fromLanguage: string, toLanguage: string): Promise<void> {
    try {
      const history = await this.loadHistory();
      const languagePair = this.getLanguagePairKey(fromLanguage, toLanguage);
      delete history[languagePair];
      await this.saveHistory(history);
      console.log(`Cleared conversation for ${languagePair}`);
    } catch (error) {
      console.error('Failed to clear conversation:', error);
    }
  }

  /**
   * Generate a consistent language pair key (bidirectional)
   */
  private static getLanguagePairKey(lang1: string, lang2: string): string {
    // Always put languages in alphabetical order for consistency
    return lang1 < lang2 ? `${lang1}-${lang2}` : `${lang2}-${lang1}`;
  }

  /**
   * Generate display name for language pair
   */
  private static getLanguagePairDisplayName(lang1: string, lang2: string): string {
    const name1 = getLanguageDisplayName(lang1);
    const name2 = getLanguageDisplayName(lang2);
    return `${name1} ↔ ${name2}`;
  }

  /**
   * Get statistics about translation history
   */
  static async getStatistics(): Promise<{
    totalConversations: number;
    totalTranslations: number;
    mostUsedLanguagePair: string | null;
  }> {
    const conversations = await this.getAllConversations();
    const totalConversations = conversations.length;
    const totalTranslations = conversations.reduce((sum, conv) => sum + conv.totalEntries, 0);
    
    let mostUsedLanguagePair = null;
    if (conversations.length > 0) {
      const sorted = conversations.sort((a, b) => b.totalEntries - a.totalEntries);
      mostUsedLanguagePair = sorted[0].displayName;
    }

    return {
      totalConversations,
      totalTranslations,
      mostUsedLanguagePair,
    };
  }

  /**
   * Save a vocabulary entry
   */
  static async saveVocabularyEntry(
    originalWord: string,
    translatedWord: string,
    fromLanguage: string,
    toLanguage: string,
    notes?: string
  ): Promise<void> {
    try {
      const entry: VocabularyEntry = {
        id: `vocab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        originalWord,
        translatedWord,
        fromLanguage,
        toLanguage,
        timestamp: Date.now(),
        notes,
      };

      const vocabularyList = await this.getVocabularyList();
      
      // Check if this word pair already exists
      const existingEntry = vocabularyList.find(
        v => v.originalWord.toLowerCase() === originalWord.toLowerCase() && 
             v.fromLanguage === fromLanguage && 
             v.toLanguage === toLanguage
      );
      
      if (existingEntry) {
        throw new Error('This word is already in your vocabulary list');
      }

      vocabularyList.push(entry);
      await AsyncStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(vocabularyList));
      console.log('Vocabulary entry saved:', entry);
    } catch (error) {
      console.error('Failed to save vocabulary entry:', error);
      throw error;
    }
  }

  /**
   * Get all vocabulary entries
   */
  static async getVocabularyList(): Promise<VocabularyEntry[]> {
    try {
      const stored = await AsyncStorage.getItem(VOCABULARY_STORAGE_KEY);
      const vocabularyList = stored ? JSON.parse(stored) : [];
      return vocabularyList.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to load vocabulary list:', error);
      return [];
    }
  }

  /**
   * Delete a vocabulary entry
   */
  static async deleteVocabularyEntry(entryId: string): Promise<void> {
    try {
      const vocabularyList = await this.getVocabularyList();
      const filteredList = vocabularyList.filter(entry => entry.id !== entryId);
      await AsyncStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(filteredList));
      console.log(`Vocabulary entry ${entryId} deleted`);
    } catch (error) {
      console.error('Failed to delete vocabulary entry:', error);
      throw error;
    }
  }

  /**
   * Clear all vocabulary entries
   */
  static async clearVocabulary(): Promise<void> {
    try {
      await AsyncStorage.removeItem(VOCABULARY_STORAGE_KEY);
      console.log('Vocabulary cleared');
    } catch (error) {
      console.error('Failed to clear vocabulary:', error);
    }
  }
}