import * as FileSystem from 'expo-file-system';
import { initLlama } from 'llama.rn';
import { initWhisper } from 'whisper.rn';
import { getModelPath } from './ModelConfig';

// Global model contexts to persist across component unmounts
let llamaContext: any = null;
let whisperContext: any = null;
let isLlamaInitializing = false;
let isWhisperInitializing = false;
let isSystemPromptLoaded = false; // Track if system prompt is loaded

// Event listeners for model state changes
const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

export class ModelManager {
  private static readonly MODEL_PATHS = {
    whisper: getModelPath('whisper'),
    llama: getModelPath('llama')
  };

  // Global model management methods
  static addListener(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  static isLlamaReady(): boolean {
    return llamaContext !== null;
  }

  static isWhisperReady(): boolean {
    return whisperContext !== null;
  }

  static isLlamaInitializing(): boolean {
    return isLlamaInitializing;
  }

  static isWhisperInitializing(): boolean {
    return isWhisperInitializing;
  }

  static getLlamaContext(): any {
    return llamaContext;
  }

  static getWhisperContext(): any {
    return whisperContext;
  }

  static isSystemPromptLoaded(): boolean {
    return isSystemPromptLoaded;
  }

  // 🚀 Pre-load system prompt at startup
  static async loadSystemPrompt(): Promise<boolean> {
    if (!llamaContext) {
      console.log('❌ Cannot load system prompt: Llama context not initialized');
      return false;
    }

    if (isSystemPromptLoaded) {
      console.log('✅ System prompt already loaded, skipping...');
      return true;
    }

    try {
      console.log('🚀 Loading system prompt...');
      const startTime = Date.now();
      
      // Simple, direct system prompt - very explicit about single translation
      const systemPrompt = `<start_of_turn>user
Translate text to the target language. Respond with only the direct translation. Do not provide alternatives, explanations, or multiple options.<end_of_turn>
<start_of_turn>model
I will provide only one direct translation.<end_of_turn>
<start_of_turn>user`;

      console.log(`🚀 System prompt length: ${systemPrompt.length} characters`);

      // Process the system prompt to establish context
      const result = await llamaContext.completion({
        prompt: systemPrompt,
        n_predict: 1, // Minimal prediction to just establish context
        temperature: 0.1,
        stop: ['<end_of_turn>'],
      });

      const loadTime = Date.now() - startTime;
      console.log(`✅ System prompt loaded successfully in ${loadTime}ms`);
      console.log(`� System prompt result:`, result.text || 'No result text');
      
      isSystemPromptLoaded = true;
      notifyListeners();
      return true;
      
    } catch (error) {
      console.error('❌ Failed to load system prompt:', error);
      isSystemPromptLoaded = false;
      return false;
    }
  }

  // Main translation method using system prompt
  static async translateText(text: string, fromLang: string, toLang: string): Promise<string> {
    console.log('🚀 USING SYSTEM PROMPT METHOD');
    console.log(`🚀 System prompt loaded: ${isSystemPromptLoaded}`);
    
    if (!llamaContext) {
      throw new Error('Llama context not initialized');
    }

    // Ensure system prompt is loaded
    if (!isSystemPromptLoaded) {
      console.log('⚠️ System prompt not loaded, loading now...');
      const loaded = await this.loadSystemPrompt();
      if (!loaded) {
        throw new Error('Failed to load system prompt');
      }
    }

    const startTime = Date.now();

    try {
      // Simple, direct prompt using the specified format
      const prompt = `<start_of_turn>user
Translate this ${fromLang} text to ${toLang}: "${text}"
Give only the ${toLang} translation.<end_of_turn>
<start_of_turn>model
`;

      console.log(`🚀 System prompt - sending prompt: ${prompt.length} characters`);
      console.log(`🚀 Prompt content: "${prompt}"`);

      const result = await llamaContext.completion({
        prompt,
        n_predict: 64, // Reduced to prevent long responses
        temperature: 0.0, // Zero temperature for deterministic output
        top_p: 0.1, // Very restrictive sampling
        top_k: 1, // Only the most likely token
        stop: ['<end_of_turn>', '<start_of_turn>'], // Essential Gemma stop tokens
        seed: 42, // Fixed seed for consistent comparison
      });

      const translationTime = Date.now() - startTime;
      const translatedText = result.text?.trim() || '';
      
      console.log(`🚀 Translation completed in ${translationTime}ms`);
      console.log(`🚀 Result: "${translatedText}"`);
      return translatedText;
      
    } catch (error) {
      console.error(`🚀 Translation failed for ${fromLang} → ${toLang}:`, error);
      throw error;
    }
  }

  // Initialize Llama model
  static async initializeLlama(): Promise<any> {
    if (llamaContext || isLlamaInitializing) {
      return llamaContext;
    }

    isLlamaInitializing = true;
    notifyListeners();

    try {
      console.log('ModelManager: Initializing Llama model...');
      const modelPath = getModelPath('llama');
      
      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      if (!fileInfo.exists) {
        throw new Error('Model file not found. Please download models first.');
      }

      console.log('ModelManager: Model file found, size:', Math.round(fileInfo.size / (1024 * 1024)), 'MB');

      const context = await initLlama({
        model: modelPath,
        n_ctx: 1024,
        n_threads: 6,
        embedding: false,
      });

      llamaContext = context;
      console.log('ModelManager: Llama model initialized successfully');
      
      notifyListeners();
      return context;
    } catch (error) {
      console.error('ModelManager: Failed to initialize Llama:', error);
      throw error;
    } finally {
      isLlamaInitializing = false;
      notifyListeners();
    }
  }

  // Initialize Whisper model
  static async initializeWhisper(): Promise<any> {
    if (whisperContext || isWhisperInitializing) {
      return whisperContext;
    }

    isWhisperInitializing = true;
    notifyListeners();

    try {
      console.log('ModelManager: Initializing Whisper model...');
      const modelPath = getModelPath('whisper');

      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      if (!fileInfo.exists) {
        throw new Error('Whisper model file not found. Please download models first.');
      }

      const context = await initWhisper({ filePath: modelPath });
      whisperContext = context;
      console.log('ModelManager: Whisper model initialized successfully');
      notifyListeners();
      return context;
    } catch (error) {
      console.error('ModelManager: Failed to initialize Whisper:', error);
      throw error;
    } finally {
      isWhisperInitializing = false;
      notifyListeners();
    }
  }

  // Initialize both models
  static async initializeAll(): Promise<void> {
    console.log('ModelManager: Initializing all models...');
    try {
      await Promise.all([
        ModelManager.initializeLlama(),
        ModelManager.initializeWhisper()
      ]);
      
      // 🚀 Pre-load system prompt for fast translation
      await ModelManager.loadSystemPrompt();
      
      console.log('ModelManager: All models initialized successfully');
    } catch (error) {
      console.error('ModelManager: Failed to initialize models:', error);
      throw error;
    }
  }

  // Check available storage space
  static async checkStorageSpace(): Promise<{ available: number; total: number }> {
    try {
      const diskInfo = await FileSystem.getFreeDiskStorageAsync();
      return {
        available: diskInfo,
        total: diskInfo // Note: Total space detection varies by platform
      };
    } catch (error) {
      console.error('Error checking storage space:', error);
      return { available: 0, total: 0 };
    }
  }

  // Get model file sizes
  static async getModelSizes(): Promise<{ whisper: number; llama: number; total: number }> {
    try {
      const whisperInfo = await FileSystem.getInfoAsync(this.MODEL_PATHS.whisper);
      const llamaInfo = await FileSystem.getInfoAsync(this.MODEL_PATHS.llama);
      
      const whisperSize = whisperInfo.exists ? (whisperInfo.size || 0) : 0;
      const llamaSize = llamaInfo.exists ? (llamaInfo.size || 0) : 0;
      
      return {
        whisper: whisperSize,
        llama: llamaSize,
        total: whisperSize + llamaSize
      };
    } catch (error) {
      console.error('Error getting model sizes:', error);
      return { whisper: 0, llama: 0, total: 0 };
    }
  }

  // Clear models to free space
  static async clearModels(): Promise<void> {
    try {
      for (const path of Object.values(this.MODEL_PATHS)) {
        const fileInfo = await FileSystem.getInfoAsync(path);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(path);
          console.log(`Deleted model: ${path}`);
        }
      }
    } catch (error) {
      console.error('Error clearing models:', error);
      throw error;
    }
  }

  // Check if models exist
  static async checkModelsExist(): Promise<{ whisper: boolean; llama: boolean; both: boolean }> {
    try {
      const whisperInfo = await FileSystem.getInfoAsync(this.MODEL_PATHS.whisper);
      const llamaInfo = await FileSystem.getInfoAsync(this.MODEL_PATHS.llama);
      
      const whisperExists = whisperInfo.exists;
      const llamaExists = llamaInfo.exists;
      
      return {
        whisper: whisperExists,
        llama: llamaExists,
        both: whisperExists && llamaExists
      };
    } catch (error) {
      console.error('Error checking model existence:', error);
      return { whisper: false, llama: false, both: false };
    }
  }

  // Format bytes to human readable
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
