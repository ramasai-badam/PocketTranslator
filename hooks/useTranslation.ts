import { useState, useRef, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import { ModelManager } from '@/utils/ModelManager';

const stopWords = ['</s>', '<|end|>', '<|eot_id|>', '<|end_of_text|>', '<|im_end|>', '<|EOT|>', '<|END_OF_TURN_TOKEN|>', '<|end_of_turn|>', '<|endoftext|>'];

// Safe translation hook using ModelManager singleton
export function useTranslation() {
  const [llamaReady, setLlamaReady] = useState(ModelManager.isLlamaReady());
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(ModelManager.isLlamaInitializing());

  // Temporary safety flag - set to true to attempt Llama loading
  const ENABLE_LLAMA_LOADING = true;

  // Listen to ModelManager state changes
  useEffect(() => {
    const unsubscribe = ModelManager.addListener(() => {
      setLlamaReady(ModelManager.isLlamaReady());
      setIsInitializing(ModelManager.isLlamaInitializing());
    });
    return unsubscribe;
  }, []);

  const initializeModel = async () => {
    if (ModelManager.isLlamaReady() || ModelManager.isLlamaInitializing()) {
      return; // Already initialized or initializing
    }

    try {
      console.log('Llama not initialized, initializing now...');
      await ModelManager.initializeLlama();
      console.log('Llama model initialized successfully');
    } catch (err) {
      console.error('Failed to initialize Llama:', err);
      setError(`Failed to initialize Llama: ${err}`);
      setLlamaReady(false);
    }
  };

  const translateText = async (text: string, fromLanguage: string, toLanguage: string) => {
    console.log('translateText called:', { text, fromLanguage, toLanguage });
    
    // Start timing the complete translation process
    const totalStartTime = Date.now();
    console.log('⏱️ TRANSLATION PROCESS START:', new Date().toISOString());
    
    if (!text || text.trim() === '') {
      console.log('Empty text, skipping translation');
      return '';
    }
    
    if (!ENABLE_LLAMA_LOADING) {
      console.log('Llama loading disabled for safety - using fallback');
      return `[Translation disabled - Original: ${text}]`;
    }
    
    if (!ModelManager.isLlamaReady()) {
      console.log('Llama not initialized, initializing now...');
      try {
        await initializeModel();
      } catch (initError) {
        console.error('Initialization failed in translateText:', initError);
        return `[Translation unavailable: ${text}]`;
      }
    }

    if (!ModelManager.isLlamaReady()) {
      const errorMsg = 'Llama initialization failed - model may be too large for this device';
      setError(errorMsg);
      console.error(errorMsg);
      return `[Model not loaded: ${text}]`;
    }

    setIsTranslating(true);
    try {
      // Use the ModelManager's optimized translation method
      console.log('🚀 Using ModelManager.translateText with optimized prompts...');
      
      // Start timing the LLM inference
      const startTime = Date.now();
      console.log('⏱️ LLM INFERENCE START:', new Date().toISOString());
      
      const result = await ModelManager.translateText(text, fromLanguage, toLanguage);
      
      const translationTime = Date.now() - startTime;
      console.log('⏱️ LLM INFERENCE END:', new Date().toISOString());
      console.log('⏱️ LLM INFERENCE TIME:', translationTime, 'ms');
      console.log('⏱️ LLM INFERENCE TIME:', (translationTime / 1000).toFixed(2), 'seconds');

      // Clean the result to ensure only translation is returned
      const cleanedResult = result.trim();
      
      console.log('Translation result text:', cleanedResult);
      
      const totalTime = Date.now() - totalStartTime;
      console.log('⏱️ TRANSLATION PROCESS END:', new Date().toISOString());
      console.log('⏱️ TOTAL TRANSLATION TIME:', totalTime, 'ms');
      console.log('⏱️ TOTAL TRANSLATION TIME:', (totalTime / 1000).toFixed(2), 'seconds');
      console.log('🎯 TRANSLATION RESULT:', cleanedResult);
      
      setIsTranslating(false);
      return cleanedResult;
    } catch (err) {
      console.error('Translation failed:', err);
      setError('Translation failed');
      setIsTranslating(false);
      
      // End timing even on error
      const totalEndTime = Date.now();
      const totalDuration = totalEndTime - totalStartTime;
      console.log('⏱️ TRANSLATION PROCESS END (ERROR):', new Date().toISOString());
      console.log('⏱️ TOTAL TRANSLATION TIME (ERROR):', totalDuration, 'ms');
      
      return `[Translation error: ${text}]`;
    }
  };

  const cleanup = () => {
    // No cleanup needed as ModelManager handles the context
    console.log('Translation hook cleanup called');
  };

  return {
    translateText,
    isTranslating,
    error,
    cleanup,
  };
}