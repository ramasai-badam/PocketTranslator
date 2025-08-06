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
import { Mic, MicOff, Square, Settings } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
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
import { useTextSize } from '@/contexts/TextSizeContext';
import { useTheme } from '@/contexts/ThemeContext';

// Conversation message interface
interface ConversationMessage {
  id: string;
  text: string;
  timestamp: Date;
  type: 'transcription' | 'translation';
  language?: string;
}

const { height, width } = Dimensions.get('window');

export default function TranslatorScreen() {
  const [topLanguage, setTopLanguage] = useState('en');
  const [bottomLanguage, setBottomLanguage] = useState('es');
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [isTopRecording, setIsTopRecording] = useState(false);
  const [isBottomRecording, setIsBottomRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recordingInitiatedByTop, setRecordingInitiatedByTop] = useState<boolean | null>(null);
  
  // Conversation history for each side
  const [topConversationHistory, setTopConversationHistory] = useState<ConversationMessage[]>([]);
  const [bottomConversationHistory, setBottomConversationHistory] = useState<ConversationMessage[]>([]);

  const { translateText, isTranslating, streamingText } = useTranslation();
  const { startRecording, stopRecording, isRecording, isInitialized, error: audioError, cleanup } = useAudioRecording();
  const { transcribeWav, isTranscribing, error: whisperError } = useSpeechToText();
  const { refreshTextSize, getTextSizeConfig } = useTextSize();
  const textSizeConfig = getTextSizeConfig();
  const { colors } = useTheme();
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [isStreamingToTop, setIsStreamingToTop] = useState(false);

  // Refresh text size when screen comes into focus (e.g., returning from settings)
  useFocusEffect(
    React.useCallback(() => {
      refreshTextSize();
    }, [refreshTextSize])
  );

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

  // Helper function to add message to conversation history
  const addToConversationHistory = (
    isTop: boolean,
    text: string,
    type: 'transcription' | 'translation',
    language?: string
  ) => {
    const message: ConversationMessage = {
      id: `${Date.now()}-${Math.random()}`,
      text,
      timestamp: new Date(),
      type,
      language,
    };

    if (isTop) {
      setTopConversationHistory(prev => [...prev, message]);
    } else {
      setBottomConversationHistory(prev => [...prev, message]);
    }
  };

  // Helper function to get display text with streaming support
  const getDisplayText = (baseText: string, isStreamingTarget: boolean) => {
    if (isTranslating && isStreamingTarget && streamingText) {
      return streamingText;
    }
    return baseText;
  };

  const swapLanguages = () => {
    setTopLanguage(bottomLanguage);
    setBottomLanguage(topLanguage);
    setTopText(bottomText);
    setBottomText(topText);
    // Also swap conversation histories
    const tempHistory = topConversationHistory;
    setTopConversationHistory(bottomConversationHistory);
    setBottomConversationHistory(tempHistory);
  };

  // Models are ready when hooks are loaded (lazy loading)
  const modelsReady = true;

  const handleMicPress = async (isTop: boolean) => {
    try {
      // Haptic feedback for mic press
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
      
      // If currently recording on this side, stop recording
      if ((isTop && isTopRecording) || (!isTop && isBottomRecording)) {
        await handleStopRecording(isTop);
        return;
      }
      
      // Check if audio recording is initialized
      if (!isInitialized) {
        Alert.alert('Audio Error', 'Audio recording is not ready. Please try again.');
        return;
      }

      // Check if already recording on the other side
      if (isRecording) {
        Alert.alert('Recording Error', 'Already recording on the other side. Please stop that recording first.');
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
     
      // Track which side initiated the recording
      setRecordingInitiatedByTop(isTop);
     
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

        // Add transcription to conversation history
        if (!errorMsg && speechText) {
          addToConversationHistory(isTop, speechText, 'transcription', fromLang);
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
            // Add translation to conversation history (opposite side)
            addToConversationHistory(false, translatedText, 'translation', toLang);
            // Save to history: top side spoke (user1), translation goes to bottom
            await saveToHistory(speechText, translatedText, fromLang, toLang, 'user1');
          } else {
            setTopText(translatedText);
            // Add translation to conversation history (opposite side)
            addToConversationHistory(true, translatedText, 'translation', toLang);
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
      setRecordingInitiatedByTop(null); // Clear the initiator
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      
      {/* Header with Settings Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.historyButton,
            {
              width: Math.max(44, textSizeConfig.fontSize * 3.0),
              height: Math.max(44, textSizeConfig.fontSize * 3.0),
              borderRadius: Math.max(22, textSizeConfig.fontSize * 1.5),
              backgroundColor: colors.headerButton,
              borderColor: colors.headerButtonBorder,
            }
          ]}
          onPress={() => {
            requestAnimationFrame(() => {
              router.push('/history');
            });
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.historyButtonText, { fontSize: Math.max(18, textSizeConfig.fontSize * 1.4) }]}>📚</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.settingsButton,
            {
              width: Math.max(44, textSizeConfig.fontSize * 3.0),
              height: Math.max(44, textSizeConfig.fontSize * 3.0),
              borderRadius: Math.max(22, textSizeConfig.fontSize * 1.5),
              backgroundColor: colors.headerButton,
              borderColor: colors.headerButtonBorder,
            }
          ]}
          onPress={() => {
            requestAnimationFrame(() => {
              router.push('/settings');
            });
          }}
          activeOpacity={0.7}
        >
          <Settings size={Math.max(20, textSizeConfig.fontSize * 1.4)} color={colors.buttonText} />
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
      <View style={[styles.section, styles.topSection, { backgroundColor: colors.surface }]}>
        <View style={styles.rotatedContent}>
          <View style={styles.topLanguageSelectorContainer}>
            <LanguageSelector
              selectedLanguage={topLanguage}
              onLanguageChange={setTopLanguage}
              isRotated={true}
            />
          </View>
          <View style={styles.flexibleSpacer} />
          <TranslationDisplay
            text={getDisplayText(topText, isStreamingToTop)}
            isRotated={true}
            language={topLanguage}
            onSpeak={handleSpeak}
            isSpeaking={isSpeaking}
            conversationHistory={topConversationHistory}
          />
          <View style={styles.controls}>
            <TouchableOpacity
              style={[
                styles.micButton, 
                isTopRecording && styles.recordingButton,
                (recordingInitiatedByTop === true && (isTranscribing || isTranslating)) && styles.processingButton,
                (!modelsReady || (isRecording && !isTopRecording)) && styles.disabledButton
              ]}
              onPress={() => handleMicPress(true)}
              disabled={!modelsReady || (isRecording && !isTopRecording) || (recordingInitiatedByTop === true && (isTranscribing || isTranslating))}
            >
              {isTopRecording ? (
                <Square size={Math.max(24, textSizeConfig.fontSize * 1.4)} color={colors.buttonText} />
              ) : (recordingInitiatedByTop === true && (isTranscribing || isTranslating)) ? (
                <>
                  <Mic size={Math.max(28, textSizeConfig.fontSize * 1.6)} color={colors.disabled} />
                  <RecordingIndicator />
                </>
              ) : (
                <Mic size={Math.max(28, textSizeConfig.fontSize * 1.6)} color={(modelsReady && !isRecording) ? colors.buttonText : colors.disabled} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {/* Bottom Section */}
      <View style={[styles.section, styles.bottomSection, { backgroundColor: colors.surface }]}>
        <View style={styles.bottomLanguageSelectorContainer}>
          <LanguageSelector
            selectedLanguage={bottomLanguage}
            onLanguageChange={setBottomLanguage}
            isRotated={false}
          />
        </View>
        <View style={styles.flexibleSpacer} />
        <TranslationDisplay
          text={getDisplayText(bottomText, !isStreamingToTop)}
          isRotated={false}
          language={bottomLanguage}
          onSpeak={handleSpeak}
          isSpeaking={isSpeaking}
          conversationHistory={bottomConversationHistory}
        />
        <View style={styles.controls}>
          <TouchableOpacity
            style={[
              styles.micButton, 
              isBottomRecording && styles.recordingButton,
              (recordingInitiatedByTop === false && (isTranscribing || isTranslating)) && styles.processingButton,
              (!modelsReady || (isRecording && !isBottomRecording)) && styles.disabledButton
            ]}
            onPress={() => handleMicPress(false)}
            disabled={!modelsReady || (isRecording && !isBottomRecording) || (recordingInitiatedByTop === false && (isTranscribing || isTranslating))}
          >
            {isBottomRecording ? (
              <Square size={Math.max(24, textSizeConfig.fontSize * 1.4)} color={colors.buttonText} />
            ) : (recordingInitiatedByTop === false && (isTranscribing || isTranslating)) ? (
              <>
                <Mic size={Math.max(28, textSizeConfig.fontSize * 1.6)} color={colors.disabled} />
                <RecordingIndicator />
              </>
            ) : (
              <Mic size={Math.max(28, textSizeConfig.fontSize * 1.6)} color={(modelsReady && !isRecording) ? colors.buttonText : colors.disabled} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'visible',
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    pointerEvents: 'auto', // Ensure button itself is touchable
  },
  historyButtonText: {
    // fontSize will be set dynamically
  },
  settingsButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
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
    padding: 5,
    justifyContent: 'space-between',
    paddingTop: 40, // Add more top padding to avoid header overlap
    overflow: 'visible',
  },
  topSection: {
    flex: 1.1,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingTop: 50, // Extra padding for the rotated top section
    paddingBottom: 3, // Add bottom padding to balance
    overflow: 'visible',
  },
  bottomSection: {
    flex: 1.05,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 3, // Add top padding to balance
    overflow: 'visible',
  },
  rotatedContent: {
    flex: 1,
    transform: [{ rotate: '180deg' }],
    justifyContent: 'space-between',
    overflow: 'visible',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: -25, // Overlap with translation display
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    position: 'absolute',
    bottom: -4,
  },
  recordingButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  processingButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: 'rgba(255, 215, 0, 0.8)',
  },
  disabledButton: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  topLanguageSelectorContainer: {
    marginBottom: 10,
    alignSelf: 'flex-end',
    width: '100%',
    overflow: 'visible',
  },
  bottomLanguageSelectorContainer: {
    marginBottom: 10,
    alignSelf: 'flex-start',
    width: '100%',
    overflow: 'visible',
  },
  flexibleSpacer: {
    flex: 0,
  },
});