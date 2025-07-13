import { useState, useRef } from 'react';
import * as FileSystem from 'expo-file-system';
import { initLlama } from 'llama.rn';
import { getModelPath } from '@/utils/ModelConfig';

const stopWords = ['</s>', '<|end|>', '<|eot_id|>', '<|end_of_text|>', '<|im_end|>', '<|EOT|>', '<|END_OF_TURN_TOKEN|>', '<|end_of_turn|>', '<|endoftext|>'];

// Safe translation hook with lazy initialization
export function useTranslation() {
  const [llamaReady, setLlamaReady] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const llamaContextRef = useRef<any>(null);

  // Temporary safety flag - set to true to attempt Llama loading
  const ENABLE_LLAMA_LOADING = true;

  const initializeModel = async () => {
    if (llamaContextRef.current || isInitializing) {
      return; // Already initialized or initializing
    }

    setIsInitializing(true);
    try {
      console.log('Initializing Llama model...');
      const modelPath = getModelPath('llama');
      
      // Check if model file exists
      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      if (!fileInfo.exists) {
        throw new Error('Model file not found. Please download models first.');
      }

      console.log('Model file found, size:', Math.round(fileInfo.size / (1024 * 1024)), 'MB');

      const context = await initLlama({
        model: modelPath,
        use_mlock: false,
        n_ctx: 512,
        n_threads: 2, // Reduced threads for faster startup
        embedding: false,
      });

      llamaContextRef.current = context;
      setLlamaReady(true);
      setError(null);
      console.log('Llama model initialized successfully');
    } catch (err) {
      console.error('Failed to initialize Llama:', err);
      setError(`Failed to initialize Llama: ${err}`);
      llamaContextRef.current = null;
      setLlamaReady(false);
    } finally {
      setIsInitializing(false);
    }
  };

  const translateText = async (text: string, fromLanguage: string, toLanguage: string) => {
    console.log('translateText called:', { text, fromLanguage, toLanguage });
    
    if (!text || text.trim() === '') {
      console.log('Empty text, skipping translation');
      return '';
    }
    
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
        return `[Translation unavailable: ${text}]`;
      }
    }

    if (!llamaContextRef.current) {
      const errorMsg = 'Llama initialization failed - model may be too large for this device';
      setError(errorMsg);
      console.error(errorMsg);
      return `[Model not loaded: ${text}]`;
    }

    setIsTranslating(true);
    try {
      const prompt = `<start_of_turn>user
[INST]
You are a direct, machine-like translation engine. Your sole function is to translate the provided text from the source language to the target language.

Rules:
- Do not add any commentary, explanations, or introductory phrases.
- Do not greet the user or sign off.
- Output ONLY the raw, translated text.

Task:
- Source Language: ${fromLanguage}
- Target Language: ${toLanguage}
- Text to Translate: ${text}
[/INST]<end_of_turn>
<start_of_turn>model
`;

      console.log('Sending prompt to Llama...');
      
      const result = await llamaContextRef.current.completion({
        prompt,
        n_predict: 1024,
        stop: ['<end_of_turn>', '<start_of_turn>'],
        temperature: 0.4,
        top_p: 0.9,
        top_k: 40,
        repeat_penalty: 1.0,
      });

      console.log('Translation result text:', result.text);
      setIsTranslating(false);
      
      const translation = result.text.trim();
      return translation || `[No translation generated for: ${text}]`;
    } catch (err) {
      console.error('Translation failed:', err);
      setError('Translation failed');
      setIsTranslating(false);
      return `[Translation error: ${text}]`;
    }
  };

  const cleanup = () => {
    if (llamaContextRef.current) {
      llamaContextRef.current.release();
      llamaContextRef.current = null;
    }
    console.log('Translation hook cleanup called');
  };

  return {
    translateText,
    isTranslating,
    error,
    cleanup,
  };
}