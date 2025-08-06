// Persistent storage for TTS voice availability
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPPORTED_LANGUAGES, getDefaultLanguageCodes, getLanguageFullName } from './LanguageConfig';

const TTS_VOICES_STORAGE_KEY = 'enabledTTSVoices';

export interface TTSVoice {
  code: string;
  name: string;
  isDefault: boolean;
  isAvailable: boolean;
  isDownloading?: boolean;
}

// Default TTS voices usually available on most devices
const DEFAULT_TTS_VOICES = getDefaultLanguageCodes();

// Convert supported languages to TTS voices format
export const AVAILABLE_TTS_VOICES = SUPPORTED_LANGUAGES.map(lang => ({
  code: lang.code,
  name: getLanguageFullName(lang.code),
  isDefault: lang.isDefault || false,
}));

export class TTSVoiceManager {
  /**
   * Load enabled TTS voices from persistent storage
   */
  private static async loadEnabledTTSVoices(): Promise<{ [key: string]: boolean }> {
    try {
      const stored = await AsyncStorage.getItem(TTS_VOICES_STORAGE_KEY);
      const result = stored ? JSON.parse(stored) : {};
      console.log('Loaded TTS voices from storage:', result);
      return result;
    } catch (error) {
      console.error('Failed to load TTS voices from storage:', error);
      return {};
    }
  }

  /**
   * Save enabled TTS voices to persistent storage
   */
  private static async saveEnabledTTSVoices(enabledVoices: { [key: string]: boolean }): Promise<void> {
    try {
      console.log('Saving TTS voices to storage:', enabledVoices);
      await AsyncStorage.setItem(TTS_VOICES_STORAGE_KEY, JSON.stringify(enabledVoices));
      console.log('TTS voices saved successfully');
    } catch (error) {
      console.error('Failed to save TTS voices to storage:', error);
    }
  }

  /**
   * Get all TTS voices with their availability status
   */
  static async getAllTTSVoices(): Promise<TTSVoice[]> {
    const enabledVoices = await this.loadEnabledTTSVoices();
    
    return AVAILABLE_TTS_VOICES.map(voice => ({
      ...voice,
      isAvailable: voice.isDefault || enabledVoices[voice.code] === true,
    }));
  }

  /**
   * Check if a specific TTS voice is available
   */
  static async isTTSVoiceAvailable(languageCode: string): Promise<boolean> {
    // Default voices are always available
    if (DEFAULT_TTS_VOICES.includes(languageCode)) {
      return true;
    }

    const enabledVoices = await this.loadEnabledTTSVoices();
    return enabledVoices[languageCode] === true;
  }

  /**
   * Mark a TTS voice as available
   */
  static async markTTSVoiceAsAvailable(languageCode: string): Promise<void> {
    const enabledVoices = await this.loadEnabledTTSVoices();
    enabledVoices[languageCode] = true;
    await this.saveEnabledTTSVoices(enabledVoices);
    console.log(`TTS voice ${languageCode} marked as available and saved`);
  }

  /**
   * Mark a TTS voice as unavailable
   */
  static async markTTSVoiceAsUnavailable(languageCode: string): Promise<void> {
    // Don't allow removing default voices
    if (DEFAULT_TTS_VOICES.includes(languageCode)) {
      throw new Error(`Cannot remove default TTS voice: ${languageCode}`);
    }

    const enabledVoices = await this.loadEnabledTTSVoices();
    delete enabledVoices[languageCode];
    await this.saveEnabledTTSVoices(enabledVoices);
    console.log(`TTS voice ${languageCode} marked as unavailable and saved`);
  }

  /**
   * Get the list of available TTS voice codes
   */
  static async getAvailableTTSVoices(): Promise<string[]> {
    const enabledVoices = await this.loadEnabledTTSVoices();
    const enabledCodes = Object.keys(enabledVoices).filter(code => enabledVoices[code]);
    
    // Always include default voices
    return [...new Set([...DEFAULT_TTS_VOICES, ...enabledCodes])];
  }

  /**
   * Check if text-to-speech should work for a given language
   */
  static async canSpeakLanguage(languageCode: string): Promise<boolean> {
    return await this.isTTSVoiceAvailable(languageCode);
  }
}

// For backward compatibility, keep the old exports but redirect to TTS
export const LanguagePackManager = {
  getAllLanguagePacks: TTSVoiceManager.getAllTTSVoices,
  isLanguagePackAvailable: TTSVoiceManager.isTTSVoiceAvailable,
  markLanguagePackAsDownloaded: TTSVoiceManager.markTTSVoiceAsAvailable,
  markLanguagePackAsRemoved: TTSVoiceManager.markTTSVoiceAsUnavailable,
  getDownloadedLanguageCodes: TTSVoiceManager.getAvailableTTSVoices,
  canRecognizeSpeech: () => Promise.resolve(true), // Always true since Whisper supports many languages
};

// Export the new TTS voices array
export const AVAILABLE_LANGUAGE_PACKS = AVAILABLE_TTS_VOICES;
