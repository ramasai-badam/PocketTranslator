import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Volume2 } from 'lucide-react-native';
import { useTextSize } from '../contexts/TextSizeContext';
import { useTheme } from '../contexts/ThemeContext';

interface ConversationMessage {
  id: string;
  text: string;
  timestamp: Date;
  type: 'transcription' | 'translation';
  language?: string;
}

interface TranslationDisplayProps {
  text: string;
  isRotated?: boolean;
  language?: string;
  onSpeak?: (text: string, language: string) => void;
  isSpeaking?: boolean;
  conversationHistory?: ConversationMessage[];
}

export default function TranslationDisplay({
  text,
  isRotated = false,
  language,
  onSpeak,
  isSpeaking = false,
  conversationHistory = [],
}: TranslationDisplayProps) {
  const { getTextSizeConfig } = useTextSize();
  const textSizeConfig = getTextSizeConfig();
  const { colors } = useTheme();
  
  const hasText = text && text !== 'Tap and hold the microphone to start speaking...';
  
  const handleSpeak = (textToSpeak: string, lang?: string) => {
    if (textToSpeak && onSpeak && (lang || language) && !isSpeaking) {
      onSpeak(textToSpeak, lang || language!);
    }
  };

  const renderMessage = (message: ConversationMessage, index: number) => (
    <View key={message.id} style={[styles.messageContent, { marginBottom: index === conversationHistory.length - 1 ? 0 : 8 }]}>
      <Text style={[
        styles.messageText, 
        isRotated && styles.rotatedText,
        { 
          fontSize: textSizeConfig.fontSize, 
          lineHeight: textSizeConfig.lineHeight,
          color: colors.textSecondary,
        }
      ]}>
        {message.text}
      </Text>
      {message.language && onSpeak && (
        <TouchableOpacity 
          style={[
            styles.messageSpeakerButton,
            { 
              width: Math.max(24, textSizeConfig.fontSize * 1.2),
              height: Math.max(24, textSizeConfig.fontSize * 1.2),
              borderRadius: Math.max(12, textSizeConfig.fontSize * 0.6),
              backgroundColor: colors.button,
              borderColor: colors.buttonBorder,
            }
          ]} 
          onPress={() => handleSpeak(message.text, message.language)}
          disabled={isSpeaking}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Speak this message"
          accessibilityHint={`Tap to hear this ${message.type} spoken aloud`}
          accessibilityState={{ disabled: isSpeaking }}
        >
          <Volume2 
            size={Math.max(12, textSizeConfig.fontSize * 0.7)} 
            color={isSpeaking ? colors.disabled : colors.buttonText} 
          />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScrollView 
      style={[
        styles.container,
        {
          backgroundColor: colors.translationBackground,
        }
      ]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={true}
    >
      {/* Conversation History - exclude the latest message if we have current text */}
      {conversationHistory
        .slice(0, hasText ? -1 : conversationHistory.length)
        .map((message, index) => renderMessage(message, index))}
      
      {/* Current/Streaming Text - only show if we have current text */}
      {hasText && (
        <View style={[
          styles.currentMessageContainer, 
          conversationHistory.length > 0 && styles.currentMessageWithHistory,
          {
            backgroundColor: colors.currentMessageBackground,
            borderColor: colors.translationBorder,
          }
        ]}>
          <View style={styles.textContainer}>
            <Text style={[
              styles.currentText, 
              isRotated && styles.rotatedText,
              { 
                fontSize: textSizeConfig.fontSize + 2, 
                lineHeight: textSizeConfig.lineHeight + 4,
                color: colors.text,
              }
            ]}>
              {text}
            </Text>
            {onSpeak && language && (
              <TouchableOpacity 
                style={[
                  styles.speakerButton,
                  { 
                    width: Math.max(28, textSizeConfig.fontSize * 1.4),
                    height: Math.max(28, textSizeConfig.fontSize * 1.4),
                    borderRadius: Math.max(14, textSizeConfig.fontSize * 0.7),
                    backgroundColor: colors.button,
                    borderColor: colors.buttonBorder,
                  }
                ]} 
                onPress={() => handleSpeak(text)}
                disabled={isSpeaking}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Speak current text"
                accessibilityHint="Tap to hear the current translation spoken aloud"
                accessibilityState={{ disabled: isSpeaking }}
              >
                <Volume2 
                  size={Math.max(14, textSizeConfig.fontSize * 0.8)} 
                  color={isSpeaking ? colors.disabled : colors.buttonText} 
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      
      {/* Placeholder when no content */}
      {!hasText && conversationHistory.length === 0 && (
        <View style={styles.placeholderContainer}>
          <Text style={[
            styles.placeholderText, 
            isRotated && styles.rotatedText,
            { 
              fontSize: textSizeConfig.fontSize, 
              lineHeight: textSizeConfig.lineHeight,
              color: colors.placeholderText,
            }
          ]}>
            Tap and hold the microphone to start speaking...
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    padding: 8,
    marginVertical: 10,
    minHeight: 100,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 5,
    paddingBottom: 5,
  },
  // Message styles for conversation history
  messageContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 4,
  },
  messageText: {
    flexShrink: 1,
  },
  messageSpeakerButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  messageType: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontStyle: 'italic',
  },
  // Current message styles
  currentMessageContainer: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
  },
  currentMessageWithHistory: {
    marginTop: 8,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  currentText: {
    textAlign: 'left',
    flexShrink: 1,
    fontWeight: '500',
  },
  // Legacy text style (keeping for compatibility)
  text: {
    textAlign: 'left',
    flexShrink: 1,
  },
  rotatedText: {
    // Text is already rotated by parent container
  },
  speakerButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  // Placeholder styles
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 80,
  },
  placeholderText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
});