// Simple in-memory storage for language pack status
import { SUPPORTED_LANGUAGES, getDefaultLanguageCodes, getLanguageFullName } from './LanguageConfig';

let downloadedLanguagePacks: { [key: string]: boolean } = {};

export interface LanguagePack {
  code: string;
  name: string;
  isDefault: boolean;
  isDownloaded: boolean;
  isDownloading?: boolean;
}

// Default language packs available on most devices
const DEFAULT_LANGUAGE_PACKS = getDefaultLanguageCodes();

// Convert supported languages to language packs format
export const AVAILABLE_LANGUAGE_PACKS = SUPPORTED_LANGUAGES.map(lang => ({
  code: lang.code,
  name: getLanguageFullName(lang.code),
  isDefault: lang.isDefault || false,
}));

export class LanguagePackManager {
  /**
   * Get all language packs with their download status
   */
  static async getAllLanguagePacks(): Promise<LanguagePack[]> {
    return AVAILABLE_LANGUAGE_PACKS.map(pack => ({
      ...pack,
      isDownloaded: pack.isDefault || downloadedLanguagePacks[pack.code] === true,
    }));
  }

  /**
   * Check if a specific language pack is available
   */
  static async isLanguagePackAvailable(languageCode: string): Promise<boolean> {
    // Default languages are always available
    if (DEFAULT_LANGUAGE_PACKS.includes(languageCode)) {
      return true;
    }

    return downloadedLanguagePacks[languageCode] === true;
  }

  /**
   * Mark a language pack as downloaded
   */
  static async markLanguagePackAsDownloaded(languageCode: string): Promise<void> {
    downloadedLanguagePacks[languageCode] = true;
    console.log(`Language pack ${languageCode} marked as downloaded`);
  }

  /**
   * Mark a language pack as removed
   */
  static async markLanguagePackAsRemoved(languageCode: string): Promise<void> {
    // Don't allow removing default languages
    if (DEFAULT_LANGUAGE_PACKS.includes(languageCode)) {
      throw new Error(`Cannot remove default language pack: ${languageCode}`);
    }

    delete downloadedLanguagePacks[languageCode];
    console.log(`Language pack ${languageCode} marked as removed`);
  }

  /**
   * Get the list of downloaded language codes
   */
  static async getDownloadedLanguageCodes(): Promise<string[]> {
    const downloadedCodes = Object.keys(downloadedLanguagePacks).filter(code => downloadedLanguagePacks[code]);
    
    // Always include default languages
    return [...new Set([...DEFAULT_LANGUAGE_PACKS, ...downloadedCodes])];
  }

  /**
   * Check if speech recognition should work for a given language
   */
  static async canRecognizeSpeech(languageCode: string): Promise<boolean> {
    return await this.isLanguagePackAvailable(languageCode);
  }
}
