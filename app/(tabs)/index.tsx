import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Mic, Volume2, RotateCcw, Settings } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { router } from 'expo-router';
import LanguageSelector from '@/components/LanguageSelector';
import RecordingIndicator from '@/components/RecordingIndicator';
import TranslationDisplay from '@/components/TranslationDisplay';
import { useTranslation } from '@/hooks/useTranslation';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { TTSVoiceManager } from '@/utils/LanguagePackManager';
import { getLanguageDisplayName } from '@/utils/LanguageConfig';
import { TranslationHistoryManager } from '@/utils/TranslationHistory';

const { height, width } = Dimensions.get('window');

export default function TranslatorScreen() {
  const [topLanguage, setTopLanguage] = useState('en');
  const [bottomLanguage, setBottomLanguage] = useState('es');
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [isTopRecording, setIsTopRecording] = useState(false);
  const [isBottomRecording, setIsBottomRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const { translateText, isTranslating, streamingText } = useTranslation();
  const { startRecording, stopRecording, isRecording, isInitialized, error: audioError, cleanup } = useAudioRecording();
  const { transcribeWav, isTranscribing, error: whisperError } = useSpeechToText();
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [isStreamingToTop, setIsStreamingToTop] = useState(false);

  // Cleanup TTS on component unmount
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  // Save translation to history
  const saveToHistory = async (
    originalText: string,
    translatedText: string,
    fromLang: string,
    toLang: string,
    speaker: 'user1' | 'user2'
  ) => {
    try {
      await TranslationHistoryManager.saveTranslation(
        originalText,
        translatedText,
        fromLang,
        toLang,
        speaker
      );
      console.log('Translation saved to history successfully');
    } catch (error) {
      console.error('Failed to save translation to history:', error);
    }
  };

  // Helper function to get display text with streaming support
  const getDisplayText = (baseText: string, isStreamingTarget: boolean) => {
    if (isTranslating && isStreamingTarget && streamingText) {
      return streamingText;
    }
    return baseText;
  };

  // Models are ready when hooks are loaded (lazy loading)
  const modelsReady = true;

  const handleStartRecording = async (isTop: boolean) => {
    try {
      // Haptic feedback for mic press
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
      
      // Check if audio recording is initialized
      if (!isInitialized) {
        Alert.alert('Audio Error', 'Audio recording is not ready. Please try again.');
        return;
      }

      // Check if already recording
      if (isRecording) {
        Alert.alert('Recording Error', 'Already recording. Please stop the current recording first.');
        return;
      }

      // Check if models are ready
      if (!modelsReady) {
        Alert.alert('Models Loading', 'AI models are still loading. Please wait a moment.');
        return;
      }

      if (audioError) {
        Alert.alert('Audio Error', audioError);
        return;
      }

     console.log(`Starting recording for ${isTop ? 'TOP' : 'BOTTOM'} user`);
     
      if (isTop) {
        setIsTopRecording(true);
      } else {
        setIsBottomRecording(true);
      }
      
      await startRecording();
    } catch (error) {
     console.error('Recording start error:', error);
      Alert.alert('Recording Error', 'Failed to start recording');
      setIsTopRecording(false);
      setIsBottomRecording(false);
    }
  };

  const handleStopRecording = async (isTop: boolean) => {
   console.log(`Stopping recording for ${isTop ? 'TOP' : 'BOTTOM'} user`);
    setTranscriptionError(null);
    try {
      const audioUri = await stopRecording();
      if (audioUri) {
        const fromLang = isTop ? topLanguage : bottomLanguage;
        const toLang = isTop ? bottomLanguage : topLanguage;
        
        console.log('🎯 RECORDING COMPLETE:');
        console.log('  - Side pressed:', isTop ? 'TOP' : 'BOTTOM');
        console.log('  - From language (speech input):', fromLang);
        console.log('  - To language (translation target):', toLang);
        
        let speechText = '';
        let errorMsg = null;
        
        // Always try to transcribe - the transcribeWav function handles initialization
        try {
          console.log('🎯 CALLING TRANSCRIPTION with language:', fromLang);
          speechText = await transcribeWav(audioUri, fromLang) || '';
          if (!speechText) {
            errorMsg = 'Transcription failed or returned empty.';
            setTranscriptionError(errorMsg);
          }
        } catch (error) {
          errorMsg = 'Transcription error occurred.';
          setTranscriptionError(errorMsg);
          console.error('Transcription error:', error);
        }

        // 🚀 IMMEDIATELY show transcribed text on the speaking side
        if (isTop) {
          setTopText(errorMsg ? errorMsg : speechText);
          setBottomText(''); // Clear opposite side before translation
        } else {
          setBottomText(errorMsg ? errorMsg : speechText);
          setTopText(''); // Clear opposite side before translation
        }

        // Only proceed with translation if transcription was successful
        if (!errorMsg && speechText) {
          
          // Set streaming target (opposite side from speaking)
          setIsStreamingToTop(!isTop); // Translation goes to opposite side
          
          const translatedText = await translateText(speechText, fromLang, toLang);
          
          // Clear streaming state and show final translation
          setIsStreamingToTop(false);
          
          // Update the translation side with final result
          if (isTop) {
            setBottomText(translatedText);
            // Save to history: top side spoke (user1), translation goes to bottom
            await saveToHistory(speechText, translatedText, fromLang, toLang, 'user1');
          } else {
            setTopText(translatedText);
            // Save to history: bottom side spoke (user2), translation goes to top
            await saveToHistory(speechText, translatedText, fromLang, toLang, 'user2');
          }
        }
      }
    } catch (error) {
     console.error('Recording stop error:', error);
      setTranscriptionError('Failed to translate speech.');
      setIsStreamingToTop(false); // Clear streaming state on error
      if (isTop) {
        setTopText('Failed to translate speech.');
        setBottomText('');
      } else {
        setBottomText('Failed to translate speech.');
        setTopText('');
      }
      Alert.alert('Translation Error', 'Failed to translate speech');
    } finally {
     console.log(`Cleaning up recording state for ${isTop ? 'TOP' : 'BOTTOM'} user`);
      setIsTopRecording(false);
      setIsBottomRecording(false);
    }
  };

  const handleSpeak = async (text: string, language: string) => {
    if (!text || isSpeaking) return;
    
    // Haptic feedback for speaker press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    
    try {
      // Check if TTS voice is available for this language
      const isVoiceAvailable = await TTSVoiceManager.canSpeakLanguage(language);
      
      if (!isVoiceAvailable) {
        const languageName = getLanguageDisplayName(language);
        Alert.alert(
          'TTS Voice Not Available',
          `Text-to-speech voice for ${languageName} is not available. Would you like to enable it?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Enable',
              onPress: () => router.push('/settings')
            }
          ]
        );
        return;
      }

      // Stop any current speech and start new one
      await Speech.stop();
      setIsSpeaking(true);

      Speech.speak(text, {
        language: language,
        pitch: 1.0,
        rate: 0.8,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (error) {
      console.error('Failed to speak text:', error);
      setIsSpeaking(false);
      
      // Fallback to speaking without language check
      try {
        await Speech.stop();
        setIsSpeaking(true);
        
        Speech.speak(text, {
          language: language,
          pitch: 1.0,
          rate: 0.8,
          onDone: () => setIsSpeaking(false),
          onStopped: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
        });
      } catch (fallbackError) {
        console.error('Fallback TTS also failed:', fallbackError);
        setIsSpeaking(false);
      }
    }
  };

  const swapLanguages = () => {
    setTopLanguage(bottomLanguage);
    setBottomLanguage(topLanguage);
    setTopText(bottomText);
    setBottomText(topText);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header with Settings Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => {
            requestAnimationFrame(() => {
              router.push('/history');
            });
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.historyButtonText}>📚</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => {
            requestAnimationFrame(() => {
              router.push('/settings');
            });
          }}
          activeOpacity={0.7}
        >
          <Settings size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
      
      {/* Model Status Indicator */}
      {!modelsReady && (
        <View style={styles.modelStatusContainer}>
          <Text style={styles.modelStatusText}>
            {isTranslating || isTranscribing ? 'Loading AI models...' : 'AI models not ready'}
          </Text>
        </View>
      )}
      
      {/* Top Section (Rotated 180 degrees) */}
      <View style={[styles.section, styles.topSection]}>
        <View style={styles.rotatedContent}>
          <LanguageSelector
            selectedLanguage={topLanguage}
            onLanguageChange={setTopLanguage}
            isRotated={true}
          />
          <TranslationDisplay
            text={getDisplayText(topText, isStreamingToTop)}
            isRotated={true}
            language={topLanguage}
            onSpeak={handleSpeak}
            isSpeaking={isSpeaking}
          />
          <View style={styles.controls}>
            <TouchableOpacity
              style={[
                styles.micButton, 
                isTopRecording && styles.recordingButton,
                (!modelsReady || isRecording || isBottomRecording) && styles.disabledButton
              ]}
              onPressIn={() => handleStartRecording(true)}
              onPressOut={() => handleStopRecording(true)}
              disabled={!modelsReady || isRecording || isBottomRecording}
            >
              <Mic size={32} color={(modelsReady && !isRecording && !isBottomRecording) ? "white" : "#666"} />
              {isTopRecording && <RecordingIndicator />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {/* Center Divider with Swap Button */}
      <View style={styles.divider}>
        <TouchableOpacity style={styles.swapButton} onPress={swapLanguages}>
          <RotateCcw size={24} color="white" />
        </TouchableOpacity>
      </View>
      {/* Bottom Section */}
      <View style={[styles.section, styles.bottomSection]}>
        <LanguageSelector
          selectedLanguage={bottomLanguage}
          onLanguageChange={setBottomLanguage}
          isRotated={false}
        />
        <TranslationDisplay
          text={getDisplayText(bottomText, !isStreamingToTop)}
          isRotated={false}
          language={bottomLanguage}
          onSpeak={handleSpeak}
          isSpeaking={isSpeaking}
        />
        <View style={styles.controls}>
          <TouchableOpacity
            style={[
              styles.micButton, 
              isBottomRecording && styles.recordingButton,
              (!modelsReady || isRecording || isTopRecording) && styles.disabledButton
            ]}
            onPressIn={() => handleStartRecording(false)}
            onPressOut={() => handleStopRecording(false)}
            disabled={!modelsReady || isRecording || isTopRecording}
          >
            <Mic size={32} color={(modelsReady && !isRecording && !isTopRecording) ? "white" : "#666"} />
            {isBottomRecording && <RecordingIndicator />}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    pointerEvents: 'box-none', // Allow touch events to pass through to children
  },
  historyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    pointerEvents: 'auto', // Ensure button itself is touchable
  },
  historyButtonText: {
    fontSize: 20,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    pointerEvents: 'auto', // Ensure button itself is touchable
  },
  modelStatusContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    pointerEvents: 'none', // Allow touch events to pass through
  },
  modelStatusText: {
    color: '#fbbf24',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    paddingTop: 40, // Add more top padding to avoid header overlap
  },
  topSection: {
    backgroundColor: '#101010',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingTop: 60, // Extra padding for the rotated top section
  },
  bottomSection: {
    backgroundColor: '#101010',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  rotatedContent: {
    flex: 1,
    transform: [{ rotate: '180deg' }],
    justifyContent: 'space-between',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
  },
  recordingButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderColor: 'white',
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  divider: {
    height: 60,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swapButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});