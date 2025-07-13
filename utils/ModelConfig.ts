import * as FileSystem from 'expo-file-system';

// Centralized model configuration
export const MODEL_CONFIG = {
  whisper: {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin', // Multilingual version - much faster
    path: `${FileSystem.documentDirectory}whisper-base.bin`,
    size: 39 * 1024 * 1024, // ~148MB for base model (much faster)
    displayName: 'Speech Recognition (Whisper)'
  },
  llama: {
    url: 'https://huggingface.co/bartowski/google_gemma-3n-E2B-it-GGUF/resolve/main/google_gemma-3n-E2B-it-IQ4_XS.gguf',
    path: `${FileSystem.documentDirectory}gemma-3n-E2B-IQ4_XS.bin`,
    size: 2800 * 1024 * 1024, // ~2800MB
    displayName: 'Translation (Gemma 3n)'
  }
};

// Helper functions for easy access
export const getModelPath = (modelName: 'whisper' | 'llama') => MODEL_CONFIG[modelName].path;
export const getModelUrl = (modelName: 'whisper' | 'llama') => MODEL_CONFIG[modelName].url;
export const getModelSize = (modelName: 'whisper' | 'llama') => MODEL_CONFIG[modelName].size;
export const getModelDisplayName = (modelName: 'whisper' | 'llama') => MODEL_CONFIG[modelName].displayName;
