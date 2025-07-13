import * as FileSystem from 'expo-file-system';
import { initLlama } from 'llama.rn';
import { initWhisper } from 'whisper.rn';
import { getModelPath } from './ModelConfig';

// Global model contexts to persist across component unmounts
let llamaContext: any = null;
let whisperContext: any = null;
let isLlamaInitializing = false;
let isWhisperInitializing = false;

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
