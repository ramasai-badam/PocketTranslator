import * as FileSystem from 'expo-file-system';
import { initLlama } from 'llama.rn';
import { initWhisper } from 'whisper.rn';
import { getModelPath } from './ModelConfig';

// Global model contexts to persist across component unmounts
let llamaContext: any = null;
let whisperContext: any = null;
let isLlamaInitializing = false;
let isWhisperInitializing = false;

// Streaming functionality
let isStreamingEnabled = true; // Re-enable streaming now that basic translation works
const streamingListeners = new Set<(chunk: string, isComplete: boolean) => void>();

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

  // Streaming functionality methods
  static enableStreaming(enabled: boolean = true): void {
    isStreamingEnabled = enabled;
    console.log(`🌊 Streaming ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  static isStreamingEnabled(): boolean {
    return isStreamingEnabled;
  }

  static addStreamingListener(listener: (chunk: string, isComplete: boolean) => void): () => void {
    streamingListeners.add(listener);
    return () => streamingListeners.delete(listener);
  }

  static notifyStreamingListeners(chunk: string, isComplete: boolean = false): void {
    streamingListeners.forEach(listener => listener(chunk, isComplete));
  }

  // Main translation method with streaming support
  static async translateText(text: string, fromLang: string, toLang: string): Promise<string> {
    if (!llamaContext) {
      throw new Error('Llama context not initialized');
    }

    const startTime = Date.now();

    try {
      // Simple, direct prompt using the specified format
      const prompt = `<start_of_turn>user
Translate this ${fromLang} text to ${toLang}: "${text}"
Give only the ${toLang} translation.<end_of_turn>
<start_of_turn>model
`;

      console.log(`🚀 Sending prompt: ${prompt.length} characters`);

      let fullTranslation = '';

      if (isStreamingEnabled) {
        
        let hasRealStreaming = false;
        let streamingBuffer = '';
        
        // Use the correct streaming callback as per documentation
        // completion(params, callback?) - callback is the second parameter
        const result = await llamaContext.completion({
          prompt,
          n_predict: 64,
          temperature: 0.0,
          top_p: 0.1,
          top_k: 1,
          stop: ['<end_of_turn>', '<start_of_turn>'],
          seed: 42,
        }, (data: any) => {
          // This is the real streaming callback!
          hasRealStreaming = true;
          console.log('🌊 Real streaming data received:', data);
          
          // Handle different possible data structures from TokenData
          let token = '';
          if (typeof data === 'string') {
            token = data;
          } else if (data && data.token) {
            token = data.token;
          } else if (data && data.text) {
            token = data.text;
          } else if (data && data.content) {
            token = data.content;
          }
          
          if (token) {
            streamingBuffer += token;
            console.log(`🌊 Real token: "${token}" | Buffer: "${streamingBuffer}"`);
            this.notifyStreamingListeners(token, false);
          }
        });

        // If real streaming worked, use the buffer, otherwise use result
        if (hasRealStreaming && streamingBuffer) {
          fullTranslation = streamingBuffer.trim();
          console.log('🌊 Using real streaming buffer:', fullTranslation);
        } else {
          fullTranslation = result.text?.trim() || '';
          console.log('🌊 Real streaming failed, using completion result:', fullTranslation);
          
          // If we have a result but no streaming, simulate it for UX
          if (fullTranslation && !hasRealStreaming) {
            console.log('🌊 Simulating streaming with real result...');
            for (let i = 0; i < fullTranslation.length; i++) {
              const char = fullTranslation[i];
              console.log(`🌊 Simulated char: "${char}"`);
              this.notifyStreamingListeners(char, false);
              // Faster simulation since it's fallback
              await new Promise(resolve => setTimeout(resolve, 30));
            }
          }
        }
        
        // Signal completion
        this.notifyStreamingListeners('', true);
        
      } else {
        console.log('📝 Non-streaming translation...');
        
        // Non-streaming fallback
        const result = await llamaContext.completion({
          prompt,
          n_predict: 64,
          temperature: 0.0,
          top_p: 0.1,
          top_k: 1,
          stop: ['<end_of_turn>', '<start_of_turn>'],
          seed: 42,
        });
        
        fullTranslation = result.text?.trim() || '';
        console.log('📝 Non-streaming result:', result);
        console.log('📝 Non-streaming text:', fullTranslation);
      }

      // Ensure we have some result
      if (!fullTranslation) {
        console.error('❌ No translation result obtained');
        fullTranslation = `[Translation failed - no result]`;
      }

      const translationTime = Date.now() - startTime;
      console.log(`🚀 Translation completed in ${translationTime}ms: "${fullTranslation}"`);
      
      return fullTranslation;
      
    } catch (error) {
      console.error(`🚀 Translation failed for ${fromLang} → ${toLang}:`, error);
      // Signal completion even on error
      this.notifyStreamingListeners('', true);
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

  // Mock linguistic analysis for UI testing
  static async getLinguisticAnalysisWithLlama(
    originalText: string,
    fromLanguage: string,
    translatedText: string,
    toLanguage: string
  ): Promise<any> {
    console.log('🔍 Starting real linguistic analysis...');
    console.log('📝 Input:', { originalText, fromLanguage, translatedText, toLanguage });
    
    if (!llamaContext) {
      throw new Error('Llama context not initialized');
    }

    // Construct the LLM prompt for linguistic analysis
    const prompt = `<start_of_turn>user
Perform a detailed linguistic analysis of this ${fromLanguage} sentence: "${originalText}"

Provide ALL explanations, grammatical terms, and analysis content in ${fromLanguage}. Only provide English translations for individual words.
Provide the analysis in strict JSON format with these exact fields:
{
  "sentence": "${originalText}",
  "tokens": [
    {
      "${fromLanguage}": "original_word",
      "english": "english_translation_of_word",
      "${toLanguage}": "translation_to_${toLanguage}",
      "part_of_speech": "part_of_speech_explained_in_${fromLanguage}",
      "relation": "grammatical_relation_explained_in_${fromLanguage}"
    }
  ],
  "full_sentence_translation_in_target_language": "complete_translation_in_${toLanguage}",
  "sentence_meaning": "detailed_meaning_and_context_explanation_in_${fromLanguage}",
  "explanation": "comprehensive_grammatical_structure_explanation_in_${fromLanguage}"
}

- explanation should describe the grammatical structure and relationships
- Ensure the JSON object is complete and properly closed
- Return ONLY the complete JSON object
<end_of_turn>
<start_of_turn>model
`;

    console.log('🚀 Sending linguistic analysis prompt...');
    
    try {
      const result = await llamaContext.completion({
        prompt,
        n_predict: 1500, // Further increase token limit to avoid truncation
        temperature: 0.0,
        top_p: 0.1,
        top_k: 1,
        stop: ['<end_of_turn>', '<start_of_turn>'],
        seed: 42,
      });

      console.log('📥 Raw LLM response:', result.text);
      
      // Parse the JSON response
      let jsonText = result.text?.trim() || '';
      
      // Check if response was truncated
      if (!jsonText.includes('}') || jsonText.endsWith('part')) {
        console.error('⚠️ Response appears to be truncated:', jsonText.slice(-50));
        throw new Error('LLM response was truncated. Please try again.');
      }
      
      // Remove markdown code fences if present
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      
      console.log('🔧 Cleaned JSON text:', jsonText);
      
      // Additional validation - ensure JSON ends properly
      if (!jsonText.trim().endsWith('}')) {
        console.error('⚠️ JSON does not end properly:', jsonText.slice(-100));
        throw new Error('Incomplete JSON response. Please try again.');
      }
      
      const analysis = JSON.parse(jsonText);
      console.log('✅ Parsed analysis:', analysis);
      
      return analysis;
      
    } catch (error) {
      console.error('❌ Linguistic analysis failed:', error);
      throw new Error(`Failed to analyze sentence structure: ${error}`);
    }
  }
}