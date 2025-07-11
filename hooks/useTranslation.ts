import { useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import { initLlama } from 'llama.rn';

export function useTranslation() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [llamaContext, setLlamaContext] = useState<any>(null);
  const [llamaReady, setLlamaReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initLlamaModel = async () => {
      try {
        // Use a smaller, more suitable model for translation
        const modelUrl = 'https://huggingface.co/microsoft/DialoGPT-medium/resolve/main/pytorch_model.bin';
        const modelPath = FileSystem.documentDirectory + 'translation-model.bin';

        // Check if model exists, if not download it
        const fileInfo = await FileSystem.getInfoAsync(modelPath);
        if (!fileInfo.exists) {
          console.log('Downloading translation model...');
          await FileSystem.downloadAsync(modelUrl, modelPath);
        }

        // Initialize Llama context
        const context = await initLlama({
          model: modelPath,
          use_mlock: true,
          n_ctx: 2048,
          n_gpu_layers: 0, // Use CPU for compatibility
        });

        setLlamaContext(context);
        setLlamaReady(true);
        console.log('Translation model initialized successfully');
      } catch (err) {
        console.error('Failed to initialize translation model:', err);
        setError('Failed to initialize translation model');
        // For now, set ready to true so app doesn't hang
        setLlamaReady(true);
      }
    };

    initLlamaModel();

    return () => {
      if (llamaContext) {
        llamaContext.release();
      }
    };
  }, []);

  const translateText = async (
    text: string,
    fromLanguage: string,
    toLanguage: string
  ): Promise<string> => {
    if (!text.trim()) return '';
    
    setIsTranslating(true);
    
    try {
      if (!llamaContext || !llamaReady) {
        // Fallback: return original text with language indicator
        return `[${toLanguage.toUpperCase()}] ${text}`;
      }

      const prompt = `Translate the following text from ${fromLanguage} to ${toLanguage}:
      
Text: "${text}"

Translation:`;

      const result = await llamaContext.completion({
        prompt,
        n_predict: 100,
        stop: ['\n', 'Text:', 'Translation:'],
        temperature: 0.3,
      });

      const translation = result.text?.trim() || text;
      return translation;
    } catch (err) {
      console.error('Translation error:', err);
      // Fallback: return original text with language indicator
      return `[${toLanguage.toUpperCase()}] ${text}`;
    } finally {
      setIsTranslating(false);
    }
  };

  return {
    translateText,
    isTranslating,
    llamaReady,
    error,
  };
}