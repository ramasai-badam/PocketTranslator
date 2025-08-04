import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Volume2 } from 'lucide-react-native';
import { useTextSize } from '../contexts/TextSizeContext';

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
        { fontSize: textSizeConfig.fontSize, lineHeight: textSizeConfig.lineHeight }
      ]}>
        {message.text}
      </Text>
      {message.language && onSpeak && (
        <TouchableOpacity 
          style={styles.messageSpeakerButton} 
          onPress={() => handleSpeak(message.text, message.language)}
          disabled={isSpeaking}
        >
          <Volume2 
            size={14} 
            color={isSpeaking ? "#666" : "#fff"} 
          />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={true}
    >
      {/* Conversation History - exclude the latest message if we have current text */}
      {conversationHistory
        .slice(0, hasText ? -1 : conversationHistory.length)
        .map((message, index) => renderMessage(message, index))}
      
      {/* Current/Streaming Text - only show if we have current text */}
      {hasText && (
        <View style={[styles.currentMessageContainer, conversationHistory.length > 0 && styles.currentMessageWithHistory]}>
          <View style={styles.textContainer}>
            <Text style={[
              styles.currentText, 
              isRotated && styles.rotatedText,
              { fontSize: textSizeConfig.fontSize + 2, lineHeight: textSizeConfig.lineHeight + 4 } // Slightly larger for current text
            ]}>
              {text}
            </Text>
            {onSpeak && language && (
              <TouchableOpacity 
                style={styles.speakerButton} 
                onPress={() => handleSpeak(text)}
                disabled={isSpeaking}
              >
                <Volume2 
                  size={16} 
                  color={isSpeaking ? "#666" : "#fff"} 
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      
      {/* Placeholder when no content */}
      {!hasText && conversationHistory.length === 0 && (
        <View style={styles.placeholderContainer}>
          <Text style={[styles.placeholderText, isRotated && styles.rotatedText]}>
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    lineHeight: 22,
    flexShrink: 1,
  },
  messageSpeakerButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  messageType: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontStyle: 'italic',
  },
  // Current message styles
  currentMessageContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    color: 'white',
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'left',
    flexShrink: 1,
    fontWeight: '500',
  },
  // Legacy text style (keeping for compatibility)
  text: {
    color: 'white',
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'left',
    flexShrink: 1,
  },
  rotatedText: {
    // Text is already rotated by parent container
  },
  speakerButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  // Placeholder styles
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 80,
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});