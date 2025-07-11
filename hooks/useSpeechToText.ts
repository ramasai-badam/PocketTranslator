import { useState, useEffect } from 'react';
import Voice from '@react-native-voice/voice';

export function useSpeechToText() {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set up voice recognition event listeners
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechRecognized = onSpeechRecognized;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;

    return () => {
      // Clean up listeners
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const onSpeechStart = () => {
    setIsListening(true);
    setError(null);
  };

  const onSpeechRecognized = () => {
    // Speech has been recognized
  };

  const onSpeechEnd = () => {
    setIsListening(false);
  };

  const onSpeechError = (error: any) => {
    console.error('Speech recognition error:', error);
    setError(error.error?.message || 'Speech recognition failed');
    setIsListening(false);
  };

  const onSpeechResults = (event: any) => {
    const results = event.value;
    if (results && results.length > 0) {
      setRecognizedText(results[0]);
    }
  };

  const onSpeechPartialResults = (event: any) => {
    const partialResults = event.value;
    if (partialResults && partialResults.length > 0) {
      setRecognizedText(partialResults[0]);
    }
  };

  const startListening = async (language: string = 'en-US') => {
    try {
      setError(null);
      setRecognizedText('');
      
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
      
      await Voice.start(locale);
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      setError('Failed to start speech recognition');
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
    } catch (error) {
      console.error('Failed to stop voice recognition:', error);
      setError('Failed to stop speech recognition');
    }
  };

  const cancelListening = async () => {
    try {
      await Voice.cancel();
      setIsListening(false);
      setRecognizedText('');
    } catch (error) {
      console.error('Failed to cancel voice recognition:', error);
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