import { useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import { initLlama } from 'llama.rn';

// This hook integrates with llama.rn for local translation
export function useTranslation() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [llamaContext, setLlamaContext] = useState<any>(null);
  const [llamaReady, setLlamaReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const setupLlamaModel = async () => {
      try {
        // Example GGUF model URL (replace with your actual model)
        const modelUrl = 'https://huggingface.co/unsloth/gemma-3n-E4B-it-GGUF/resolve/main/gemma-3n-E4B-it-UD-IQ2_XXS.gguf';
        const modelFileName = 'gemma-3n-E4B-it-UD-IQ2_XXS.gguf';
        const modelPath = FileSystem.documentDirectory + modelFileName;

        // Download if not already present
        const fileInfo = await FileSystem.getInfoAsync(modelPath);
        if (!fileInfo.exists) {
          await FileSystem.downloadAsync(modelUrl, modelPath);
        }

        const context = await initLlama({
          model: modelPath,
          use_mlock: true,
          n_ctx: 2048,
          n_gpu_layers: 99,
        });
        setLlamaContext(context);
        setLlamaReady(true);
      } catch (err) {
        setError('Failed to initialize Llama translation model');
      }
    };
    setupLlamaModel();
  }, []);

  const stopWords = ['</s>', '<|end|>', '<|eot_id|>', '<|end_of_text|>', '<|im_end|>', '<|EOT|>', '<|END_OF_TURN_TOKEN|>', '<|end_of_turn|>', '<|endoftext|>'];

  const translateText = async (
    text: string,
    fromLanguage: string,
    toLanguage: string
  ): Promise<string> => {
    setIsTranslating(true);
    try {
      if (!llamaContext) throw new Error('Llama model not initialized');
      const prompt = `Translate the following text from ${fromLanguage} to ${toLanguage}: "${text}"`;
      const result = await llamaContext.completion({
        prompt,
        n_predict: 100,
        stop: stopWords,
      });
      return result.text.trim();
    } catch (error) {
      setError('Translation failed');
      console.error('Translation error:', error);
      throw new Error('Translation failed');
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