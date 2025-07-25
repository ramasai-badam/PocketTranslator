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
}

 // Mock linguistic analysis for UI testing
 static async getLinguisticAnalysisWithLlama(
   originalText: string,
   fromLanguage: string,
   translatedText: string,
   toLanguage: string
 ): Promise<any> {
   // Simulate LLM processing time
   await new Promise(resolve => setTimeout(resolve, 2000));
   
   // Mock data based on the language pair
   if (fromLanguage === 'ja' && toLanguage === 'en') {
     return {
       sentence: originalText,
       tokens: [
         {
           japanese: "あなた",
           english: "you",
           part_of_speech: "pronoun",
           relation: "subject"
         },
         {
           japanese: "の",
           english: "possessive particle",
           part_of_speech: "particle",
           relation: "possessive link to '名前'"
         },
         {
           japanese: "名前",
           english: "name",
           part_of_speech: "noun",
           relation: "object of the possessive particle 'の'"
         },
         {
           japanese: "は",
           english: "topic marker",
           part_of_speech: "particle",
           relation: "topic of the question"
         },
         {
           japanese: "何",
           english: "what",
           part_of_speech: "pronoun",
           relation: "question word"
         },
         {
           japanese: "です",
           english: "is",
           part_of_speech: "copula",
           relation: "verb, indicates a state of being"
         },
         {
           japanese: "か",
           english: "question marker",
           part_of_speech: "particle",
           relation: "marks the sentence as a question"
         }
       ],
       english_translation: translatedText,
       sentence_meaning: "This sentence asks the listener for their name.",
       explanation: "Subject-Object: 'あなた' (you) is the subject and '名前' (name) is the object of the possessive.\n\nPossessive Link: 'の' (possessive particle) links 'あなた' (you) to '名前' (name), indicating that 'name' belongs to 'you'.\n\nTopic Marker: 'は' (topic marker) indicates that '名前' (name) is the topic of the sentence.\n\nQuestion Word: '何' (what) is the question word.\n\nCopula: 'です' (is) is the copula, which connects the subject and predicate in a declarative sentence.\n\nQuestion Marker: 'か' (question marker) transforms the sentence into a question."
     };
   } else if (fromLanguage === 'es' && toLanguage === 'en') {
     return {
       sentence: originalText,
       tokens: [
         {
           spanish: "Hola",
           english: "hello",
           part_of_speech: "interjection",
           relation: "greeting"
         },
         {
           spanish: "¿cómo",
           english: "how",
           part_of_speech: "adverb",
           relation: "question word asking about manner"
         },
         {
           spanish: "estás?",
           english: "are you",
           part_of_speech: "verb",
           relation: "second person singular present tense of 'estar'"
         }
       ],
       english_translation: translatedText,
       sentence_meaning: "This is a casual greeting asking about someone's current state or well-being.",
       explanation: "Greeting: 'Hola' is a standard informal greeting in Spanish.\n\nQuestion Formation: '¿cómo estás?' uses the interrogative word 'cómo' (how) with the verb 'estar' (to be) in the second person singular form.\n\nVerb Choice: Spanish uses 'estar' (temporary state) rather than 'ser' (permanent state) when asking about someone's current condition or feelings."
     };
   } else {
     // Generic mock for other language pairs
     const words = originalText.split(/\s+/).filter(w => w.length > 0);
     const translatedWords = translatedText.split(/\s+/).filter(w => w.length > 0);
     
     return {
       sentence: originalText,
       tokens: words.map((word, index) => ({
         original: word,
         english: translatedWords[index] || "translation",
         part_of_speech: "word",
         relation: `word ${index + 1} in the sentence`
       })),
       english_translation: translatedText,
       sentence_meaning: "This sentence demonstrates the linguistic breakdown feature.",
       explanation: "This is a mock analysis showing how words relate to each other in the sentence structure."
     };
   }
 }
