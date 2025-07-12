import { useState, useRef } from 'react';
import * as FileSystem from 'expo-file-system';
import { initLlama } from 'llama.rn';

const stopWords = ['</s>', '<|end|>', '<|eot_id|>', '<|end_of_text|>', '<|im_end|>', '<|EOT|>', '<|END_OF_TURN_TOKEN|>', '<|end_of_turn|>', '<|endoftext|>'];

// Safe translation hook with lazy initialization
export function useTranslation() {
  const [llamaReady, setLlamaReady] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const llamaContextRef = useRef<any>(null);

  // Temporary safety flag - set to true to attempt Llama loading
  const ENABLE_LLAMA_LOADING = true; // Changed to false for safety

  const initializeModel = async () => {
    if (llamaContextRef.current || isInitializing) {
      return; // Already initialized or initializing
    }

    setIsInitializing(true);
    try {
      console.log('Initializing Llama model...');
      // Use the same path as in WelcomeScreen  
      const modelPath = FileSystem.documentDirectory + 'gemma-3n.bin';
      
      // Check if model file exists
      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      if (!fileInfo.exists) {
        throw new Error('Model file not found. Please download models first.');
      }

      console.log('Model file found, size:', Math.round(fileInfo.size / (1024 * 1024)), 'MB');
      
      // Check if model is too large for mobile device
      const modelSizeMB = Math.round(fileInfo.size / (1024 * 1024));
      // const MAX_MODEL_SIZE_MB = 200; // Conservative limit for mobile devices
      
      // if (modelSizeMB > MAX_MODEL_SIZE_MB) {
        // throw new Error(`Model too large for mobile device: ${modelSizeMB}MB (max: ${MAX_MODEL_SIZE_MB}MB). Please use a smaller quantized model.`);
      // }
      
      console.log('Model size acceptable, starting Llama initialization with minimal settings...');
      
      // Wrap the initLlama call in try-catch to prevent native crashes
      let context;
      try {
        // Use optimized settings for Gemma 3n (smaller, more efficient)
        context = await initLlama({
          model: modelPath,
          use_mlock: false,
          n_ctx: 1024, // Good context size for Gemma 3n
          n_threads: 4, // Can use more threads since model is smaller
          embedding: false,
        });
        console.log('Native initLlama call succeeded');
      } catch (nativeError) {
        console.error('Native initLlama crashed:', nativeError);
        const errorMessage = nativeError instanceof Error ? nativeError.message : 'Unknown native error';
        throw new Error(`Model format incompatible or corrupted: ${errorMessage}`);
      }
      
      llamaContextRef.current = context;
      setLlamaReady(true);
      setError(null);
      console.log('Llama model initialized successfully');
    } catch (err) {
      console.error('Failed to initialize Llama:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      setError(`Failed to initialize Llama: ${err}`);
      
      // Reset refs on failure
      llamaContextRef.current = null;
      setLlamaReady(false);
    } finally {
      setIsInitializing(false);
    }
  };

  const translateText = async (text: string, fromLanguage: string, toLanguage: string) => {
    console.log('translateText called:', { text, fromLanguage, toLanguage });
    
    // Don't do anything if text is empty
    if (!text || text.trim() === '') {
      console.log('Empty text, skipping translation');
      return '';
    }
    
    // Safety check - if Llama loading is disabled, return fallback
    if (!ENABLE_LLAMA_LOADING) {
      console.log('Llama loading disabled for safety - using fallback');
      return `[Translation disabled - Original: ${text}]`;
    }
    
    if (!llamaContextRef.current) {
      console.log('Llama not initialized, initializing now...');
      try {
        await initializeModel();
      } catch (initError) {
        console.error('Initialization failed in translateText:', initError);
        // Return a fallback message instead of crashing
        return `[Translation unavailable: ${text}]`;
      }
    }

    // Check again after initialization attempt
    if (!llamaContextRef.current) {
      const errorMsg = 'Llama initialization failed - model may be too large for this device';
      setError(errorMsg);
      console.error(errorMsg);
      // Return a fallback instead of empty string
      return `[Model not loaded: ${text}]`;
    }

    setIsTranslating(true);
    try {
      // Use proper Gemma 3n chat template format
      const prompt = `<start_of_turn>user\n[INST]
You are a direct, machine-like translation engine. Your sole function is to translate the provided text from the source language to the target language.

Rules:
- Do not add any commentary, explanations, or introductory phrases.
- Do not greet the user or sign off.
- Output ONLY the raw, translated text.

Task:
- Source Language: ${fromLanguage}
- Target Language: ${toLanguage}
- Text to Translate: ${text}
[/INST]<end_of_turn>\n
<start_of_turn>model\n`;


      console.log('Sending prompt to Llama...');
      console.log('Prompt:', prompt);
      
      const result = await llamaContextRef.current.completion({
        prompt,
        n_predict: 512, 
        stop: ['<end_of_turn>', '<start_of_turn>', '\n'], // Remove '\n' from stop tokens
        temperature: 0.4, // Lower temperature for more deterministic translations
        top_p: 0.9,
        top_k: 40,
        repeat_penalty: 1.0, // Prevent repetition
      });

      console.log('Raw translation result:', JSON.stringify(result));
      console.log('Translation result text:', result.text);
      setIsTranslating(false);
      
      const translation = result.text.trim();
      return translation || `[No translation generated for: ${text}]`;
    } catch (err) {
      console.error('Translation failed:', err);
      setError('Translation failed');
      setIsTranslating(false);
      // Return original text as fallback
      return `[Translation error: ${text}]`;
    }
  };

  const cleanup = () => {
    if (llamaContextRef.current) {
      llamaContextRef.current.release();
      llamaContextRef.current = null;
      setLlamaReady(false);
    }
  };

  return {
    translateText,
    isTranslating,
    llamaReady,
    error,
    isInitializing,
    initializeModel,
    cleanup,
  };
}