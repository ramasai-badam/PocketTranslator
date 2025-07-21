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
}