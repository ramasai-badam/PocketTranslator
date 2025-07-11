import { useState, useEffect } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export function useSpeechToText() {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Listen for speech recognition events
  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setError(null);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const results = event.results;
    if (results && results.length > 0) {
      // Get the most recent result
      const latestResult = results[results.length - 1];
      if (latestResult && latestResult.transcript) {
        setRecognizedText(latestResult.transcript);
      }
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.error('Speech recognition error:', event.error);
    setError(event.error?.message || 'Speech recognition failed');
    setIsListening(false);
  });

  const startListening = async (language: string = 'en-US') => {
    try {
      setError(null);
      setRecognizedText('');
      
      // Check if speech recognition is available
      const isAvailable = await ExpoSpeechRecognitionModule.getStateAsync();
      if (!isAvailable.available) {
        throw new Error('Speech recognition not available on this device');
      }

      // Request permissions
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        throw new Error('Speech recognition permission denied');
      }

      // Map language codes to proper locale formats
      const localeMap: Record<string, string> = {
        'en': 'en-US',
        'es': 'es-ES',
        'fr': 'fr-FR',
        'de': 'de-DE',
        'it': 'it-IT',
        'pt': 'pt-PT',
        'ru': 'ru-RU',
        'ja': 'ja-JP',
        'ko': 'ko-KR',
        'zh': 'zh-CN',
        'ar': 'ar-SA',
        'hi': 'hi-IN',
      };

      const locale = localeMap[language] || language;
      
      // Start speech recognition
      await ExpoSpeechRecognitionModule.start({
        lang: locale,
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
      });
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setError(error instanceof Error ? error.message : 'Failed to start speech recognition');
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
      setError('Failed to stop speech recognition');
    }
  };

  const cancelListening = async () => {
    try {
      await ExpoSpeechRecognitionModule.abort();
      setIsListening(false);
      setRecognizedText('');
    } catch (error) {
      console.error('Failed to cancel speech recognition:', error);
    }
  };

  return {
    isListening,
    recognizedText,
    error,
    startListening,
    stopListening,
    cancelListening,
  };
}