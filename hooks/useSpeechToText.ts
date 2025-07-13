import { useState, useRef, useEffect } from 'react';
import { WhisperContext } from 'whisper.rn';
import { ModelManager } from '@/utils/ModelManager';

// Safety flag to disable loading if needed
const ENABLE_WHISPER_LOADING = true;

export function useSpeechToText() {
  const [isInitialized, setIsInitialized] = useState(ModelManager.isWhisperReady());
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen to ModelManager state changes
  useEffect(() => {
    const unsubscribe = ModelManager.addListener(() => {
      setIsInitialized(ModelManager.isWhisperReady());
    });
    return unsubscribe;
  }, []);

  const initializeModel = async () => {
    if (ModelManager.isWhisperReady()) {
      console.log('Whisper already initialized');
      return;
    }

    try {
      console.log('Whisper not initialized, initializing now...');
      await ModelManager.initializeWhisper();
      console.log('Whisper initialized successfully');
    } catch (err) {
      console.error('Failed to initialize Whisper:', err);
      setError('Failed to initialize speech recognition');
      throw err;
    }
  };

  // Accepts a WAV file path and transcribes it
  const transcribeWav = async (wavFilePath: string, language: string = 'en'): Promise<string | null> => {
    console.log('transcribeWav called:', { wavFilePath, language });
    console.log('🎯 SPEECH-TO-TEXT: Using language code:', language);

    if (!wavFilePath) {
      console.error('No audio path provided');
      return null;
    }

    if (!ENABLE_WHISPER_LOADING) {
      console.log('Whisper loading disabled for safety');
      return '[Transcription disabled]';
    }

    if (!ModelManager.isWhisperReady()) {
      console.log('Whisper not initialized, initializing now...');
      try {
        await initializeModel();
      } catch (initError) {
        console.error('Initialization failed in transcribeWav:', initError);
        return null;
      }
    }

    if (!ModelManager.isWhisperReady()) {
      console.error('Whisper initialization failed');
      return null;
    }

    setIsTranscribing(true);
    try {
      console.log('Starting transcription with language:', language);
      const options = { language };
      console.log('Whisper transcription options:', options);
      const whisperContext = ModelManager.getWhisperContext();
      const { stop, promise } = whisperContext.transcribe(wavFilePath, options);
      const { result } = await promise;
      
      console.log('Transcription result:', result);
      console.log('🎯 TRANSCRIPTION SUCCESS for language:', language, '→', result);
      setIsTranscribing(false);
      return result;
    } catch (err) {
      console.error('Transcription failed:', err);
      setError('Transcription failed');
      setIsTranscribing(false);
      return null;
    }
  };

  const cleanup = () => {
    // No cleanup needed as ModelManager handles the context
    console.log('Speech-to-text hook cleanup called');
  };

  return {
    isTranscribing,
    isInitialized,
    error,
    transcribeWav,
    cleanup,
  };
}